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
import { addCareerMerit, addWanted, changeCareer } from '../systems/career';
import { marryPlayer } from '../systems/family';
import { addOpinionChange, changeFavor, changeReputation } from '../systems/social';
import { changeFilialPiety, changeScholarlyPrestige, setExamDegree } from '../systems/status';
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
          state.lastCutsceneId = e.id;
          break;
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
