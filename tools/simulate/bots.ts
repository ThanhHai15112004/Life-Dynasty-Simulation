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

/** Làm hành động nghề đầu tiên đang khả dụng (đủ tuổi, hết hồi, đủ vốn). */
function careerActions(view: HudView): Command[] {
  const act = view.career.actions.find((a) => a.available);
  return act ? [{ type: 'doCareerAction', actionId: act.id }] : [];
}

export function makeBot(name: string, seed: string): Bot {
  const rng = Rng.fromSeed(`bot:${name}:${seed}`);
  switch (name) {
    case 'an_phan':
      return {
        name,
        yearly: (v) => {
          const h = v.household;
          const cmds: Command[] = [...focusCmd(v, v.player.health < 50 ? 'suc_khoe' : workFocus(v)), { type: 'setLivingStandard', id: 'dam_bac' }];
          // Người cẩn trọng có dư là trả nợ ngay
          if (h.debt > 0 && h.money > 5) cmds.push({ type: 'repayDebt', amount: Math.min(h.debt, h.money - 3) });
          return cmds;
        },
        monthly: (v) => treatCmds(v, ['nang', 'nguy_kich'], 2),
        choose: (v) => {
          const opts = v.pending!.options;
          return (opts.find((o) => !o.chance) ?? opts[opts.length - 1]).id;
        },
      };
    case 'lieu_linh':
      return {
        name,
        yearly: (v) => [...focusCmd(v, 'kinh_doanh'), { type: 'setLivingStandard', id: v.household.money > 5 ? 'du_day' : 'dam_bac' }],
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
          const cmds: Command[] = [...focusCmd(v, v.player.age < 20 ? 'hoc_tap' : workFocus(v) === 'lam_an' ? 'kinh_doanh' : workFocus(v))];
          cmds.push({ type: 'setLivingStandard', id: v.household.money > 15 ? 'du_day' : 'dam_bac' });
          if (v.household.money > 25) cmds.push({ type: 'buyProperty', id: 'ruong' });
          return cmds;
        },
        monthly: (v) => [...treatCmds(v, ['nang', 'nguy_kich'], 3), ...reserveTrading(v, 4, v.market.sellPrice > 0 ? 0.55 : 0), ...careerActions(v)],
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
          return cmds;
        },
        monthly: (v) => [...treatCmds(v, ['nhe', 'nang', 'nguy_kich'], 1), ...reserveTrading(v, 6, 0.6), ...careerActions(v)],
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
          return cmds;
        },
        monthly: (v) => [...(rng.chance(0.3) ? treatCmds(v, ['nhe', 'nang', 'nguy_kich'], 0) : []), ...(rng.chance(0.05) ? reserveTrading(v, rng.int(0, 6), 0) : [])],
        choose: (v) => rng.pick(v.pending!.options).id,
      };
  }
}

export const BOT_NAMES = ['an_phan', 'lieu_linh', 'tham_vong', 'ngau_nhien', 'toi_uu'] as const;
