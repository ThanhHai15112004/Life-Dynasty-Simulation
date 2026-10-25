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

function focusCmd(view: HudView, primary: string, secondary: string | null = null): Command[] {
  if (!view.focus.canChoose) return [];
  const ok = (id: string | null) => !!id && view.focus.options.some((o) => o.id === id && o.available);
  const p = ok(primary) ? primary : view.focus.options.find((o) => o.available)?.id;
  if (!p) return [];
  const s = view.focus.canSecondary && ok(secondary) && secondary !== p ? secondary : null;
  return [{ type: 'setFocus', primary: p, secondary: s }];
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

export function makeBot(name: string, seed: string): Bot {
  const rng = Rng.fromSeed(`bot:${name}:${seed}`);
  switch (name) {
    case 'an_phan':
      return {
        name,
        yearly: (v) => [...focusCmd(v, v.player.health < 50 ? 'suc_khoe' : 'lam_an', 'gia_dinh'), { type: 'setLivingStandard', id: 'dam_bac' }],
        monthly: () => [],
        choose: (v) => {
          const opts = v.pending!.options;
          return (opts.find((o) => !o.chance) ?? opts[opts.length - 1]).id;
        },
      };
    case 'lieu_linh':
      return {
        name,
        yearly: (v) => [...focusCmd(v, 'kinh_doanh', 'ren_luyen'), { type: 'setLivingStandard', id: v.household.money > 5 ? 'du_day' : 'dam_bac' }],
        monthly: (v) => reserveTrading(v, 1, 0),
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
          const cmds: Command[] = [...focusCmd(v, v.player.age < 20 ? 'hoc_tap' : 'kinh_doanh', 'lam_an')];
          cmds.push({ type: 'setLivingStandard', id: v.household.money > 15 ? 'du_day' : 'dam_bac' });
          if (v.household.money > 25) cmds.push({ type: 'buyProperty', id: 'ruong' });
          return cmds;
        },
        monthly: (v) => reserveTrading(v, 4, v.market.sellPrice > 0 ? 0.55 : 0),
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
          const cmds: Command[] = [...focusCmd(v, v.player.health < 55 ? 'suc_khoe' : 'lam_an', 'kinh_doanh')];
          cmds.push({ type: 'setLivingStandard', id: h.money > 12 && h.foodMonths > 4 ? 'du_day' : 'dam_bac' });
          if (h.debt > 0 && h.money > 3) cmds.push({ type: 'repayDebt', amount: Math.min(h.debt, h.money - 2) });
          const ruong = v.market.buyable.find((p) => p.id === 'ruong');
          if (ruong && h.debt === 0 && h.money > ruong.value + 6 && h.members.length >= 3) cmds.push({ type: 'buyProperty', id: 'ruong' });
          if (!h.properties.some((p) => p.id === 'trau') && h.money > 20) cmds.push({ type: 'buyProperty', id: 'trau' });
          return cmds;
        },
        monthly: (v) => reserveTrading(v, 6, 0.6),
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
          const avail = v.focus.options.filter((o) => o.available).map((o) => o.id);
          const cmds: Command[] = avail.length ? focusCmd(v, rng.pick(avail)) : [];
          cmds.push({ type: 'setLivingStandard', id: rng.pick(v.livingStandards).id });
          return cmds;
        },
        monthly: (v) => (rng.chance(0.05) ? reserveTrading(v, rng.int(0, 6), 0) : []),
        choose: (v) => rng.pick(v.pending!.options).id,
      };
  }
}

export const BOT_NAMES = ['an_phan', 'lieu_linh', 'tham_vong', 'ngau_nhien', 'toi_uu'] as const;
