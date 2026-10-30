// [1] Phân hệ Quan hệ xã hội, Danh tiếng & Quyền lực mềm: Bí mật, Nắm thóp, Mưu sự & Uy hiếp (GDD 03 §6)
import { clamp } from '@shared/curve';
import { fullName, type Character } from '../../entities/Character';
import { addLedger } from '../../entities/Household';
import type { GameState, HookState, SchemeKind, SecretState, SocialState } from '../../entities/World';
import { tickStoredModifiers } from '../../engine/ModifierSystem';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { RngStream, newId, type SimContext } from '../context';
import { callOf, player, playerHousehold } from '../people';
import { addSkillXp } from '../skills';

function langText(ctx: SimContext, key: string, fallback = key): string {
  const lang = ctx.content.lang[ctx.content.balance.display.default_language] ?? {};
  return lang[key] ?? fallback;
}

/** Đảm bảo nhánh trạng thái quyền lực mềm luôn được khởi tạo trên GameState. */
export function ensureSocialState(state: GameState): SocialState {
  if (!state.social) {
    state.social = {
      secrets: [],
      hooks: [],
      activeScheme: null,
      dread: 0,
    };
  }
  return state.social;
}

/** Thêm một tác động thiện cảm có nguồn và thời hạn cho NPC đối với người chơi. */
export function addOpinionChange(ctx: SimContext, c: Character, value: number, label: string, months = 60): void {
  if (!c.opinionModifiers) c.opinionModifiers = [];
  c.opinionModifiers.push({
    sourceId: `opinion:${ctx.state.clock.monthIndex}`,
    label,
    target: 'opinion',
    value,
    op: 'add',
    remainingMonths: months,
  });
  c.opinionOfPlayer = clamp(c.opinionOfPlayer + value, -100, 100);
}

/** Thay đổi danh tiếng trong một nhóm xã hội (mặc định: dan_lang). */
export function changeReputation(ctx: SimContext, group: string, delta: number): void {
  const cur = ctx.state.reputation[group] ?? 0;
  ctx.state.reputation[group] = clamp(cur + delta, -100, 100);
}

/** Thay đổi ân tình giữa NPC và người chơi (>0: họ nợ người chơi, <0: người chơi nợ họ). */
export function changeFavor(c: Character, delta: number): void {
  c.favorWithPlayer = clamp((c.favorWithPlayer ?? 0) + delta, -10, 10);
}

/** Thay đổi chỉ số Uy hiếp (Dread 0..100) của người chơi. */
export function changeDread(ctx: SimContext, delta: number): void {
  const social = ensureSocialState(ctx.state);
  social.dread = clamp(social.dread + delta, 0, 100);
}

/** Thêm một điểm nắm thóp (Hook) giữa người chơi và NPC. */
export function addHook(
  ctx: SimContext,
  spec: {
    targetId: string;
    direction: 'on_npc' | 'on_player';
    strength?: 'weak' | 'strong';
    reason?: string;
    years?: number;
  },
): HookState | null {
  const social = ensureSocialState(ctx.state);
  const target = ctx.state.characters[spec.targetId];
  if (!target || !target.alive) return null;
  const existing = social.hooks.find(
    (h) => h.targetId === spec.targetId && h.direction === spec.direction,
  );
  const strength = spec.strength ?? 'weak';
  const expiresYear = ctx.state.clock.year + (spec.years ?? 10);
  const reason = spec.reason ?? langText(ctx, 'social.hook.default_reason', 'hook');
  if (existing) {
    if (strength === 'strong') existing.strength = 'strong';
    existing.expiresYear = Math.max(existing.expiresYear, expiresYear);
    existing.reason = reason;
    return existing;
  }
  const hook: HookState = {
    id: newId(ctx, 'hk'),
    targetId: target.id,
    targetName: fullName(target),
    direction: spec.direction,
    strength,
    reason,
    expiresYear,
  };
  social.hooks.push(hook);
  if (social.hooks.length > 12) social.hooks.shift();
  return hook;
}

/** Thêm một bí mật (của bản thân hoặc của NPC mà người chơi nắm được). */
export function addSecret(
  ctx: SimContext,
  spec: {
    ownerId: string;
    kind: string;
    label?: string;
    severity?: number;
  },
): SecretState {
  const social = ensureSocialState(ctx.state);
  const isPlayer = spec.ownerId === 'player' || spec.ownerId === ctx.state.playerId;
  const ownerChar = isPlayer ? player(ctx) : ctx.state.characters[spec.ownerId];
  const ownerName = ownerChar ? fullName(ownerChar) : spec.ownerId;
  const severity = clamp(spec.severity ?? 6, 1, 10);
  const label = spec.label ?? langText(ctx, `social.secret.${spec.kind}`, spec.kind);
  const secret: SecretState = {
    id: newId(ctx, 'sec'),
    ownerId: isPlayer ? 'player' : spec.ownerId,
    ownerName,
    kind: spec.kind,
    label,
    severity,
    exposed: false,
  };
  social.secrets.push(secret);
  if (social.secrets.length > 12) social.secrets.shift();

  // Nếu nắm được bí mật của NPC thì tự động tạo một Hook nắm thóp họ
  if (!isPlayer && ownerChar?.alive) {
    addHook(ctx, {
      targetId: ownerChar.id,
      direction: 'on_npc',
      strength: severity >= 7 ? 'strong' : 'weak',
      reason: label,
      years: 12,
    });
  }
  return secret;
}

/** Phơi bày một bí mật ra ánh sáng. */
export function exposeSecret(ctx: SimContext, secretId: string): boolean {
  const social = ensureSocialState(ctx.state);
  const sec = social.secrets.find((s) => s.id === secretId && !s.exposed);
  if (!sec) return false;
  sec.exposed = true;
  const me = player(ctx);
  if (sec.ownerId === 'player' || sec.ownerId === me.id) {
    changeReputation(ctx, 'dan_lang', -sec.severity * 2);
    me.stress = clamp(me.stress + 8, 0, ctx.content.balance.life.stress.max);
    writeTemplate(ctx, SystemLog.SecretExposed, {
      params: { title: sec.label, call: fullName(me) },
    });
  } else {
    const npc = ctx.state.characters[sec.ownerId];
    if (npc) {
      addOpinionChange(ctx, npc, -20, sec.label, 60);
    }
    changeDread(ctx, 5);
    social.hooks = social.hooks.filter((h) => !(h.targetId === sec.ownerId && h.direction === 'on_npc'));
    writeTemplate(ctx, SystemLog.SecretExposed, {
      params: { title: sec.label, call: npc ? callOf(ctx, npc) : sec.ownerName },
    });
  }
  return true;
}

/** Sử dụng điểm nắm thóp (Hook) lên NPC để đòi tiền, ép ủng hộ hoặc giảm nợ. */
export function useHook(
  ctx: SimContext,
  hookId: string,
  action: 'extort_money' | 'force_support' | 'forgive_debt',
): boolean {
  const social = ensureSocialState(ctx.state);
  const idx = social.hooks.findIndex((h) => h.id === hookId && h.direction === 'on_npc');
  if (idx < 0) return false;
  const hook = social.hooks[idx];
  const npc = ctx.state.characters[hook.targetId];
  const h = playerHousehold(ctx);
  const isStrong = hook.strength === 'strong';

  if (action === 'extort_money') {
    const money = isStrong ? 12 : 5;
    h.money += money;
    addLedger(h, Ledger.Event, money, 0);
    changeDread(ctx, 6);
    if (npc) addOpinionChange(ctx, npc, -15, hook.reason, 48);
  } else if (action === 'force_support') {
    changeReputation(ctx, 'dan_lang', isStrong ? 8 : 4);
    if (npc) changeFavor(npc, isStrong ? 4 : 2);
  } else if (action === 'forgive_debt') {
    const forgiveAmt = isStrong ? 15 : 8;
    if (h.debt > 0) {
      const reduced = Math.min(h.debt, forgiveAmt);
      h.debt -= reduced;
    } else if (h.loans?.length) {
      const borrowed = h.loans.find((l) => l.kind === 'borrowed' && l.amount > 0);
      if (borrowed) {
        borrowed.amount = Math.max(0, borrowed.amount - forgiveAmt);
      }
    }
  }

  const actionTitle = langText(ctx, `social.hook_action.${action}`, action);
  writeTemplate(ctx, SystemLog.HookUsed, {
    params: {
      call: npc ? callOf(ctx, npc) : hook.targetName,
      title: actionTitle,
    },
  });

  if (isStrong) {
    hook.strength = 'weak';
  } else {
    social.hooks.splice(idx, 1);
  }
  return true;
}

/** Khởi phát một Mưu sự kéo dài nhiều tháng (Scheme 0..100%). */
export function startScheme(ctx: SimContext, kind: SchemeKind, targetId: string): boolean {
  const social = ensureSocialState(ctx.state);
  const target = ctx.state.characters[targetId];
  if (!target || !target.alive || target.id === ctx.state.playerId) return false;
  const me = player(ctx);
  const intrigue = me.skills.muu_luoc?.level ?? 0;
  const diplomacy = me.skills.ngoai_giao?.level ?? 0;
  const baseSecrecy = kind === 'ket_than' || kind === 'ung_ho_lang' ? 90 : 62 + intrigue * 5 + diplomacy * 2;
  social.activeScheme = {
    id: newId(ctx, 'sch'),
    kind,
    targetId: target.id,
    targetName: fullName(target),
    progress: 12,
    secrecy: clamp(baseSecrecy, 35, 95),
    monthsElapsed: 0,
  };
  return true;
}

/** Hủy mưu sự đang tiến hành. */
export function cancelScheme(ctx: SimContext): boolean {
  const social = ensureSocialState(ctx.state);
  if (!social.activeScheme) return false;
  social.activeScheme = null;
  return true;
}

/** Hàng tháng: giảm dần thời hạn các modifier thiện cảm của NPC & chạy tiến độ Mưu sự. */
export function monthlySocial(ctx: SimContext): void {
  for (const id of Object.values(ctx.state.village)) {
    const c = ctx.state.characters[id];
    if (!c?.alive || !c.opinionModifiers || c.opinionModifiers.length === 0) continue;
    c.opinionModifiers = tickStoredModifiers(c.opinionModifiers);
  }

  const social = ensureSocialState(ctx.state);
  if (social.dread > 0 && ctx.state.clock.monthIndex % 6 === 0) {
    social.dread = Math.max(0, social.dread - 1);
  }
  if (social.hooks.length > 0) {
    social.hooks = social.hooks.filter(
      (h) => h.expiresYear >= ctx.state.clock.year && ctx.state.characters[h.targetId]?.alive,
    );
  }

  const scheme = social.activeScheme;
  if (!scheme) return;
  const target = ctx.state.characters[scheme.targetId];
  if (!target || !target.alive) {
    social.activeScheme = null;
    return;
  }

  const me = player(ctx);
  const rng = ctx.rng.get(RngStream.Social);
  scheme.monthsElapsed += 1;
  const intrigue = me.skills.muu_luoc?.level ?? 0;
  const diplomacy = me.skills.ngoai_giao?.level ?? 0;
  const covert = scheme.kind === 'tim_bi_mat' || scheme.kind === 'boi_nho' || scheme.kind === 'ep_hon_su';
  const exposeChance = covert ? clamp((100 - scheme.secrecy) * 0.0025, 0.015, 0.2) : 0;

  if (covert && rng.chance(exposeChance)) {
    const title = langText(ctx, `social.scheme.${scheme.kind}`, scheme.kind);
    addOpinionChange(ctx, target, -15, title, 48);
    changeReputation(ctx, 'dan_lang', -4);
    writeTemplate(ctx, SystemLog.SchemeFailed, {
      params: { title, call: callOf(ctx, target) },
    });
    social.activeScheme = null;
    return;
  }

  const gain =
    18 +
    intrigue * 4 +
    (scheme.kind === 'ket_than' || scheme.kind === 'ung_ho_lang' ? diplomacy * 4 : 0);
  scheme.progress = clamp(scheme.progress + gain, 0, 100);

  if (scheme.progress >= 100) {
    const title = langText(ctx, `social.scheme.${scheme.kind}`, scheme.kind);
    if (scheme.kind === 'tim_bi_mat') {
      addSecret(ctx, {
        ownerId: target.id,
        kind: 'gian_lan',
        severity: 8,
      });
    } else if (scheme.kind === 'boi_nho') {
      changeDread(ctx, 8);
      changeReputation(ctx, 'dan_lang', 4);
      ctx.state.career.merit += 8;
    } else if (scheme.kind === 'ket_than') {
      addOpinionChange(ctx, target, 25, title, 72);
      changeFavor(target, 3);
    } else if (scheme.kind === 'ung_ho_lang') {
      changeReputation(ctx, 'dan_lang', 10);
      changeFavor(target, 2);
    } else if (scheme.kind === 'ep_hon_su') {
      addHook(ctx, {
        targetId: target.id,
        direction: 'on_npc',
        strength: 'strong',
        reason: title,
        years: 10,
      });
      changeFavor(target, 4);
    }
    addSkillXp(ctx, me, 'muu_luoc', 18);
    writeTemplate(ctx, SystemLog.SchemeSucceeded, {
      params: { title, call: callOf(ctx, target) },
    });
    social.activeScheme = null;
  }
}
