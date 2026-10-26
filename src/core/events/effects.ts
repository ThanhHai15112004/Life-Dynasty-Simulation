// [0] Áp hậu quả của sự kiện/nhật ký lên trạng thái thật
import type { Effect, NumberExpr } from '@content/schemas';
import { clamp } from '@shared/curve';
import { fillTemplate } from '@shared/template';
import type { Character } from '../entities/Character';
import { addLedger } from '../entities/Household';
import { RngStream, type SimContext } from '../systems/context';
import { aliveMembers, playerHousehold } from '../systems/people';
import { createResolver, type Bindings, type StateResolver } from '../systems/resolver';
import { addSkillXp } from '../systems/skills';
import { cureCharacter, infectCharacter } from '../systems/life';
import { healthCap } from '../systems/life/health';
import { monthlyFoodNeed, sellPrice } from '../systems/economy/helpers';
import { ownMoney } from '../systems/economy/purse';
import { addCareerMerit, addWanted, changeCareer, setPlayerCareerTenure, setSideJob } from '../systems/career';
import { changeClanRelation } from '../systems/ai';
import {
  adoptChild,
  adoptDistantRelative,
  arrangeMarriage,
  getMarriageableMembers,
  getMatchmakingCandidates,
  marryPlayer,
  settleInheritance,
  splitPlayerHousehold,
} from '../systems/family';
import { addOpinionChange, changeFavor, changeReputation } from '../systems/social';
import { changeFilialPiety, changeScholarlyPrestige, setExamDegree } from '../systems/status';
import { queueCutscene } from './cutscene';
import { Ledger, LogKind } from './systemLogKeys';
import { pushLog } from './journal';

/** Khóa tác động hiển thị cuối dòng nhật ký (nhãn ở data/lang: delta.<khóa>). */
export type DeltaKey = 'money' | 'food' | 'debt' | 'health' | 'stress' | 'reputation';

export function evalNumber(expr: NumberExpr, r: StateResolver): number {
  if (typeof expr === 'number') return expr;
  const raw = r.get(expr.var);
  let v = (typeof raw === 'number' ? raw : 0) * expr.factor + expr.add;
  if (expr.min !== undefined) v = Math.max(expr.min, v);
  if (expr.max !== undefined) v = Math.min(expr.max, v);
  return expr.round ? Math.round(v) : v;
}

function targets(ctx: SimContext, who: string, r: StateResolver): Character[] {
  if (who === 'household') return aliveMembers(ctx);
  const c = r.character(who);
  return c && c.alive ? [c] : [];
}

const bump = (deltas: Record<string, number>, key: DeltaKey, v: number) => {
  if (v !== 0) deltas[key] = (deltas[key] ?? 0) + v;
};

/** Áp danh sách hậu quả; trả về các thay đổi của người chơi/hộ để hiển thị. */
export function applyEffects(ctx: SimContext, effects: readonly Effect[], b: Bindings = {}): Record<string, number> {
  const deltas: Record<string, number> = {};
  if (effects.length === 0) return deltas;
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  const r = createResolver(ctx, b);
  const lifeBal = content.balance.life;

  const run = (list: readonly Effect[]) => {
    for (const e of list) {
      switch (e.type) {
        case 'money': {
          const v = evalNumber(e.value, r);
          h.money += v;
          addLedger(h, e.ledger ?? Ledger.Event, v, 0);
          bump(deltas, 'money', v);
          break;
        }
        case 'food': {
          const v = Math.max(evalNumber(e.value, r), -h.food);
          h.food += v;
          addLedger(h, e.ledger ?? Ledger.Event, 0, v);
          bump(deltas, 'food', v);
          break;
        }
        case 'own_money': {
          const v = evalNumber(e.value, r);
          ownMoney(ctx, e.ledger ?? Ledger.Event, v);
          bump(deltas, 'money', v);
          break;
        }
        case 'sell_food': {
          const amount = Math.floor(Math.max(0, h.food - monthlyFoodNeed(ctx) * e.keep_months) * e.share);
          if (amount <= 0) break;
          const money = amount * sellPrice(ctx) * e.price_factor;
          h.food -= amount;
          h.money += money;
          addLedger(h, e.ledger ?? Ledger.SellFood, money, -amount);
          bump(deltas, 'food', -amount);
          bump(deltas, 'money', money);
          break;
        }
        case 'debt': {
          const v = Math.max(evalNumber(e.value, r), -h.debt);
          h.debt += v;
          bump(deltas, 'debt', v);
          break;
        }
        case 'health':
        case 'stress': {
          const v = evalNumber(e.value, r);
          for (const c of targets(ctx, e.who, r)) {
            if (e.type === 'health') c.health = clamp(c.health + v, 0, healthCap(ctx, c));
            else c.stress = clamp(c.stress + v, 0, lifeBal.stress.max);
            if (c.id === state.playerId) bump(deltas, e.type, v);
          }
          break;
        }
        case 'skill_xp': {
          const v = evalNumber(e.value, r);
          for (const c of targets(ctx, e.who, r)) addSkillXp(ctx, c, e.skill, v);
          break;
        }
        case 'modifier':
          for (const c of targets(ctx, e.who, r)) {
            c.modifiers.push({
              sourceId: `event:${e.label}`,
              label: fillTemplate(e.label, r.token),
              target: e.target,
              value: e.value,
              op: e.op,
              remainingMonths: e.months,
            });
          }
          break;
        case 'set_flag':
          state.flags[e.flag] = {
            expiresAt: e.years ? state.clock.monthIndex + Math.round(e.years * content.balance.calendar.months_per_year) : null,
            label: e.label ? fillTemplate(e.label, r.token) : undefined,
          };
          break;
        case 'clear_flag':
          delete state.flags[e.flag];
          break;
        case 'opinion': {
          const c = r.character(e.role);
          if (c) addOpinionChange(ctx, c, e.value, `opinion:${ctx.state.clock.year}`);
          break;
        }
        case 'marry': {
          const partner = e.role ? r.character(e.role) : undefined;
          marryPlayer(ctx, partner);
          break;
        }
        case 'add_disease':
          for (const c of targets(ctx, e.who, r)) infectCharacter(ctx, c, e.disease);
          break;
        case 'cure_disease':
          for (const c of targets(ctx, e.who, r)) cureCharacter(ctx, c, e.disease);
          break;
        case 'reputation':
          changeReputation(ctx, e.group, e.value);
          bump(deltas, 'reputation', e.value);
          break;
        case 'favor': {
          const c = r.character(e.role);
          if (c) changeFavor(c, e.value);
          break;
        }
        case 'set_career':
          changeCareer(ctx, e.career, e.rank ?? 0);
          if (e.months !== undefined) setPlayerCareerTenure(ctx, e.months);
          break;
        case 'set_side_job':
          setSideJob(ctx, e.side_job, true);
          break;
        case 'career_merit':
          addCareerMerit(ctx, e.value);
          break;
        case 'wanted':
          addWanted(ctx, e.value);
          break;
        case 'filial_piety':
          changeFilialPiety(ctx, e.value);
          break;
        case 'scholarly_prestige':
          changeScholarlyPrestige(ctx, e.value);
          break;
        case 'set_exam_degree':
          setExamDegree(ctx, e.degree);
          break;
        case 'cutscene':
          queueCutscene(ctx, e.id);
          break;
        case 'set_ambition':
          // Đổi chí hướng thì các mốc của chí hướng cũ không còn tính
          if (state.ambition.id !== e.ambition && ctx.content.index.ambition.has(e.ambition)) {
            state.ambition = { id: e.ambition, achievedMilestones: [] };
          }
          break;
        case 'split_household':
          splitPlayerHousehold(ctx, e.share_factor ?? 1);
          break;
        case 'trigger_inheritance':
          settleInheritance(ctx, e.share_factor ?? 1);
          break;
        case 'adopt_child':
          adoptChild(ctx, e.sex, false);
          break;
        case 'adopt_relative':
          adoptDistantRelative(ctx, e.sex, false);
          break;
        case 'dynasty_prestige':
          if (state.dynasty) {
            state.dynasty.prestige = Math.max(0, state.dynasty.prestige + e.value);
          }
          break;
        case 'fulfill_wish':
          if (state.dynasty?.unfinishedWishes) {
            const targetWish = e.wishId
              ? state.dynasty.unfinishedWishes.find((w) => w.id === e.wishId && !w.fulfilled)
              : state.dynasty.unfinishedWishes.find((w) => !w.fulfilled);
            if (targetWish) {
              targetWish.fulfilled = true;
              state.dynasty.prestige += 15;
              state.happiness.ambitionBonus += 15;
            }
          }
          break;
        case 'clan_relation':
          changeClanRelation(ctx, e.clan, e.value, e.tie, e.reason);
          break;
        case 'arrange_child_marriage': {
          const members = getMarriageableMembers(ctx).filter((m) => m.id !== state.playerId && (!e.sex || m.sex === e.sex));
          const child = members[0] ?? getMarriageableMembers(ctx).find((m) => m.id !== state.playerId);
          if (child) {
            const cands = getMatchmakingCandidates(ctx, child.id);
            const picked =
              (e.status ? cands.find((x) => x.statusRankId === e.status && x.clanAccepts) : undefined) ??
              cands.find((x) => x.clanAccepts) ??
              cands[0];
            if (picked) {
              arrangeMarriage(ctx, child.id, picked.characterId);
            }
          }
          break;
        }
        case 'property_add':
          h.properties[e.property] = (h.properties[e.property] ?? 0) + e.count;
          break;
        case 'property_remove':
          h.properties[e.property] = Math.max(0, (h.properties[e.property] ?? 0) - e.count);
          break;
        case 'schedule_event':
          state.scheduled.push({
            eventId: e.event,
            dueMonthIndex: state.clock.monthIndex + e.months,
            roles: e.keep_roles ? { ...(b.roles ?? {}) } : {},
            label: e.label ? fillTemplate(e.label, r.token) : undefined,
          });
          break;
        case 'leave_household':
          for (const c of targets(ctx, e.who, r)) {
            if (c.id === state.playerId) continue;
            h.memberIds = h.memberIds.filter((id) => id !== c.id);
            c.householdId = null;
          }
          break;
        case 'add_trait':
          for (const c of targets(ctx, e.who, r)) {
            const trait = content.index.trait.get(e.trait);
            if (!trait || c.traits.includes(e.trait) || c.traits.includes(trait.opposite)) continue;
            c.traits.push(e.trait);
          }
          break;
        case 'log': {
          const text = fillTemplate(ctx.rng.get(RngStream.Ambient).pick(e.text), r.token);
          pushLog(ctx, {
            sourceId: LogKind.Memory,
            kind: LogKind.Memory,
            text,
            importance: e.importance,
            tone: 'trung_tinh',
            icon: LogKind.Memory,
            rumor: false,
            highlight: e.importance >= content.balance.display.highlight_importance,
            deltas: {},
          });
          break;
        }
        case 'chance':
          run(ctx.rng.get(RngStream.Events).chance(e.p) ? e.then : e.else);
          break;
      }
    }
  };

  run(effects);
  return deltas;
}
