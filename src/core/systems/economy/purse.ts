// [1.5] Túi tiền riêng của người chơi khi chưa làm chủ hộ (kiểu 1in8b): tài sản là của bạn, không phải của cha mẹ.
// Tiền mình làm ra vào túi (góp một phần cho nhà), cha mẹ cho tiêu vặt, ăn ở do cha mẹ lo; làm chủ hộ thì gộp vào gia sản.
import { addLedger } from '../../entities/Household';
import { Ledger } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { ageNow, aliveMembers, householdHead, player, playerHousehold } from '../people';
import { levelYearCost, ledgerValue } from './helpers';

/** Túi riêng đang dùng: người chơi còn sống và chưa làm chủ hộ. */
export function purseActive(ctx: SimContext): boolean {
  const me = player(ctx);
  return me.alive && householdHead(ctx)?.id !== me.id;
}

/** Ghi một khoản vào túi riêng (không đụng tiền nhà). */
export function addToPurse(ctx: SimContext, category: string, amount: number): void {
  if (amount === 0) return;
  const p = ctx.state.purse;
  p.money += amount;
  addLedger(p, category, amount, 0);
}

/**
 * Tiền người chơi tự làm ra (lương nghề riêng, thu nhập theo trọng tâm, tiền công).
 * Chưa làm chủ hộ: vào túi riêng, góp contribute_share cho nhà. Làm chủ rồi: vào thẳng tiền nhà.
 */
export function earnPersonal(ctx: SimContext, category: string, amount: number): void {
  const h = playerHousehold(ctx);
  if (amount <= 0 || !purseActive(ctx)) {
    h.money += amount;
    addLedger(h, category, amount, 0);
    return;
  }
  const share = amount * ctx.content.balance.economy.purse.contribute_share;
  addToPurse(ctx, category, amount);
  addToPurse(ctx, Ledger.ContributeOut, -share);
  h.money += share;
  addLedger(h, Ledger.ContributeIn, share, 0);
}

/** Tiền riêng do sự kiện (hiệu ứng own_money): chưa làm chủ thì vào túi, làm chủ thì vào tiền nhà. */
export function ownMoney(ctx: SimContext, category: string, amount: number): void {
  if (purseActive(ctx)) {
    addToPurse(ctx, category, Math.max(amount, -ctx.state.purse.money));
    return;
  }
  const h = playerHousehold(ctx);
  h.money += amount;
  addLedger(h, category, amount, 0);
}

/** Hằng tháng: cha mẹ cho tiêu vặt; từ tuổi board_from_age sổ riêng ghi phần ăn ở cha mẹ lo (hai dòng triệt tiêu). */
export function monthlyPurse(ctx: SimContext): void {
  if (!purseActive(ctx)) return;
  const cfg = ctx.content.balance.economy.purse;
  const h = playerHousehold(ctx);
  const age = ageNow(ctx, player(ctx));
  if (age >= cfg.pocket_min_age) {
    const pocket = Math.min(cfg.pocket_money_month[h.livingStandard] ?? 0, Math.max(0, h.money));
    if (pocket > 0) {
      h.money -= pocket;
      addLedger(h, Ledger.PocketOut, -pocket, 0);
      addToPurse(ctx, Ledger.PocketIn, pocket);
    }
  }
  if (age >= cfg.board_from_age) {
    const board = levelYearCost(ctx, h.livingStandard) / 12 / Math.max(1, aliveMembers(ctx, h).length);
    addLedger(ctx.state.purse, Ledger.BoardCost, -board, 0);
    addLedger(ctx.state.purse, Ledger.BoardPaid, board, 0);
  }
}

/** Cuối năm: chốt sổ riêng (chỉ khi có ghi chép — đã làm chủ hộ thì thôi). */
export function yearlyPurse(ctx: SimContext): void {
  const { state, content } = ctx;
  const p = state.purse;
  if (p.ledger.length > 0) {
    const kinds = content.balance.economy.purse.income_ledgers;
    const income = p.ledger.filter((e) => kinds.includes(e.category)).reduce((s, e) => s + Math.max(0, ledgerValue(ctx, e)), 0);
    p.history.push({ year: state.clock.year, entries: p.ledger.map((e) => ({ ...e })), netWorth: p.money, openNetWorth: p.openMoney, income });
    const keep = content.balance.economy.ledger_history_years;
    if (p.history.length > keep) p.history.splice(0, p.history.length - keep);
  }
  p.ledger = [];
  p.openMoney = p.money;
}

/** Vừa làm chủ hộ: tiền riêng gộp vào gia sản (sổ riêng ghi một dòng chuyển đi, sổ nhà ghi một dòng nhận). */
export function mergePurse(ctx: SimContext): void {
  const p = ctx.state.purse;
  if (p.money <= 0) return;
  const h = playerHousehold(ctx);
  h.money += p.money;
  addLedger(h, Ledger.PurseMergedIn, p.money, 0);
  addLedger(p, Ledger.PurseMergedOut, -p.money, 0);
  p.money = 0;
}
