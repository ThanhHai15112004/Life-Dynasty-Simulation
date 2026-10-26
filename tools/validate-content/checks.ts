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
const SYSTEM_PARAMS = new Set([
  'age',
  'amount',
  'sao',
  'food',
  'money',
  'debt',
  'skill',
  'level',
  'stage',
  'call',
  'cause',
  'title',
  'items',
  'prev',
  'generation',
  'ancestor',
  'partner',
  'clan',
]);

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
  for (const p of content.properties) {
    p.modifiers.forEach((m) => target(m.target, `properties.${p.id}`));
    if (p.upgrade_from) property(p.upgrade_from, `properties.${p.id}.upgrade_from`);
  }
  for (const v of content.ventures) {
    skill(v.skill, `ventures.${v.id}.skill`);
    v.settlement_types.forEach((st) => need(idx.settlementType.has(st), `ventures.${v.id}.settlement_types: khu định cư lạ "${st}"`));
    if (v.upgrade_to) need(idx.venture.has(v.upgrade_to), `ventures.${v.id}.upgrade_to: cơ nghiệp lạ "${v.upgrade_to}"`);
    v.modifiers.forEach((m) => target(m.target, `ventures.${v.id}.modifiers`));
  }
  for (const l of content.balance.living_standards.levels) l.modifiers.forEach((m) => target(m.target, `living_standards.${l.id}`));
  for (const c of content.balance.modifiers.conditional) target(c.target, `modifiers.${c.id}`);
  need(idx.livingStandard.has(content.balance.living_standards.default), 'living_standards.default: mức sống lạ');
  skill(content.balance.economy.harvest.skill, 'economy.harvest.skill');
  for (const q of content.balance.economy.harvest_qualities) {
    template(q.harvest_log, `harvest_qualities.${q.id}.harvest_log`);
    template(q.quiet_year_log, `harvest_qualities.${q.id}.quiet_year_log`);
    cutscene(q.cutscene, `harvest_qualities.${q.id}.cutscene`);
  }
  // [1] Kiểm tra kịch bản thử nghiệm & [2] Chế độ số phận + Chế độ chơi (Dynasty / One Life)
  need(idx.fateMode.has(content.balance.fate_modes.default_mode), `fate_modes.default_mode: chế độ số phận lạ "${content.balance.fate_modes.default_mode}"`);
  need(idx.playMode.has(content.balance.fate_modes.default_play_mode), `fate_modes.default_play_mode: chế độ chơi lạ "${content.balance.fate_modes.default_play_mode}"`);
  for (const fm of content.balance.fate_modes.modes) {
    need(fm.name_key in lang, `fate_modes.${fm.id}: thiếu chữ ${fm.name_key} trong lang`);
    need(fm.desc_key in lang, `fate_modes.${fm.id}: thiếu chữ ${fm.desc_key} trong lang`);
  }
  for (const pm of content.balance.fate_modes.play_modes) {
    need(pm.name_key in lang, `play_modes.${pm.id}: thiếu chữ ${pm.name_key} trong lang`);
    need(pm.desc_key in lang, `play_modes.${pm.id}: thiếu chữ ${pm.desc_key} trong lang`);
  }
  for (const sc of content.scenarios) {
    const w = `scenarios.${sc.id}`;
    need(idx.origin.has(sc.base.originId), `${w}: origin lạ "${sc.base.originId}"`);
    if (sc.base.fateMode) need(idx.fateMode.has(sc.base.fateMode), `${w}: fateMode lạ "${sc.base.fateMode}"`);
    if (sc.base.playMode) need(idx.playMode.has(sc.base.playMode), `${w}: playMode lạ "${sc.base.playMode}"`);
    need(sc.title_key in lang, `${w}: thiếu chữ ${sc.title_key} trong lang`);
    need(sc.description_key in lang, `${w}: thiếu chữ ${sc.description_key} trong lang`);
    if (sc.start_event) need(idx.event.has(sc.start_event), `${w}: start_event lạ "${sc.start_event}"`);
    if (sc.world_setup?.harvestQuality) need(idx.harvestQuality.has(sc.world_setup.harvestQuality), `${w}: harvestQuality lạ "${sc.world_setup.harvestQuality}"`);
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
  const budget = content.balance.living_standards.auto_budget;
  need(idx.livingStandard.has(budget.debt_cap_level), `living_standards.auto_budget.debt_cap_level: mức sống lạ "${budget.debt_cap_level}"`);
  budget.manual_only.forEach((l) => need(idx.livingStandard.has(l), `living_standards.auto_budget.manual_only: mức sống lạ "${l}"`));
  content.balance.economy.auto_invest.forEach((r, i) => property(r.property, `economy.auto_invest[${i}]`));
  const purse = content.balance.economy.purse;
  Object.keys(purse.pocket_money_month).forEach((l) => need(idx.livingStandard.has(l), `economy.purse.pocket_money_month: mức sống lạ "${l}"`));
  [...purse.income_ledgers, ...content.balance.economy.income_ledgers, ...content.balance.economy.transfer_ledgers, ...Object.values(Ledger)].forEach((l) =>
    ledger(l, 'economy (sổ sách)'),
  );
  content.balance.display.family_bands.forEach((b) => need(b.key in lang, `display.family_bands: thiếu chữ "${b.key}" trong lang`));
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
      if (e.type === 'set_side_job') need(idx.sideJob.has(e.side_job), `${w}: nghề tay trái lạ "${e.side_job}"`);
      if (e.type === 'skill_xp') skill(e.skill, w);
      if (e.type === 'modifier') target(e.target, w);
      if (e.type === 'property_add' || e.type === 'property_remove') property(e.property, w);
      if (e.type === 'venture_add') need(idx.venture.has(e.venture), `${w}: cơ nghiệp lạ "${e.venture}"`);
      if (e.type === 'venture_remove' && e.venture) need(idx.venture.has(e.venture), `${w}: cơ nghiệp lạ "${e.venture}"`);
      if (e.type === 'venture_health' && e.venture) need(idx.venture.has(e.venture), `${w}: cơ nghiệp lạ "${e.venture}"`);
      if (e.type === 'upgrade_house' && e.target) property(e.target, w);
      if (e.type === 'relocate_settlement') need(idx.settlementType.has(e.settlement), `${w}: khu định cư lạ "${e.settlement}"`);
      if (e.type === 'start_trip') need(idx.settlementType.has(e.target), `${w}: khu định cư lạ "${e.target}"`);
      if (e.type === 'trigger_epidemic') {
        if (e.settlement) need(idx.settlementType.has(e.settlement), `${w}: khu định cư lạ "${e.settlement}"`);
        if (e.disease) disease(e.disease, w);
      }
      if (e.type === 'npc_loan_add' && e.role && !roles.has(e.role)) errors.push(`${w}: vai trò lạ "${e.role}"`);
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
    c.skills.forEach((s) => skill(s, `careers.${c.id}.skills`));
    c.settlement_types.forEach((st) => need(idx.settlementType.has(st), `careers.${c.id}.settlement_types: khu định cư lạ "${st}"`));
    Object.keys(c.work_effects?.skill_xp ?? {}).forEach((s) => skill(s, `careers.${c.id}.work_effects.skill_xp`));
    c.exits.forEach((ex) => career(ex.to, `careers.${c.id}.exits`));
    for (const r of c.ranks) {
      r.modifiers.forEach((m) => target(m.target, `careers.${c.id}.ranks.${r.id}`));
      if (r.min_skill) skill(r.min_skill.skill, `careers.${c.id}.ranks.${r.id}.min_skill`);
    }
    for (const act of c.actions) {
      const w = `careers.${c.id}.actions.${act.id}`;
      if (act.chance?.skill) skill(act.chance.skill, `${w}.chance`);
      checkEffects([...act.success, ...act.failure], w, new Set());
    }
  }
  const seasonIds = new Set(content.balance.calendar.seasons.map((s) => s.id));
  for (const sj of content.sideJobs) {
    sj.seasons.forEach((s) => need(seasonIds.has(s), `side_jobs.${sj.id}.seasons: mùa lạ "${s}"`));
    sj.settlement_types.forEach((st) => need(idx.settlementType.has(st), `side_jobs.${sj.id}.settlement_types: khu định cư lạ "${st}"`));
    Object.keys(sj.skill_xp ?? {}).forEach((s) => skill(s, `side_jobs.${sj.id}.skill_xp`));
  }
  for (const [upKey, pool] of Object.entries(content.balance.life.career_v2.upbringing_career_pools)) {
    pool.forEach((cId) => career(cId, `life.career_v2.upbringing_career_pools.${upKey}`));
  }
  for (const sc of content.scenarios) {
    const w = `scenarios.${sc.id}`;
    checkEffects(sc.setup, `${w}.setup`, new Set());
    const f = sc.family_setup;
    if (f) {
      if (f.father_career) career(f.father_career, `${w}.family_setup.father_career`);
      if (f.mother_career) career(f.mother_career, `${w}.family_setup.mother_career`);
      if (f.spouse_career) career(f.spouse_career, `${w}.family_setup.spouse_career`);
      f.siblings?.forEach((s, i) => {
        if (s.career) career(s.career, `${w}.family_setup.siblings[${i}].career`);
      });
      f.children?.forEach((ch, i) => {
        if (ch.career) career(ch.career, `${w}.family_setup.children[${i}].career`);
      });
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
    content.balance.economy.auto_invest.forEach((r, i) => tryCond(r.condition, `economy.auto_invest[${i}]`, []));
    for (const d of content.diseases) tryCond(d.condition, `diseases.${d.id}`, []);
    for (const a of content.ambitions) {
      tryCond(a.condition, `ambitions.${a.id}`, []);
      a.milestones.forEach((m) => tryCond(m.condition, `ambitions.${a.id}.${m.id}`, []));
    }
    for (const c of content.careers) {
      tryCond(c.entry_condition, `careers.${c.id}.entry_condition`, []);
      c.ranks.forEach((r) => tryCond(r.condition, `careers.${c.id}.ranks.${r.id}`, []));
      c.exits.forEach((ex) => tryCond(ex.condition, `careers.${c.id}.exits.${ex.to}`, []));
      for (const act of c.actions) {
        const w = `careers.${c.id}.actions.${act.id}`;
        tryCond(act.condition, w, []);
        act.chance?.modifiers.forEach((m) => tryCond(m.condition, `${w}.chance`, []));
        [...act.success_log, ...act.failure_log].forEach((t) => tryText(t, w, [], false));
      }
    }
    for (const sj of content.sideJobs) {
      tryCond(sj.condition, `side_jobs.${sj.id}.condition`, []);
    }
    for (const v of content.ventures) {
      tryCond(v.condition, `ventures.${v.id}.condition`, []);
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

  // ── [9] Kiểm tra đồng bộ khóa ngôn ngữ (vi.json ↔ en.json) ──
  const defaultLangId = content.balance.display.default_language;
  const baseLang = content.lang[defaultLangId] ?? {};
  const baseKeys = Object.keys(baseLang);
  for (const [langId, dict] of Object.entries(content.lang)) {
    if (langId === defaultLangId) continue;
    const missing = baseKeys.filter((k) => !(k in dict));
    if (missing.length > 0) {
      errors.push(
        `lang/${langId}.json: thiếu ${missing.length} khóa so với ${defaultLangId}.json (ví dụ: ${missing.slice(0, 5).join(', ')})`,
      );
    }
  }

  // ── [9] Kiểm tra độ dày nội dung theo ngưỡng trong director.yaml (Content Density Backlog) ──
  checkContentDensity(content, warnings);

  return { errors, warnings };
}

/** Kiểm tra một biểu thức điều kiện DSL có nhắc tới biến nằm trong `vars` với giá trị `val` hay không. */
function conditionMentions(cond: Condition | undefined, vars: readonly string[], val: string): boolean {
  if (!cond) return false;
  if ('all' in cond) return cond.all.some((c) => conditionMentions(c, vars, val));
  if ('any' in cond) return cond.any.some((c) => conditionMentions(c, vars, val));
  if ('not' in cond) return conditionMentions(cond.not, vars, val);
  if ('var' in cond) {
    if (!vars.includes(cond.var)) return false;
    if (cond.value === val) return true;
    if (Array.isArray(cond.value) && (cond.value as unknown[]).includes(val)) return true;
  }
  return false;
}

/**
 * [9] Cảnh báo khi một nghề, giai đoạn đời hoặc xuất thân có ít sự kiện hơn ngưỡng trong data.
 * Danh sách cảnh báo này chính là danh sách việc viết nội dung (Content Backlog).
 */
function checkContentDensity(content: ContentBundle, warnings: string[]): void {
  const density = content.balance.director.content_density;
  if (!density) return;

  // 1) Kiểm tra theo xuất thân (Origin)
  for (const origin of content.origins) {
    const count = content.events.filter(
      (ev) =>
        conditionMentions(ev.condition, ['player.origin'], origin.id) ||
        ev.weight_modifiers.some((m) => conditionMentions(m.condition, ['player.origin'], origin.id)) ||
        conditionMentions(ev.condition, ['player.career', 'household.career'], origin.default_career),
    ).length;
    if (count < density.min_events_per_origin) {
      warnings.push(
        `[Độ dày nội dung] Xuất thân "${origin.id}" (${origin.name}) chỉ có ${count}/${density.min_events_per_origin} sự kiện quyết định liên quan.`,
      );
    }
  }

  // 2) Kiểm tra theo giai đoạn đời (Life Stage)
  for (const stage of content.balance.life.life_stages) {
    if (stage.decisions) {
      const count = content.events.filter((ev) => ev.life_stages?.includes(stage.id)).length;
      if (count < density.min_events_per_life_stage) {
        warnings.push(
          `[Độ dày nội dung] Giai đoạn đời "${stage.id}" (${stage.name}) chỉ có ${count}/${density.min_events_per_life_stage} sự kiện quyết định gắn nhãn giai đoạn này.`,
        );
      }
    } else {
      const count = content.ambient.filter((t) => t.life_stages?.includes(stage.id)).length;
      if (count < density.min_events_per_life_stage) {
        warnings.push(
          `[Độ dày nội dung] Giai đoạn đời "${stage.id}" (${stage.name}) chỉ có ${count}/${density.min_events_per_life_stage} mẫu nhật ký gắn nhãn giai đoạn này.`,
        );
      }
    }
  }

  // 3) Kiểm tra theo nghề nghiệp (Career) dựa trên độ sâu (sau / vua / nhe)
  const careerVars = ['player.career', 'household.career'] as const;
  for (const career of content.careers) {
    if (career.kind !== 'nghe') continue;
    const minRequired = density.min_events_per_career_depth[career.depth] ?? 1;
    const count = content.events.filter(
      (ev) =>
        conditionMentions(ev.condition, careerVars, career.id) ||
        ev.weight_modifiers.some((m) => conditionMentions(m.condition, careerVars, career.id)),
    ).length;
    if (count < minRequired) {
      warnings.push(
        `[Độ dày nội dung] Nghề "${career.id}" (${career.name}, độ sâu: ${career.depth}) chỉ có ${count}/${minRequired} sự kiện nghề chuyên biệt.`,
      );
    }
  }
}
