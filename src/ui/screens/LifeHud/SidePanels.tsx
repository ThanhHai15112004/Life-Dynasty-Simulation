// [1] Cột phải: Gia đình (kèm chạy chữa người ốm), Người quanh đời, Bản đồ cuộc đời (1 ô = 1 năm), Biên niên thiên hạ
import { useState } from 'react';
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { Portrait } from '../../components/Portrait';
import { Tooltip } from '../../components/Tooltip';
import { num, useSnapshot, useUi } from '../../context';
import { FamilyTreeModal } from '../Family/FamilyTreeModal';
import { MatchmakingModal } from '../Family/MatchmakingModal';

export function FamilyCard({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
  const [showFamilyTree, setShowFamilyTree] = useState(false);
  const [matchmakingTargetId, setMatchmakingTargetId] = useState<string | null>(null);
  const scene = useSnapshot().scene;
  const others = hud.household.members.filter((m) => !m.isPlayer);
  // Nhãn theo giới tính nếu lang có (relation.spouse.m = "Chồng"), không thì nhãn chung
  const relationLabel = (rel: string, sex: string) => {
    const specific = t(`relation.${rel}.${sex}`);
    return specific === `relation.${rel}.${sex}` ? t(`relation.${rel}`) : specific;
  };
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('family.title')}</h3>
        <span className="muted small">
          {t('dynasty.badge', { family: hud.dynasty.familyName, gen: hud.dynasty.currentGeneration })} ·{' '}
          {t('family.count', { n: hud.household.members.length })}
        </span>
      </div>
      {hud.dynasty.guardianCall && (
        <p className="muted small">
          {t('dynasty.guardian_notice', { who: hud.dynasty.guardianCall })}
        </p>
      )}
      <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setShowFamilyTree(true)}>
          {t('dynasty.open_tree', { n: hud.dynasty.currentGeneration })}
        </button>
        {hud.manage.isHead && hud.matchmaking.targets.length > 0 && (
          <button onClick={() => setMatchmakingTargetId(hud.matchmaking.targets[0]?.characterId ?? '')}>
            {t('matchmaking.open_btn')}
          </button>
        )}
        {hud.dynasty.canAdoptChild && (
          <button onClick={() => store.dispatch({ type: 'adoptChild' })}>
            {t('dynasty.adopt_child', { cost: num(hud.dynasty.adoptChildCost) })}
          </button>
        )}
        {hud.dynasty.canAdoptRelative && (
          <button onClick={() => store.dispatch({ type: 'adoptRelative' })}>
            {t('dynasty.adopt_relative', { cost: num(hud.dynasty.adoptRelativeCost) })}
          </button>
        )}
      </div>
      {showFamilyTree && (
        <FamilyTreeModal dynasty={hud.dynasty} onClose={() => setShowFamilyTree(false)} />
      )}
      {matchmakingTargetId !== null && (
        <MatchmakingModal
          hud={hud}
          initialTargetId={matchmakingTargetId || undefined}
          onClose={() => setMatchmakingTargetId(null)}
        />
      )}
      {others.length === 0 && <p className="muted small">{t('family.alone')}</p>}
      <ul className="people-list">
        {others.map((m) => (
          <li key={m.id}>
            {scene && <Portrait id={m.id} sex={m.sex} ageGroup={m.ageGroup} cultureSet={scene.cultureSet} season={scene.season} scale={2} />}
            <div className="person-main" style={{ width: '100%' }}>
              <div className="card-head">
                <div>
                  <span className="muted">{relationLabel(m.relation, m.sex)}</span> <b>{m.name}</b>
                </div>
                {m.canArrangeMarriage && (
                  <button
                    className="small"
                    onClick={() => setMatchmakingTargetId(m.id)}
                  >
                    {t('matchmaking.member_btn')}
                  </button>
                )}
              </div>
              <div className="muted small">
                {t('profile.age', { age: m.age })} · {t(m.healthKey)}
                {m.careerName ? ` · ${m.careerName}${m.careerRankName ? ` (${m.careerRankName})` : ''}` : ''}
              </div>
              {m.canSetUpbringing && (
                <div className="row" style={{ marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                  <span className="muted small">{t('upbringing.label')}</span>
                  {hud.household.upbringingOptions.map((opt) => (
                    <Tooltip key={opt.id} content={opt.description}>
                      <button
                        className={m.upbringing === opt.id ? 'active small' : 'small'}
                        onClick={() =>
                          store.dispatch({
                            type: 'setChildUpbringing',
                            childId: m.id,
                            upbringing: opt.id,
                          })
                        }
                      >
                        {opt.name}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {hud.household.sick.length > 0 && (
        <div className="sick-list">
          <h4>{t('treat.title')}</h4>
          {!hud.manage.isHead && <p className="muted small">{t('treat.not_head')}</p>}
          <ul className="people-list">
            {hud.household.sick.map((s) => (
              <li key={`${s.characterId}:${s.diseaseId}`}>
                <div className="person-main">
                  <div>
                    <b>{s.isPlayer ? t('treat.self') : s.call}</b> <span className="chip disease-chip">{s.diseaseName}</span>{' '}
                    <span className="muted small">({t(`severity.${s.severity}`)})</span>
                  </div>
                  <div className="muted small">{t('treat.chance', { chance: t(s.chanceKey) })}</div>
                </div>
                {hud.manage.isHead && (
                  <button
                    disabled={s.block !== null}
                    title={s.block ? t(`error.${s.block}`) : undefined}
                    onClick={() => store.dispatch({ type: 'treatDisease', characterId: s.characterId, diseaseId: s.diseaseId })}
                  >
                    {t('treat.button', { money: num(s.cost) })}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hud.household.parentHousehold && (
        <div className="related-household">
          <h4>
            {t('family.parent_house')} ·{' '}
            <span className="muted small">{t('family.parent_land', { sao: hud.household.parentHousehold.farmland })}</span>
          </h4>
          <ul className="people-list">
            {hud.household.parentHousehold.members.map((m) => (
              <li key={m.id}>
                {scene && <Portrait id={m.id} sex={m.sex} ageGroup={m.ageGroup} cultureSet={scene.cultureSet} season={scene.season} scale={2} />}
                <div className="person-main">
                  <div>
                    <span className="muted">{relationLabel(m.relation, m.sex)}</span> <b>{m.name}</b>
                  </div>
                  <div className="muted small">
                    {t('profile.age', { age: m.age })} · {t(m.healthKey)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hud.household.siblingHouseholds.length > 0 && (
        <div className="related-household">
          <h4>{t('family.sibling_houses')}</h4>
          <ul className="people-list">
            {hud.household.siblingHouseholds.map((sh) => (
              <li key={sh.id}>
                <div className="person-main">
                  <div>
                    <b>{t('family.sibling_house_item', { who: sh.headCall })}</b>{' '}
                    <span className="muted small">({t('family.sibling_land', { sao: sh.farmland, n: sh.members.length })})</span>
                  </div>
                  <div className="muted small">
                    {sh.members.map((m) => `${m.name} (${t('profile.age', { age: m.age })})`).join(' · ')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function RelationsCard({ hud, onOpenRelations }: { hud: HudView; onOpenRelations?: () => void }) {
  const { t } = useUi();
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('relations.title')}</h3>
        {onOpenRelations ? (
          <button className="small" onClick={onOpenRelations}>
            {t('relations.open_btn')}
          </button>
        ) : (
          <span className="muted small">{t('relations.subtitle')}</span>
        )}
      </div>
      <ul className="relation-list">
        {hud.relations.map((r) => (
          <li key={r.id}>
            <div>
              <b>{r.call}</b>
              <div className="muted small">{t('profile.age', { age: r.age })}</div>
            </div>
            <div className="relation-meter">
              <div className="meter-track">
                <div className={`meter-fill ${r.opinion >= 0 ? 'pos' : 'neg'}`} style={{ width: `${Math.min(50, Math.abs(r.opinion) / 2)}%`, [r.opinion >= 0 ? 'left' : 'right']: '50%' }} />
              </div>
              <span className="small muted">
                {t('relations.opinion', { n: r.opinion >= 0 ? `+${r.opinion}` : r.opinion })}
                {r.favor > 0 ? ` · ${t('relations.favor_owed', { n: r.favor })}` : ''}
                {r.favor < 0 ? ` · ${t('relations.favor_debt', { n: -r.favor })}` : ''}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LifeMapCard({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
  const map = hud.lifeMap;
  const expected = Math.round(map.expectedLifespan);
  const total = Math.max(expected + store.content.balance.display.life_map_extra_rows * 10, Math.ceil((hud.player.age + 1) / 10) * 10);
  const byAge = new Map(map.cells.map((c) => [c.age, c]));
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('lifemap.title')}</h3>
        <span className="muted small">{t('lifemap.scale')}</span>
      </div>
      <div className="life-grid">
        {Array.from({ length: total }, (_, age) => {
          const cell = byAge.get(age);
          const isNow = age === hud.player.age;
          const cls = ['cell', cell ? 'lived' : '', isNow ? 'now' : '', age === expected ? 'expected' : ''].join(' ');
          const style = cell ? { opacity: 0.35 + (cell.satisfaction / 100) * 0.65 } : undefined;
          const tip = cell ? t('lifemap.cell', { age, year: cell.year, n: cell.satisfaction }) : isNow ? t('lifemap.now', { age }) : t('lifemap.future', { age });
          return (
            <Tooltip key={age} content={tip}>
              <span className={cls} style={style}>
                {cell?.marks[0] && <Icon id={cell.marks[0]} />}
              </span>
            </Tooltip>
          );
        })}
      </div>
      <p className="muted small">{t('lifemap.legend', { n: expected })}</p>
    </section>
  );
}

export function VillageClansCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  if (hud.villageClans.length === 0) return null;
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('clans.card_title')}</h3>
        <span className="muted small">{t('clans.card_subtitle', { n: hud.villageClans.length })}</span>
      </div>
      <ul className="people-list">
        {hud.villageClans.map((cl) => (
          <li key={cl.id}>
            <div className="person-main" style={{ width: '100%' }}>
              <div className="card-head">
                <div>
                  <b>{cl.familyName}</b>{' '}
                  <span className="muted small">
                    ({cl.statusRankName} · {cl.careerName})
                  </span>
                </div>
                <span className={`chip ${cl.tie === 'feud' ? 'disease-chip' : ''}`}>
                  {t(`clans.tie.${cl.tie}`)}
                </span>
              </div>
              <div className="muted small">
                {t('clans.head_prefix', { name: cl.headName })} ·{' '}
                {t('clans.stats_line', {
                  members: cl.memberCount,
                  sao: cl.farmland,
                  prestige: num(cl.prestige),
                })}
              </div>
              <div className="muted small">
                {t('clans.relation_label', {
                  n: cl.relationWithPlayer >= 0 ? `+${cl.relationWithPlayer}` : cl.relationWithPlayer,
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ChronicleCard({ hud, onOpenChronicle }: { hud: HudView; onOpenChronicle?: () => void }) {
  const { t } = useUi();
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('chronicle.title')}</h3>
        {onOpenChronicle ? (
          <button className="small" onClick={onOpenChronicle}>
            {t('chronicle.open_btn')}
          </button>
        ) : (
          <span className="muted small">{hud.reign.name ? t('header.reign', { name: hud.reign.name, n: hud.reign.year }) : ''}</span>
        )}
      </div>
      {hud.chronicle.length === 0 && <p className="muted small">{t('chronicle.empty')}</p>}
      <ul className="chronicle-list">
        {hud.chronicle.map((c, i) => (
          <li key={i}>
            <span className="muted small">{c.year}</span>
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
