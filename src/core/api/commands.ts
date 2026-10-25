// [0] Các lệnh người chơi gửi vào lõi. UI/bot chỉ được đổi trạng thái qua đây.
import { addLedger } from '../entities/Household';
import { evaluate } from '../engine/RuleEvaluator';
import { resolveDecision } from '../events/decision';
import { Ledger } from '../events/systemLogKeys';
import { careerAvailable, changeCareer, executeCareerAction } from '../systems/career';
import type { SimContext } from '../systems/context';
import { buyPrice, sellPrice } from '../systems/economy/helpers';
import { ageNow, lifeStageOf, player, playerHousehold } from '../systems/people';
import { createResolver } from '../systems/resolver';

export type Command =
  | { type: 'setFocus'; primary: string; secondary: string | null }
  | { type: 'setAmbition'; id: string }
  | { type: 'joinCareer'; careerId: string }
  | { type: 'doCareerAction'; actionId: string }
  | { type: 'setLivingStandard'; id: string }
  | { type: 'chooseOption'; optionId: string }
  | { type: 'sellFood'; amount: number }
  | { type: 'buyFood'; amount: number }
  | { type: 'buyProperty'; id: string }
  | { type: 'sellProperty'; id: string }
  | { type: 'repayDebt'; amount: number };

/** Mã lỗi là khóa tra chữ trong data/lang (error.<mã>). */
export type CommandError =
  | 'game_over'
  | 'event_pending'
  | 'no_event'
  | 'invalid_option'
  | 'focus_unavailable'
  | 'ambition_unavailable'
  | 'career_unavailable'
  | 'action_unavailable'
  | 'no_secondary_focus'
  | 'unknown_living_standard'
  | 'not_enough_money'
  | 'not_enough_food'
  | 'not_owned'
  | 'not_tradeable'
  | 'no_debt';

export type CommandResult = { ok: true } | { ok: false; error: CommandError };

const ok: CommandResult = { ok: true };
const fail = (error: CommandError): CommandResult => ({ ok: false, error });

export function focusAvailable(ctx: SimContext, focusId: string): boolean {
  const f = ctx.content.index.focus.get(focusId);
  if (!f) return false;
  const stage = lifeStageOf(ctx, ageNow(ctx, player(ctx)));
  return stage.can_choose_focus && evaluate(f.condition, createResolver(ctx));
}

export function ambitionAvailable(ctx: SimContext, ambitionId: string): boolean {
  const a = ctx.content.index.ambition.get(ambitionId);
  if (!a) return false;
  return evaluate(a.condition, createResolver(ctx));
}

export function executeCommand(ctx: SimContext, cmd: Command): CommandResult {
  const { state, content } = ctx;
  if (state.gameOver) return fail('game_over');
  if (state.pending && cmd.type !== 'chooseOption') return fail('event_pending');
  const h = playerHousehold(ctx);

  switch (cmd.type) {
    case 'chooseOption':
      if (!state.pending) return fail('no_event');
      return resolveDecision(ctx, cmd.optionId) ? ok : fail('invalid_option');

    case 'setFocus': {
      if (!focusAvailable(ctx, cmd.primary)) return fail('focus_unavailable');
      if (cmd.secondary !== null) {
        const stage = lifeStageOf(ctx, ageNow(ctx, player(ctx)));
        const sec = content.index.focus.get(cmd.secondary);
        if (!stage.can_have_secondary_focus || !sec?.allow_secondary || cmd.secondary === cmd.primary) {
          return fail('no_secondary_focus');
        }
        if (!focusAvailable(ctx, cmd.secondary)) return fail('focus_unavailable');
      }
      state.focus = { primary: cmd.primary, secondary: cmd.secondary };
      return ok;
    }

    case 'setAmbition': {
      if (!ambitionAvailable(ctx, cmd.id)) return fail('ambition_unavailable');
      state.ambition.id = cmd.id;
      return ok;
    }

    case 'joinCareer': {
      if (state.career.id === cmd.careerId || !careerAvailable(ctx, cmd.careerId)) return fail('career_unavailable');
      return changeCareer(ctx, cmd.careerId, 0) ? ok : fail('career_unavailable');
    }

    case 'doCareerAction': {
      return executeCareerAction(ctx, cmd.actionId) ? ok : fail('action_unavailable');
    }

    case 'setLivingStandard':
      if (!content.index.livingStandard.has(cmd.id)) return fail('unknown_living_standard');
      h.livingStandard = cmd.id;
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
