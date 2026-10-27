// Bot người chơi cho mô phỏng headless (GDD 09 §3): an phận, liều lĩnh, tham vọng, ngẫu nhiên, "tối ưu" (để phát hiện lối mòn)
import type { HudView } from '@core/api/queries';
import type { Command } from '@core/api/commands';
import { Rng } from '@core/engine/Rng';

export interface Bot {
  name: string;
  /** Quyết định đầu năm: Focus, mức sống, mua bán. */
  yearly(view: HudView): Command[];
  /** Mỗi tháng (mua bán theo thời cơ). */
  monthly(view: HudView): Command[];
  choose(view: HudView): string;
}

const mid = (o: NonNullable<HudView['pending']>['options'][number]) => (o.chance ? (o.chance.shown[0] + o.chance.shown[1]) / 2 : undefined);

/** Chọn trọng tâm nếu nó có trong bộ lựa chọn của giai đoạn hiện tại; không có thì để mô phỏng tự chọn. */
function focusCmd(view: HudView, focusId: string): Command[] {
  if (!view.focus.canChoose || view.focus.primary === focusId) return [];
  return view.focus.options.some((o) => o.id === focusId) ? [{ type: 'setFocus', focusId }] : [];
}

/** Giữ đủ thóc ăn N tháng, bán phần dư khi giá cao. */
function reserveTrading(view: HudView, keepMonths: number, sellAbovePrice: number): Command[] {
  const h = view.household;
  const surplus = h.food - h.monthlyFood * keepMonths;
  if (surplus > view.market.tradeAmounts[0] && view.market.sellPrice >= sellAbovePrice) {
    const amount = [...view.market.tradeAmounts].reverse().find((a) => a <= surplus) ?? 0;
    if (amount > 0) return [{ type: 'sellFood', amount }];
  }
  if (h.foodMonths < 1.5 && h.money > view.market.buyPrice * view.market.tradeAmounts[0]) {
    return [{ type: 'buyFood', amount: view.market.tradeAmounts[0] }];
  }
  return [];
}

/** Focus "làm ăn" hợp với nghề nhà: nhà nông cày ruộng, nhà buôn buôn bán, nhà nho học hành. */
function workFocus(view: HudView): string {
  if (view.household.selfFarm) return 'lam_an';
  return view.career.components.includes('exam_ladder') ? 'hoc_tap' : 'kinh_doanh';
}

/** Chạy chữa người ốm khi là chủ hộ: chỉ các mức bệnh đã chọn, và còn giữ lại ít nhất `reserve` quan. */
function treatCmds(view: HudView, severities: string[], reserve: number): Command[] {
  let money = view.household.money;
  const cmds: Command[] = [];
  for (const s of view.household.sick) {
    if (s.block !== null || !severities.includes(s.severity) || money - s.cost < reserve) continue;
    money -= s.cost;
    cmds.push({ type: 'treatDisease', characterId: s.characterId, diseaseId: s.diseaseId });
  }
  return cmds;
}

/** Làm hành động nghề đầu tiên đang khả dụng (đủ tuổi, hết hồi, đủ vốn dự phòng). */
function careerActions(view: HudView, reserveMoney = 0): Command[] {
  const act = view.career.actions.find(
    (a) => a.available && (a.costMoney === 0 || view.household.money - a.costMoney >= reserveMoney),
  );
  return act ? [{ type: 'doCareerAction', actionId: act.id }] : [];
}

/** Chọn nghề tay trái đầu tiên khả dụng khi đang rảnh mùa nông nhàn. */
function sideJobCmd(view: HudView): Command[] {
  if (view.career.sideJob.currentId) return [];
  const avail = view.career.sideJob.options.find((o) => o.available);
  return avail ? [{ type: 'setSideJob', sideJobId: avail.id }] : [];
}

/** Gả cưới cho bản thân hoặc con cái đã đến tuổi thông qua Chợ hôn nhân làng xã. */
function matchmakingCmd(view: HudView, preferHighTier: boolean, reserveMoney: number): Command[] {
  if (!view.manage.isHead) return [];
  for (const m of view.matchmaking.targets) {
    if (m.age < 18) continue;
    const list = m.candidates.filter((c) => c.clanAccepts && !c.blockReason);
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => {
      if (preferHighTier) {
        const tierScore = (t: string) => (t === 'ket_thong_gia_cao' ? 3 : t === 'mon_dang_ho_doi' ? 2 : 1);
        return tierScore(b.matchTier) - tierScore(a.matchTier);
      }
      const equalScore = (t: string) => (t === 'mon_dang_ho_doi' ? 3 : t === 'ket_thong_gia_cao' ? 2 : 1);
      return equalScore(b.matchTier) - equalScore(a.matchTier);
    });
    const pick = sorted.find((c) => view.household.money - c.bridePrice + c.dowry >= reserveMoney);
    if (pick) {
      return [{ type: 'arrangeMarriage', targetCharId: m.characterId, candidateId: pick.characterId }];
    }
  }
  return [];
}

/** Đặt hướng nuôi dạy cho con cái 6–15 tuổi trong nhà khi đủ ngân quỹ. */
function upbringingCmds(view: HudView, preferred: 'di_hoc' | 'hoc_nghe' | 'phu_viec_nha'): Command[] {
  if (!view.manage.isHead || view.household.money < 8) return [];
  const cmds: Command[] = [];
  for (const m of view.household.members) {
    if (!m.canSetUpbringing || m.upbringing === preferred) continue;
    cmds.push({ type: 'setChildUpbringing', childId: m.id, upbringing: preferred });
  }
  return cmds;
}

/** Mở hoặc mở rộng Cơ nghiệp kinh doanh và nâng cấp nhà ở khi dư dả. */
function ventureAndHouseCmds(view: HudView, reserveMoney: number): Command[] {
  if (!view.manage.isHead || view.household.debt > 0) return [];
  // Ưu tiên mở rộng cơ nghiệp đang ăn nên làm ra
  const expandable = view.ventures.owned.find(
    (v) => v.canExpand && v.expandCost !== null && view.household.money - v.expandCost >= reserveMoney,
  );
  if (expandable) {
    return [{ type: 'expandVenture', ventureId: expandable.id }];
  }
  // Hoặc mở cơ nghiệp mới
  if (view.ventures.owned.length < 2) {
    const openable = view.ventures.openable.find(
      (v) => v.canOpen && v.canAfford && view.household.money - v.capitalCost >= reserveMoney,
    );
    if (openable) {
      return [{ type: 'openVenture', ventureId: openable.id }];
    }
  }
  // Nâng cấp nhà ở nếu dư nhiều tiền
  if (view.houseUpgrade && view.houseUpgrade.canAfford && view.household.money - view.houseUpgrade.cost >= reserveMoney + 10) {
    return [{ type: 'upgradeHouse' }];
  }
  return [];
}

export function makeBot(name: string, seed: string): Bot {
  const rng = Rng.fromSeed(`bot:${name}:${seed}`);
  switch (name) {
    case 'an_phan':
      return {
        name,
        yearly: (v) => {
          const h = v.household;
          const cmds: Command[] = [
            ...focusCmd(v, v.player.health < 50 ? 'suc_khoe' : workFocus(v)),
            { type: 'setLivingStandard', id: 'dam_bac' },
          ];
          // Người cẩn trọng có dư là trả nợ ngay
          if (h.debt > 0 && h.money > 5) cmds.push({ type: 'repayDebt', amount: Math.min(h.debt, h.money - 3) });
          cmds.push(...matchmakingCmd(v, false, 4));
          return cmds;
        },
        monthly: (v) => treatCmds(v, ['nang', 'nguy_kich'], 2),
        choose: (v) => {
          const opts = v.pending!.options;
          return ([...opts].reverse().find((o) => !o.chance) ?? opts[opts.length - 1]).id;
        },
      };
    case 'lieu_linh':
      return {
        name,
        yearly: (v) => {
          const cmds: Command[] = [
            ...focusCmd(v, 'kinh_doanh'),
            { type: 'setLivingStandard', id: v.household.money > 5 ? 'du_day' : 'dam_bac' },
            ...sideJobCmd(v),
            ...upbringingCmds(v, 'hoc_nghe'),
            ...ventureAndHouseCmds(v, 3),
          ];
          // Người liều lĩnh sẵn sàng chuyển nghề theo lối ra hoặc sang nghề mạo hiểm
          if (rng.chance(0.22)) {
            const exits = v.career.availableCareers.filter((c) => c.available && (c.isExit || c.id === 'linh' || c.id === 'thuong_nhan'));
            if (exits.length > 0) cmds.push({ type: 'joinCareer', careerId: rng.pick(exits).id });
          }
          return cmds;
        },
        monthly: (v) => [...treatCmds(v, ['nguy_kich'], 0), ...reserveTrading(v, 1, 0), ...careerActions(v)],
        choose: (v) => {
          const opts = v.pending!.options;
          const risky = opts.filter((o) => o.chance).sort((a, b) => (mid(b) ?? 0) - (mid(a) ?? 0))[0];
          return (risky ?? opts[0]).id;
        },
      };
    case 'tham_vong':
      return {
        name,
        yearly: (v) => {
          const cmds: Command[] = [
            ...focusCmd(v, v.player.age < 20 ? 'hoc_tap' : workFocus(v) === 'lam_an' ? 'kinh_doanh' : workFocus(v)),
          ];
          cmds.push({ type: 'setLivingStandard', id: v.household.money > 15 ? 'du_day' : 'dam_bac' });
          if (v.household.money > 25) cmds.push({ type: 'buyProperty', id: 'ruong' });
          cmds.push(...upbringingCmds(v, 'di_hoc'));
          cmds.push(...matchmakingCmd(v, true, 6));
          cmds.push(...ventureAndHouseCmds(v, 12));
          if (v.region.canAppointOfficial) cmds.push({ type: 'appointOfficial' });
          return cmds;
        },
        monthly: (v) => [
          ...(v.household.debt > 0 && v.household.money > 5
            ? [{ type: 'repayDebt' as const, amount: Math.min(v.household.debt, v.household.money - 4) }]
            : []),
          ...treatCmds(v, ['nang', 'nguy_kich'], 3),
          ...reserveTrading(v, 4, v.market.sellPrice > 0 ? 0.55 : 0),
          ...careerActions(v, 5),
        ],
        choose: (v) => {
          const opts = v.pending!.options;
          const good = opts.filter((o) => (mid(o) ?? 0) >= 0.45).sort((a, b) => (mid(b) ?? 0) - (mid(a) ?? 0))[0];
          return (good ?? opts.find((o) => !o.chance) ?? opts[0]).id;
        },
      };
    case 'toi_uu':
      return {
        name,
        yearly: (v) => {
          const h = v.household;
          const cmds: Command[] = [...focusCmd(v, v.player.health < 55 ? 'suc_khoe' : workFocus(v))];
          // Mức sống để nhà tự chọn theo ngân sách (living_standards.auto_budget)
          if (h.debt > 0 && h.money > 3) cmds.push({ type: 'repayDebt', amount: Math.min(h.debt, h.money - 2) });
          const ruong = v.market.buyable.find((p) => p.id === 'ruong');
          if (ruong && h.debt === 0 && h.money > ruong.value + 6 && h.members.length >= 3) cmds.push({ type: 'buyProperty', id: 'ruong' });
          if (!h.properties.some((p) => p.id === 'trau') && h.money > 20) cmds.push({ type: 'buyProperty', id: 'trau' });
          cmds.push(...sideJobCmd(v));
          cmds.push(...upbringingCmds(v, h.money > 20 ? 'di_hoc' : 'hoc_nghe'));
          cmds.push(...matchmakingCmd(v, true, 8));
          cmds.push(...ventureAndHouseCmds(v, 15));
          if (v.region.canAppointOfficial) cmds.push({ type: 'appointOfficial' });
          return cmds;
        },
        monthly: (v) => [
          ...(v.household.debt > 0 && v.household.money > 4
            ? [{ type: 'repayDebt' as const, amount: Math.min(v.household.debt, v.household.money - 3) }]
            : []),
          ...treatCmds(v, ['nhe', 'nang', 'nguy_kich'], 1),
          ...reserveTrading(v, 6, 0.6),
          ...careerActions(v, 6),
        ],
        choose: (v) => {
          const opts = v.pending!.options;
          const best = opts.filter((o) => (mid(o) ?? 0) >= 0.55).sort((a, b) => (mid(b) ?? 0) - (mid(a) ?? 0))[0];
          return (best ?? opts.find((o) => !o.chance) ?? opts[0]).id;
        },
      };
    default:
      return {
        name: 'ngau_nhien',
        yearly: (v) => {
          const avail = v.focus.options.map((o) => o.id);
          const cmds: Command[] = avail.length ? focusCmd(v, rng.pick(avail)) : [];
          cmds.push({ type: 'setLivingStandard', id: rng.pick(v.livingStandards).id });
          if (rng.chance(0.1)) {
            const jobs = v.career.availableCareers.filter((c) => c.available);
            if (jobs.length > 0) cmds.push({ type: 'joinCareer', careerId: rng.pick(jobs).id });
          }
          return cmds;
        },
        monthly: (v) => [...(rng.chance(0.3) ? treatCmds(v, ['nhe', 'nang', 'nguy_kich'], 0) : []), ...(rng.chance(0.05) ? reserveTrading(v, rng.int(0, 6), 0) : [])],
        choose: (v) => rng.pick(v.pending!.options).id,
      };
  }
}

export const BOT_NAMES = ['an_phan', 'lieu_linh', 'tham_vong', 'ngau_nhien', 'toi_uu'] as const;
