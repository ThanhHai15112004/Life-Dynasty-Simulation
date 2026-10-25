// Kiểm tra chéo toàn bộ src/data/ sau khi qua Zod: id tham chiếu, biến DSL, token văn bản, chỉ số modifier
import type { ContentBundle } from '@content/ContentLoader';
import type { Condition, Effect, RoleSpec } from '@content/schemas';
import { GameSession } from '@core/api/GameSession';
import { evaluate, UnknownVariableError } from '@core/engine/RuleEvaluator';
import { isKnownTarget } from '@core/engine/statTargets';
import { Ledger, SystemLog } from '@core/events/systemLogKeys';
import { createResolver } from '@core/systems/resolver';
import { templateTokens } from '@shared/template';

/** Tham số hệ thống truyền vào mẫu nhật ký (xem các lời gọi writeTemplate trong src/core). */
const SYSTEM_PARAMS = new Set(['age', 'amount', 'sao', 'food', 'money', 'skill', 'level', 'stage', 'call', 'cause', 'title', 'items']);

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

/** Id khai báo ở public/assets (không thuộc ContentBundle): chủ đề hoạt cảnh, địa điểm cảnh. */
export interface AssetIds {
  cutsceneThemes: string[];
  sceneLocations: string[];
}

export function validateContent(content: ContentBundle, assets?: AssetIds): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const idx = content.index;
  const skillIds = [...idx.skill.keys()];
  const origin = content.origins[0];
  const villageRoles = new Set(content.origins.flatMap((o) => o.village_npcs.map((n) => n.role)));
  const stageIds = new Set(idx.lifeStage.keys());

  const need = (ok: boolean, msg: string) => {
    if (!ok) errors.push(msg);
  };
  const target = (t: string, where: string) => need(isKnownTarget(t, skillIds), `${where}: chỉ số modifier lạ "${t}"`);
  const skill = (s: string, where: string) => need(idx.skill.has(s), `${where}: kỹ năng lạ "${s}"`);
  const trait = (t: string, where: string) => need(idx.trait.has(t), `${where}: tính cách lạ "${t}"`);
  const property = (p: string, where: string) => need(idx.property.has(p), `${where}: tài sản lạ "${p}"`);
  const disease = (d: string, where: string) => need(idx.disease.has(d), `${where}: bệnh lạ "${d}"`);
  const career = (c: string, where: string) => need(idx.career.has(c), `${where}: nghề lạ "${c}"`);
  const template = (id: string, where: string) => need(idx.ambient.has(id), `${where}: thiếu mẫu nhật ký "${id}"`);
  const lang = content.lang[content.balance.display.default_language] ?? {};
  const ledger = (id: string, where: string) => need(`ledger.${id}` in lang, `${where}: danh mục sổ sách lạ "${id}" (thiếu ledger.${id} trong lang)`);
  const cutscene = (id: string | undefined, where: string) => {
    if (!id) return;
    need(`cutscene.${id}.title` in lang, `${where}: hoạt cảnh "${id}" thiếu chữ cutscene.${id}.title trong lang`);
    if (assets) need(assets.cutsceneThemes.includes(id), `${where}: hoạt cảnh "${id}" chưa có chủ đề trong cutscenes.json`);
  };
  const income = (spec: { skill?: string; ledger: string } | undefined, where: string) => {
    if (!spec) return;
    if (spec.skill) skill(spec.skill, where);
    ledger(spec.ledger, where);
  };

  // ── Id tham chiếu ──
  for (const t of content.traits) trait(t.opposite, `traits.${t.id}.opposite`);
  for (const t of content.traits) t.modifiers.forEach((m) => target(m.target, `traits.${t.id}`));
  for (const d of content.diseases) {
    d.modifiers.forEach((m) => target(m.target, `diseases.${d.id}`));
    if (d.mortality_cause) {
      need(
        content.balance.life.mortality.causes.some((c) => c.id === d.mortality_cause),
        `diseases.${d.id}: mortality_cause lạ "${d.mortality_cause}"`,
      );
    }
  }
  for (const a of content.ambitions) {
    a.traits.forEach((t) => trait(t, `ambitions.${a.id}.traits`));
  }
  for (const f of content.focuses) {
    Object.keys(f.skill_xp).forEach((s) => skill(s, `focuses.${f.id}.skill_xp`));
    f.modifiers.forEach((m) => target(m.target, `focuses.${f.id}`));
    income(f.income, `focuses.${f.id}.income`);
    f.life_stages.forEach((st) => need(stageIds.has(st), `focuses.${f.id}: giai đoạn đời lạ "${st}"`));
  }
  for (const p of content.properties) p.modifiers.forEach((m) => target(m.target, `properties.${p.id}`));
  for (const l of content.balance.living_standards.levels) l.modifiers.forEach((m) => target(m.target, `living_standards.${l.id}`));
  for (const c of content.balance.modifiers.conditional) target(c.target, `modifiers.${c.id}`);
  need(idx.livingStandard.has(content.balance.living_standards.default), 'living_standards.default: mức sống lạ');
  skill(content.balance.economy.harvest.skill, 'economy.harvest.skill');
  for (const q of content.balance.economy.harvest_qualities) {
    template(q.harvest_log, `harvest_qualities.${q.id}.harvest_log`);
    template(q.quiet_year_log, `harvest_qualities.${q.id}.quiet_year_log`);
    cutscene(q.cutscene, `harvest_qualities.${q.id}.cutscene`);
  }
  cutscene(content.balance.life.marriage.wedding_cutscene, 'life.marriage.wedding_cutscene');
  cutscene(content.balance.life.marriage.birth_cutscene, 'life.marriage.birth_cutscene');
  Object.values(Ledger).forEach((id) => ledger(id, 'systemLogKeys.Ledger'));
  const alertIds = content.balance.opportunity.military_alerts.map((a) => a.id);
  need(content.balance.opportunity.trade.monthly_factor.length === content.balance.calendar.months_per_year, 'opportunity.trade.monthly_factor: phải đủ số tháng');
  Object.keys(content.balance.opportunity.trade.harvest_bump).forEach((q) =>
    need(idx.harvestQuality.has(q), `opportunity.trade.harvest_bump: chất lượng mùa lạ "${q}"`),
  );
  need(new Set(alertIds).size === alertIds.length, 'opportunity.military_alerts: trùng id');
  for (const ch of content.chronicle.entries) {
    const w = `chronicle.${ch.id}`;
    if (ch.military_alert) need(alertIds.includes(ch.military_alert.id), `${w}: động tĩnh quân sự lạ "${ch.military_alert.id}"`);
    if (ch.harvest_quality) need(idx.harvestQuality.has(ch.harvest_quality), `${w}: chất lượng mùa lạ "${ch.harvest_quality}"`);
    need(ch.years[0] <= ch.years[1], `${w}: khoảng năm ngược`);
  }
  for (const st of content.settlementTypes) {
    if (st.scene_location && assets) need(assets.sceneLocations.includes(st.scene_location), `settlement_types.${st.id}: địa điểm cảnh lạ "${st.scene_location}"`);
  }
  template(content.balance.director.ambient.digest_template, 'director.ambient.digest_template');
  Object.values(SystemLog).forEach((id) => template(id, 'systemLogKeys'));
  for (const st of content.balance.life.life_stages) {
    st.default_focuses.forEach((f) => need(idx.focus.has(f), `life.life_stages.${st.id}.default_focuses: trọng tâm lạ "${f}"`));
  }
  const autoRules = content.balance.living_standards.auto_rules;
  for (const r of autoRules) need(idx.livingStandard.has(r.level), `living_standards.auto_rules: mức sống lạ "${r.level}"`);
  need(!autoRules[autoRules.length - 1].condition, 'living_standards.auto_rules: luật cuối phải không có điều kiện (mặc định)');
  content.balance.display.focus_hints.forEach((h) => target(h.target, 'display.focus_hints'));
  for (const g of content.balance.life.age_groups) {
    need(g.id in content.balance.economy.consumption_by_age_group, `economy.consumption_by_age_group: thiếu nhóm tuổi "${g.id}"`);
  }
  for (const m of content.balance.calendar.months) {
    need(content.balance.calendar.seasons.some((s) => s.id === m.season), `calendar.months.${m.month}: mùa lạ "${m.season}"`);
    m.weather.forEach((w) => need(content.balance.calendar.weathers.some((x) => x.id === w.id), `calendar.months.${m.month}: thời tiết lạ "${w.id}"`));
  }
  need(content.balance.calendar.months.length === content.balance.calendar.months_per_year, 'calendar: số tháng khai báo khác months_per_year');
  need(content.balance.economy.price.monthly_factor.length === content.balance.calendar.months_per_year, 'economy.price.monthly_factor: phải đủ số tháng');

  for (const o of content.origins) {
    need(idx.culture.has(o.culture), `origins.${o.id}: văn hóa lạ "${o.culture}"`);
    need(idx.focus.has(o.default_focus), `origins.${o.id}: default_focus lạ`);
    career(o.default_career, `origins.${o.id}.default_career`);
    need(idx.settlementType.has(o.settlement), `origins.${o.id}: khu định cư lạ "${o.settlement}"`);
    if (o.start_log) template(o.start_log, `origins.${o.id}.start_log`);
    need(idx.livingStandard.has(o.household.living_standard), `origins.${o.id}: mức sống lạ`);
    o.household.properties.forEach((p) => property(p.id, `origins.${o.id}.household`));
    Object.keys(o.player.skills).forEach((s) => skill(s, `origins.${o.id}.player.skills`));
    const culture = idx.culture.get(o.culture);
    o.village_npcs.forEach((n) => need(!!culture?.village_roles[n.role], `cultures.${o.culture}: thiếu cách gọi vai trò "${n.role}"`));
  }

  const checkRole = (r: RoleSpec, where: string) => {
    if (r.from === 'village') need(!!r.village_role && villageRoles.has(r.village_role), `${where}: vai trò làng lạ "${r.village_role}"`);
  };
  const checkEffects = (list: readonly Effect[], where: string, roles: Set<string>) => {
    for (const e of list) {
      const w = `${where}.${e.type}`;
      if ('who' in e && !['player', 'household'].includes(e.who) && !roles.has(e.who)) errors.push(`${w}: "${e.who}" không phải vai trò của sự kiện`);
      if (e.type === 'opinion' && !roles.has(e.role)) errors.push(`${w}: vai trò lạ "${e.role}"`);
      if (e.type === 'favor' && !roles.has(e.role)) errors.push(`${w}: vai trò lạ "${e.role}"`);
      if (e.type === 'marry' && e.role && !roles.has(e.role)) errors.push(`${w}: vai trò lạ "${e.role}"`);
      if (e.type === 'add_disease') disease(e.disease, w);
      if (e.type === 'cure_disease' && e.disease) disease(e.disease, w);
      if (e.type === 'set_career') career(e.career, w);
      if (e.type === 'skill_xp') skill(e.skill, w);
      if (e.type === 'modifier') target(e.target, w);
      if (e.type === 'property_add' || e.type === 'property_remove') property(e.property, w);
      if (e.type === 'add_trait') trait(e.trait, w);
      if (e.type === 'schedule_event') need(idx.event.has(e.event), `${w}: sự kiện lạ "${e.event}"`);
      if (e.type === 'cutscene') cutscene(e.id, w);
      if (e.type === 'set_ambition') need(idx.ambition.has(e.ambition), `${w}: chí hướng lạ "${e.ambition}"`);
      if ((e.type === 'money' || e.type === 'food' || e.type === 'debt') && e.ledger) ledger(e.ledger, w);
      if (e.type === 'chance') {
        checkEffects(e.then, where, roles);
        checkEffects(e.else, where, roles);
      }
    }
  };

  for (const ev of content.events) {
    const roles = new Set(ev.roles.map((r) => r.id));
    ev.roles.forEach((r) => checkRole(r, `events.${ev.id}`));
    ev.life_stages?.forEach((s) => need(stageIds.has(s), `events.${ev.id}: giai đoạn đời lạ "${s}"`));
    for (const o of ev.options) {
      const w = `events.${ev.id}.${o.id}`;
      checkEffects([...o.effects, ...o.success, ...o.failure], w, roles);
      Object.keys(o.trait_stress).forEach((t) => trait(t, `${w}.trait_stress`));
      if (o.chance?.skill) skill(o.chance.skill, `${w}.chance`);
      if (o.chance && o.success.length + o.failure.length + o.success_result.length === 0) warnings.push(`${w}: có chance nhưng không có hậu quả thành/bại`);
    }
    if (ev.scheduled_only && !content.events.some((x) => x.options.some((o) => [...o.effects, ...o.success, ...o.failure].some((e) => e.type === 'schedule_event' && e.event === ev.id)))) {
      warnings.push(`events.${ev.id}: scheduled_only nhưng không sự kiện nào hẹn tới`);
    }
  }
  for (const t of content.ambient) {
    const roles = new Set(t.roles.map((r) => r.id));
    t.roles.forEach((r) => checkRole(r, `ambient.${t.id}`));
    t.life_stages?.forEach((s) => need(stageIds.has(s), `ambient.${t.id}: giai đoạn đời lạ "${s}"`));
    Object.keys(t.trait_reactions).forEach((x) => trait(x, `ambient.${t.id}.trait_reactions`));
    checkEffects(t.effects, `ambient.${t.id}`, roles);
  }
  for (const c of content.careers) {
    income(c.economy.income, `careers.${c.id}.economy.income`);
    if (c.default_focus) need(idx.focus.has(c.default_focus), `careers.${c.id}.default_focus: trọng tâm lạ "${c.default_focus}"`);
    for (const r of c.ranks) {
      r.modifiers.forEach((m) => target(m.target, `careers.${c.id}.ranks.${r.id}`));
    }
    for (const act of c.actions) {
      const w = `careers.${c.id}.actions.${act.id}`;
      if (act.chance?.skill) skill(act.chance.skill, `${w}.chance`);
      checkEffects([...act.success, ...act.failure], w, new Set());
    }
  }
  for (const ch of content.chronicle.entries) checkEffects(ch.effects, `chronicle.${ch.id}`, new Set());
  for (const civ of content.civilizations) {
    for (const deg of civ.exam_degrees) {
      deg.modifiers.forEach((m) => target(m.target, `civilizations.${civ.id}.exam_degrees.${deg.id}`));
    }
    civ.status_ranks.forEach((r) => r.modifiers.forEach((m) => target(m.target, `civilizations.${civ.id}.status_ranks.${r.id}`)));
    skill(civ.exam_skill, `civilizations.${civ.id}.exam_skill`);
    cutscene(civ.cutscenes.exam_passed, `civilizations.${civ.id}.cutscenes.exam_passed`);
    cutscene(civ.cutscenes.mourning, `civilizations.${civ.id}.cutscenes.mourning`);
    need(civ.metropolitan_exam_offset_years < civ.exam_interval_years, `civilizations.${civ.id}: thi Hội phải mở trước khoa thi Hương kế tiếp`);
  }

  // ── Chạy thử điều kiện DSL và token văn bản trên một ván thật ──
  if (!origin) return { errors: [...errors, 'Không có xuất thân nào'], warnings };
  let session: GameSession;
  try {
    session = GameSession.create(content, { seed: 'validate' });
  } catch (e) {
    if (e instanceof UnknownVariableError) return { errors: [...errors, `Không tạo được ván thử — biến DSL lạ "${e.path}"`], warnings };
    throw e;
  }
  session.read((ctx) => {
    const tryCond = (cond: Condition | undefined, where: string, roleIds: string[]) => {
      if (!cond) return;
      const roles = Object.fromEntries(roleIds.map((r) => [r, ctx.state.playerId]));
      try {
        evaluate(cond, createResolver(ctx, { self: ctx.state.playerId, roles }));
      } catch (e) {
        if (e instanceof UnknownVariableError) errors.push(`${where}: biến DSL lạ "${e.path}"`);
        else throw e;
      }
    };
    const tryText = (text: string, where: string, roleIds: string[], allowParams: boolean) => {
      const roles = Object.fromEntries(roleIds.map((r) => [r, ctx.state.playerId]));
      const r = createResolver(ctx, { self: ctx.state.playerId, roles });
      for (const tok of templateTokens(text)) {
        if (allowParams && SYSTEM_PARAMS.has(tok)) continue;
        if (r.token(tok) === undefined) warnings.push(`${where}: token không phân giải được "{${tok}}"`);
      }
    };

    for (const ev of content.events) {
      const ids = ev.roles.map((r) => r.id);
      tryCond(ev.condition, `events.${ev.id}`, ids);
      ev.weight_modifiers.forEach((m, i) => tryCond(m.condition, `events.${ev.id}.weight_modifiers[${i}]`, ids));
      ev.roles.forEach((r) => tryCond(r.condition, `events.${ev.id}.roles.${r.id}`, ids));
      [ev.title, ...ev.text].forEach((t) => tryText(t, `events.${ev.id}`, ids, false));
      for (const o of ev.options) {
        tryCond(o.condition, `events.${ev.id}.${o.id}`, ids);
        o.chance?.modifiers.forEach((m) => tryCond(m.condition, `events.${ev.id}.${o.id}.chance`, ids));
        [o.text, o.hint ?? '', ...o.result, ...o.success_result, ...o.failure_result].forEach((t) => tryText(t, `events.${ev.id}.${o.id}`, ids, false));
      }
    }
    for (const t of content.ambient) {
      const ids = t.roles.map((r) => r.id);
      const sys = t.kind === 'he_thong' || t.id.startsWith('sys.');
      tryCond(t.condition, `ambient.${t.id}`, ids);
      t.weight_modifiers.forEach((m, i) => tryCond(m.condition, `ambient.${t.id}.weight_modifiers[${i}]`, ids));
      t.roles.forEach((r) => tryCond(r.condition, `ambient.${t.id}.roles.${r.id}`, ids));
      [...t.variants, t.short ?? '', ...Object.values(t.trait_reactions)].forEach((x) => tryText(x, `ambient.${t.id}`, ids, sys));
    }
    for (const c of content.balance.modifiers.conditional) tryCond(c.condition, `modifiers.${c.id}`, []);
    for (const c of content.balance.life.mortality.causes) {
      tryCond(c.condition, `mortality.${c.id}`, []);
      c.weight_modifiers.forEach((m, i) => tryCond(m.condition, `mortality.${c.id}.weight_modifiers[${i}]`, []));
    }
    for (const f of content.focuses) tryCond(f.condition, `focuses.${f.id}`, []);
    content.balance.living_standards.auto_rules.forEach((r, i) => tryCond(r.condition, `living_standards.auto_rules[${i}]`, []));
    for (const d of content.diseases) tryCond(d.condition, `diseases.${d.id}`, []);
    for (const a of content.ambitions) {
      tryCond(a.condition, `ambitions.${a.id}`, []);
      a.milestones.forEach((m) => tryCond(m.condition, `ambitions.${a.id}.${m.id}`, []));
    }
    for (const c of content.careers) {
      tryCond(c.entry_condition, `careers.${c.id}.entry_condition`, []);
      c.ranks.forEach((r) => tryCond(r.condition, `careers.${c.id}.ranks.${r.id}`, []));
      for (const act of c.actions) {
        const w = `careers.${c.id}.actions.${act.id}`;
        tryCond(act.condition, w, []);
        act.chance?.modifiers.forEach((m) => tryCond(m.condition, `${w}.chance`, []));
        [...act.success_log, ...act.failure_log].forEach((t) => tryText(t, w, [], false));
      }
    }
    for (const [i, r] of [...content.balance.scene.condition_rules, ...content.balance.scene.particle_rules].entries()) {
      tryCond(r.condition, `scene.rules[${i}]`, []);
    }
    for (const civ of content.civilizations) civ.status_ranks.forEach((r) => tryCond(r.condition, `civilizations.${civ.id}.status_ranks.${r.id}`, []));
    for (const ch of content.chronicle.entries) {
      tryCond(ch.condition, `chronicle.${ch.id}`, []);
      ch.text.forEach((t) => tryText(t, `chronicle.${ch.id}`, [], false));
    }
    content.balance.life.happiness.value_rules.forEach((r, i) => tryCond(r.condition, `life.happiness.value_rules[${i}]`, []));
    for (const axis of content.balance.life.summary_axes) {
      for (const t of axis.terms) {
        try {
          createResolver(ctx).get(t.var);
        } catch (e) {
          if (e instanceof UnknownVariableError) errors.push(`life.summary_axes.${axis.id}: biến DSL lạ "${t.var}"`);
          else throw e;
        }
      }
    }
  });

  return { errors, warnings };
}
