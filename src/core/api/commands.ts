// [0] Các lệnh người chơi gửi vào lõi. UI/bot chỉ được đổi trạng thái qua đây.
import { addLedger } from '../entities/Household';
import { evaluate } from '../engine/RuleEvaluator';
import { resolveDecision } from '../events/decision';
import { Ledger } from '../events/systemLogKeys';
import { resolveMinor } from '../events/decision';
import { careerAvailable, changeCareer, executeCareerAction } from '../systems/career';
import type { SimContext } from '../systems/context';
import { isPlayerHead } from '../systems/economy';
import { buyPrice, sellPrice } from '../systems/economy/helpers';
import { focusAvailable } from '../systems/focus';
import { treatDisease, treatmentBlock } from '../systems/life';
import { playerHousehold } from '../systems/people';
import { createResolver } from '../systems/resolver';

export { focusAvailable };

export type Command =
  | { type: 'setFocus'; focusId: string }
  | { type: 'setAutoManage'; key: 'livingStandard' | 'repayDebt'; value: boolean }
  | { type: 'chooseMinor'; optionId: string }
  | { type: 'joinCareer'; careerId: string }
  | { type: 'doCareerAction'; actionId: string }
  | { type: 'setLivingStandard'; id: string }
  | { type: 'chooseOption'; optionId: string }
  | { type: 'sellFood'; amount: number }
  | { type: 'buyFood'; amount: number }
  | { type: 'buyProperty'; id: string }
  | { type: 'sellProperty'; id: string }
  | { type: 'repayDebt'; amount: number }
  | { type: 'treatDisease'; characterId: string; diseaseId: string };

/** Mã lỗi là khóa tra chữ trong data/lang (error.<mã>). */
export type CommandError =
  | 'game_over'
  | 'event_pending'
  | 'no_event'
  | 'invalid_option'
  | 'focus_unavailable'
  | 'not_head'
  | 'career_unavailable'
  | 'action_unavailable'
  | 'unknown_living_standard'
  | 'not_enough_money'
  | 'not_enough_food'
  | 'not_owned'
  | 'not_tradeable'
  | 'no_debt'
  | 'not_sick'
  | 'treated_recently';

export type CommandResult = { ok: true } | { ok: false; error: CommandError };

const ok: CommandResult = { ok: true };
const fail = (error: CommandError): CommandResult => ({ ok: false, error });

export function ambitionAvailable(ctx: SimContext, ambitionId: string): boolean {
  const a = ctx.content.index.ambition.get(ambitionId);
  if (!a) return false;
  return evaluate(a.condition, createResolver(ctx));
}

export function executeCommand(ctx: SimContext, cmd: Command): CommandResult {
  const { state, content } = ctx;
  if (state.gameOver) return fail('game_over');
  if (state.pending && cmd.type !== 'chooseOption' && cmd.type !== 'chooseMinor') return fail('event_pending');
  const h = playerHousehold(ctx);
  // Việc chi tiêu, mua bán của cả nhà chỉ chủ hộ mới quyết
  const householdOnly = ['setLivingStandard', 'setAutoManage', 'sellFood', 'buyFood', 'buyProperty', 'sellProperty', 'repayDebt', 'treatDisease'];
  if (householdOnly.includes(cmd.type) && !isPlayerHead(ctx)) return fail('not_head');

  switch (cmd.type) {
    case 'chooseOption':
      if (!state.pending) return fail('no_event');
      return resolveDecision(ctx, cmd.optionId) ? ok : fail('invalid_option');

    case 'chooseMinor':
      if (!state.minor) return fail('no_event');
      return resolveMinor(ctx, cmd.optionId) ? ok : fail('invalid_option');

    case 'setFocus': {
      if (!focusAvailable(ctx, cmd.focusId)) return fail('focus_unavailable');
      state.focus.primary = cmd.focusId;
      return ok;
    }

    case 'setAutoManage':
      state.autoManage[cmd.key] = cmd.value;
      return ok;

    case 'joinCareer': {
      if (state.career.id === cmd.careerId || !careerAvailable(ctx, cmd.careerId)) return fail('career_unavailable');
      const cost = content.index.career.get(cmd.careerId)?.join?.cost_money ?? 0;
      // Vốn vào nghề lấy từ tiền nhà: chỉ chủ hộ mới được bỏ ra
      if (cost > 0 && !isPlayerHead(ctx)) return fail('not_head');
      if (cost > h.money) return fail('not_enough_money');
      if (cost > 0) {
        h.money -= cost;
        addLedger(h, Ledger.Event, -cost, 0);
      }
      return changeCareer(ctx, cmd.careerId, 0) ? ok : fail('career_unavailable');
    }

    case 'doCareerAction': {
      return executeCareerAction(ctx, cmd.actionId) ? ok : fail('action_unavailable');
    }

    case 'setLivingStandard':
      if (!content.index.livingStandard.has(cmd.id)) return fail('unknown_living_standard');
      // Chọn tay thì thôi tự động theo gia cảnh
      h.livingStandard = cmd.id;
      state.autoManage.livingStandard = false;
      return ok;

    case 'sellFood': {
      const amount = Math.floor(cmd.amount);
      if (amount <= 0 || amount > h.food) return fail('not_enough_food');
      const money = amount * sellPrice(ctx);
      h.food -= amount;
      h.money += money;
      addLedger(h, Ledger.SellFood, money, -amount);
      return ok;
    }

    case 'buyFood': {
      const amount = Math.floor(cmd.amount);
      const cost = amount * buyPrice(ctx);
      if (amount <= 0 || cost > h.money) return fail('not_enough_money');
      h.food += amount;
      h.money -= cost;
      addLedger(h, Ledger.BuyFood, -cost, amount);
      return ok;
    }

    case 'buyProperty': {
      const p = content.index.property.get(cmd.id);
      if (!p?.buyable) return fail('not_tradeable');
      if (p.value > h.money) return fail('not_enough_money');
      h.money -= p.value;
      h.properties[p.id] = (h.properties[p.id] ?? 0) + 1;
      addLedger(h, Ledger.BuyProperty, -p.value, 0);
      return ok;
    }

    case 'sellProperty': {
      const p = content.index.property.get(cmd.id);
      if (!p?.sellable) return fail('not_tradeable');
      if ((h.properties[p.id] ?? 0) <= 0) return fail('not_owned');
      const money = p.value * content.balance.economy.property_sell_factor;
      h.properties[p.id] -= 1;
      h.money += money;
      addLedger(h, Ledger.SellProperty, money, 0);
      return ok;
    }

    case 'treatDisease': {
      const c = state.characters[cmd.characterId];
      if (!c) return fail('not_sick');
      const block = treatmentBlock(ctx, c, cmd.diseaseId);
      if (block) return fail(block);
      return treatDisease(ctx, c, cmd.diseaseId) ? ok : fail('not_sick');
    }

    case 'repayDebt': {
      if (h.debt <= 0) return fail('no_debt');
      const amount = Math.min(cmd.amount, h.debt);
      if (amount <= 0 || amount > h.money) return fail('not_enough_money');
      h.money -= amount;
      h.debt -= amount;
      addLedger(h, Ledger.RepayDebt, -amount, 0);
      return ok;
    }
  }
}
