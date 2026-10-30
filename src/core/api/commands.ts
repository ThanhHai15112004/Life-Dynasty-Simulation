// [0] Các lệnh người chơi gửi vào lõi. UI/bot chỉ được đổi trạng thái qua đây.
import type { DelegationPolicy, OrganizationFactorKey } from '../entities/Organization';
import { addLedger } from '../entities/Household';
import type { SchemeKind } from '../entities/World';
import { evaluate } from '../engine/RuleEvaluator';
import { fireDecision, resolveDecision } from '../events/decision';
import { writeTemplate } from '../events/journal';
import { eligibleRoles } from '../events/selection';
import { Ledger, SystemLog } from '../events/systemLogKeys';
import { resolveMinor } from '../events/decision';
import { careerAvailable, changeCareer, executeCareerAction, setMemberCareer, setSideJob } from '../systems/career';
import type { SimContext } from '../systems/context';
import { addToPurse, isPlayerHead } from '../systems/economy';
import { buyPrice, sellPrice } from '../systems/economy/helpers';
import {
  borrowFromNpc,
  closeVenture,
  collectNpcLoan,
  expandVenture,
  forgiveNpcLoan,
  lendToNpc,
  openVenture,
  repayNpcLoan,
  setVentureWorkers,
  upgradeHouse,
} from '../systems/economy/ventures';
import {
  adoptChild,
  adoptDistantRelative,
  arrangeMarriage,
  canAdoptChild,
  canAdoptRelative,
  setChildUpbringing,
  transitionToHeir,
} from '../systems/family';
import { focusAvailable } from '../systems/focus';
import { infectCharacter, treatDisease, treatmentBlock } from '../systems/life';
import { dispatchMilitaryCampaign } from '../systems/military';
import {
  contributeToOrganization,
  delegateOrganization,
  investOrganizationFactor,
  joinOrganization,
} from '../systems/organization';
import { player, playerHousehold } from '../systems/people';
import { alignWithFaction, petitionCourt } from '../systems/politics';
import { executeRebellionAction, joinRebellion } from '../systems/rebellion';
import { createResolver } from '../systems/resolver';
import { cancelScheme, exposeSecret, startScheme, useHook } from '../systems/social';
import { answerReflection } from '../systems/story';
import { yearlyEraTransition } from '../world/era';
import {
  appointPrefectureOfficial,
  cancelActiveTrip,
  relocateHousehold,
  startTradeTrip,
} from '../world/region';

export { focusAvailable };

export type Command =
  | { type: 'setFocus'; focusId: string }
  | { type: 'setAutoManage'; key: 'livingStandard' | 'repayDebt' | 'sellSurplus' | 'invest'; value: boolean }
  | { type: 'chooseMinor'; optionId: string }
  | { type: 'joinCareer'; careerId: string }
  | { type: 'doCareerAction'; actionId: string }
  | { type: 'setSideJob'; sideJobId: string | null }
  | { type: 'setMemberCareer'; characterId: string; careerId: string }
  | { type: 'setLivingStandard'; id: string }
  | { type: 'chooseOption'; optionId: string }
  /** Viết một dòng cho mốc suy ngẫm đang chờ (rỗng = bỏ qua). */
  | { type: 'answerReflection'; text: string }
  | { type: 'sellFood'; amount: number }
  | { type: 'buyFood'; amount: number }
  | { type: 'buyProperty'; id: string }
  | { type: 'sellProperty'; id: string }
  | { type: 'upgradeHouse' }
  | { type: 'openVenture'; ventureId: string }
  | { type: 'expandVenture'; ventureId: string }
  | { type: 'setVentureWorkers'; ventureId: string; hiredWorkers: number }
  | { type: 'closeVenture'; ventureId: string }
  | { type: 'borrowFromNpc'; npcId: string; amount: number }
  | { type: 'repayNpcLoan'; loanId: string; amount: number }
  | { type: 'lendToNpc'; npcId: string; amount: number }
  | { type: 'collectNpcLoan'; loanId: string }
  | { type: 'forgiveNpcLoan'; loanId: string }
  | { type: 'repayDebt'; amount: number }
  | { type: 'treatDisease'; characterId: string; diseaseId: string }
  | { type: 'chooseHeir'; heirId: string }
  | { type: 'adoptChild' }
  | { type: 'adoptRelative' }
  | { type: 'setChildUpbringing'; childId: string; upbringing: string }
  | { type: 'arrangeMarriage'; targetCharId: string; candidateId: string }
  | { type: 'relocateHousehold'; targetSettlementId: string; sellOldProperties: boolean }
  | { type: 'startTradeTrip'; targetSettlementId: string; cargoMoney: number }
  | { type: 'cancelTrip' }
  | { type: 'appointOfficial' }
  // [A] Quyền lực mềm: Mưu sự, Nắm thóp, Bí mật
  | { type: 'startScheme'; kind: SchemeKind; targetId: string }
  | { type: 'cancelScheme' }
  | { type: 'useHook'; hookId: string; action: 'extort_money' | 'force_support' | 'forgive_debt' }
  | { type: 'exposeSecret'; secretId: string }
  // [C] Hệ thống Tổ chức Fractal & Ủy quyền (Phase 10)
  | { type: 'joinOrganization'; orgId: string }
  | { type: 'contributeOrganization'; orgId: string; amount: number }
  | { type: 'investOrganizationFactor'; orgId: string; factor: OrganizationFactorKey }
  | { type: 'delegateOrganization'; orgId: string; deputyId: string | null; policy: DelegationPolicy }
  // [D] Hệ thống Vương quốc, Chính trị, Quân sự & Nổi dậy 8 giai đoạn (Phase 11)
  | { type: 'joinRebellion'; promise?: 'chia_ruong' | 'xoa_thue' | 'tru_gian' }
  | { type: 'rebellionAction'; action: 'gather_followers' | 'stockpile_supplies' | 'keep_secrecy' | 'advance_stage' }
  | { type: 'alignFaction'; factionId: string }
  | { type: 'petitionCourt'; policy: 'giam_thue' | 'chan_te' | 'tang_binh' }
  | { type: 'militaryCampaign'; provinceId: string; action: 'suppress_unrest' | 'fortify_border' }
  // [E] Chế độ Xuyên Thời Đại (Phase 13)
  | { type: 'fastForwardDecade'; years?: number }
  // [1] Lệnh Dev (chỉ chạy khi cờ dev bật)
  | { type: 'devTriggerEvent'; eventId: string }
  | { type: 'devModifyStat'; stat: 'money' | 'food' | 'debt' | 'health' | 'stress'; delta: number }
  | { type: 'devAddDisease'; characterId?: string; diseaseId: string }
  | { type: 'devKill'; characterId?: string; causeId?: string };

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
  | 'treated_recently'
  | 'invalid_heir'
  | 'cannot_adopt'
  | 'invalid_upbringing'
  | 'invalid_marriage'
  | 'clan_feud'
  | 'status_gap'
  | 'dev_disabled';

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
  if (cmd.type === 'chooseHeir') {
    if (!state.gameOver || (state.playMode !== 'dynasty' && state.playMode !== 'legacy_of_ages')) return fail('game_over');
    return transitionToHeir(ctx, cmd.heirId) ? ok : fail('invalid_heir');
  }
  if (state.gameOver) return fail('game_over');
  if (state.pending && cmd.type !== 'chooseOption' && cmd.type !== 'chooseMinor') return fail('event_pending');
  const h = playerHousehold(ctx);
  // Việc chi tiêu, mua bán của cả nhà chỉ chủ hộ mới quyết
  const householdOnly = [
    'setLivingStandard',
    'setAutoManage',
    'sellFood',
    'buyFood',
    'buyProperty',
    'sellProperty',
    'upgradeHouse',
    'openVenture',
    'expandVenture',
    'setVentureWorkers',
    'closeVenture',
    'borrowFromNpc',
    'repayNpcLoan',
    'lendToNpc',
    'collectNpcLoan',
    'forgiveNpcLoan',
    'repayDebt',
    'treatDisease',
    'relocateHousehold',
    'startTradeTrip',
  ];
  if (householdOnly.includes(cmd.type) && !isPlayerHead(ctx)) return fail('not_head');

  switch (cmd.type) {
    case 'chooseOption':
      if (!state.pending) return fail('no_event');
      return resolveDecision(ctx, cmd.optionId) ? ok : fail('invalid_option');

    case 'answerReflection':
      return answerReflection(ctx, cmd.text, content.balance.display.reflection_max_length) ? ok : fail('no_event');

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
      // Vốn vào nghề: chủ hộ lấy từ tiền nhà; [1.5] chưa làm chủ hộ thì bỏ tiền riêng của mình
      const fromPurse = !isPlayerHead(ctx);
      if (cost > (fromPurse ? state.purse.money : h.money)) return fail('not_enough_money');
      if (cost > 0 && fromPurse) addToPurse(ctx, Ledger.Event, -cost);
      else if (cost > 0) {
        h.money -= cost;
        addLedger(h, Ledger.Event, -cost, 0);
      }
      return changeCareer(ctx, cmd.careerId, 0) ? ok : fail('career_unavailable');
    }

    case 'doCareerAction': {
      return executeCareerAction(ctx, cmd.actionId) ? ok : fail('action_unavailable');
    }

    case 'setSideJob': {
      return setSideJob(ctx, cmd.sideJobId) ? ok : fail('career_unavailable');
    }

    case 'setMemberCareer': {
      if (!isPlayerHead(ctx)) return fail('not_head');
      return setMemberCareer(ctx, cmd.characterId, cmd.careerId) ? ok : fail('career_unavailable');
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

    case 'upgradeHouse': {
      return upgradeHouse(ctx) ? ok : fail('not_enough_money');
    }

    case 'openVenture': {
      const def = content.index.venture.get(cmd.ventureId);
      if (!def) return fail('not_tradeable');
      if (h.money < def.capital_cost) return fail('not_enough_money');
      return openVenture(ctx, cmd.ventureId) ? ok : fail('not_tradeable');
    }

    case 'expandVenture': {
      return expandVenture(ctx, cmd.ventureId) ? ok : fail('not_enough_money');
    }

    case 'setVentureWorkers': {
      return setVentureWorkers(ctx, cmd.ventureId, cmd.hiredWorkers) ? ok : fail('not_owned');
    }

    case 'closeVenture': {
      return closeVenture(ctx, cmd.ventureId) ? ok : fail('not_owned');
    }

    case 'borrowFromNpc': {
      return borrowFromNpc(ctx, cmd.npcId, cmd.amount) ? ok : fail('not_tradeable');
    }

    case 'repayNpcLoan': {
      return repayNpcLoan(ctx, cmd.loanId, cmd.amount) ? ok : fail('not_enough_money');
    }

    case 'lendToNpc': {
      return lendToNpc(ctx, cmd.npcId, cmd.amount) ? ok : fail('not_enough_money');
    }

    case 'collectNpcLoan': {
      return collectNpcLoan(ctx, cmd.loanId) ? ok : fail('not_owned');
    }

    case 'forgiveNpcLoan': {
      return forgiveNpcLoan(ctx, cmd.loanId) ? ok : fail('not_owned');
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

    case 'adoptChild': {
      const check = canAdoptChild(ctx);
      if (!check.ok) return fail('cannot_adopt');
      return adoptChild(ctx, undefined, true) ? ok : fail('cannot_adopt');
    }

    case 'adoptRelative': {
      const check = canAdoptRelative(ctx);
      if (!check.ok) return fail('cannot_adopt');
      return adoptDistantRelative(ctx, undefined, true) ? ok : fail('cannot_adopt');
    }

    case 'setChildUpbringing': {
      return setChildUpbringing(ctx, cmd.childId, cmd.upbringing) ? ok : fail('invalid_upbringing');
    }

    case 'arrangeMarriage': {
      const res = arrangeMarriage(ctx, cmd.targetCharId, cmd.candidateId);
      if (!res.ok) {
        if (res.error === 'clan_feud') return fail('clan_feud');
        if (res.error === 'status_gap') return fail('status_gap');
        if (res.error === 'not_enough_money') return fail('not_enough_money');
        return fail('invalid_marriage');
      }
      return ok;
    }

    case 'relocateHousehold': {
      return relocateHousehold(ctx, cmd.targetSettlementId, cmd.sellOldProperties)
        ? ok
        : fail('not_enough_money');
    }

    case 'startTradeTrip': {
      return startTradeTrip(ctx, cmd.targetSettlementId, cmd.cargoMoney)
        ? ok
        : fail('action_unavailable');
    }

    case 'cancelTrip': {
      return cancelActiveTrip(ctx) ? ok : fail('action_unavailable');
    }

    case 'appointOfficial': {
      return appointPrefectureOfficial(ctx) ? ok : fail('action_unavailable');
    }

    case 'startScheme': {
      return startScheme(ctx, cmd.kind, cmd.targetId) ? ok : fail('action_unavailable');
    }

    case 'cancelScheme': {
      return cancelScheme(ctx) ? ok : fail('action_unavailable');
    }

    case 'useHook': {
      return useHook(ctx, cmd.hookId, cmd.action) ? ok : fail('action_unavailable');
    }

    case 'exposeSecret': {
      return exposeSecret(ctx, cmd.secretId) ? ok : fail('action_unavailable');
    }

    case 'joinOrganization': {
      return joinOrganization(ctx, cmd.orgId) ? ok : fail('action_unavailable');
    }

    case 'contributeOrganization': {
      return contributeToOrganization(ctx, cmd.orgId, cmd.amount) ? ok : fail('not_enough_money');
    }

    case 'investOrganizationFactor': {
      return investOrganizationFactor(ctx, cmd.orgId, cmd.factor) ? ok : fail('action_unavailable');
    }

    case 'delegateOrganization': {
      return delegateOrganization(ctx, cmd.orgId, cmd.deputyId, cmd.policy) ? ok : fail('action_unavailable');
    }

    case 'joinRebellion': {
      return joinRebellion(ctx, cmd.promise) ? ok : fail('action_unavailable');
    }

    case 'rebellionAction': {
      return executeRebellionAction(ctx, cmd.action) ? ok : fail('action_unavailable');
    }

    case 'alignFaction': {
      return alignWithFaction(ctx, cmd.factionId) ? ok : fail('action_unavailable');
    }

    case 'petitionCourt': {
      return petitionCourt(ctx, cmd.policy) ? ok : fail('not_enough_money');
    }

    case 'militaryCampaign': {
      return dispatchMilitaryCampaign(ctx, cmd.provinceId, cmd.action) ? ok : fail('action_unavailable');
    }

    case 'fastForwardDecade': {
      const years = Math.max(1, Math.min(10, Math.floor(cmd.years ?? 5)));
      state.clock.year += years;
      state.clock.monthIndex += years * content.balance.calendar.months_per_year;
      h.money += years * 2;
      addLedger(h, Ledger.OtherIncome, years * 2, 0);
      yearlyEraTransition(ctx);
      writeTemplate(ctx, SystemLog.DecadeFastForward, {
        params: { amount: years },
      });
      return ok;
    }

    // ── Lệnh Dev ──
    case 'devTriggerEvent': {
      if (!content.balance.display.dev_tools) return fail('dev_disabled');
      const ev = content.index.event.get(cmd.eventId);
      if (!ev) return fail('no_event');
      const roles = eligibleRoles(ctx, ev) ?? { actor: state.playerId };
      fireDecision(ctx, ev, roles);
      return ok;
    }

    case 'devModifyStat': {
      if (!content.balance.display.dev_tools) return fail('dev_disabled');
      const me = player(ctx);
      switch (cmd.stat) {
        case 'money':
          h.money = Math.max(0, h.money + cmd.delta);
          break;
        case 'food':
          h.food = Math.max(0, h.food + cmd.delta);
          break;
        case 'debt':
          h.debt = Math.max(0, h.debt + cmd.delta);
          break;
        case 'health':
          me.health = Math.max(0, Math.min(content.balance.life.health.max, me.health + cmd.delta));
          break;
        case 'stress':
          me.stress = Math.max(0, Math.min(100, me.stress + cmd.delta));
          break;
      }
      return ok;
    }

    case 'devAddDisease': {
      if (!content.balance.display.dev_tools) return fail('dev_disabled');
      const c = cmd.characterId ? state.characters[cmd.characterId] : player(ctx);
      if (!c) return fail('not_sick');
      infectCharacter(ctx, c, cmd.diseaseId);
      return ok;
    }

    case 'devKill': {
      if (!content.balance.display.dev_tools) return fail('dev_disabled');
      const c = cmd.characterId ? state.characters[cmd.characterId] : player(ctx);
      if (!c) return fail('not_sick');
      c.alive = false;
      c.deathCauseId = cmd.causeId ?? 'benh';
      c.deathYear = state.clock.year;
      if (c.id === state.playerId) {
        state.gameOver = { year: state.clock.year, age: state.clock.year - c.birthYear, causeId: c.deathCauseId };
      }
      return ok;
    }
  }
}
