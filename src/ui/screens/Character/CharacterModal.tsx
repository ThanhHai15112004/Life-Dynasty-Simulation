// [8] Màn hình phụ Chi tiết Nhân vật (GDD 08 §6.2 & §6.4): Hồ sơ, Tính cách, 7 Kỹ năng & Giải thích toàn bộ Modifier
import { useState } from 'react';
import type { HudView } from '@core/index';
import { Modal } from '../../components/Modal';
import { ModifierList } from '../../components/ModifierList';
import { Portrait } from '../../components/Portrait';
import { StatBar } from '../../components/StatBar';
import { useSnapshot, useUi } from '../../context';

type CharacterTab = 'overview' | 'skills' | 'modifiers';

export function CharacterModal({ hud, onClose }: { hud: HudView; onClose: () => void }) {
  const { t, store } = useUi();
  const snap = useSnapshot();
  const [tab, setTab] = useState<CharacterTab>('overview');
  const p = hud.player;
  const scene = snap.scene;
  const months = store.content.balance.calendar.months_per_year;

  return (
    <Modal title={t('character.modal_title', { name: p.name })} onClose={onClose}>
      <div className="subscreen-tabs row">
        <button
          type="button"
          className={`chip ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          {t('character.tab_overview')}
        </button>
        <button
          type="button"
          className={`chip ${tab === 'skills' ? 'active' : ''}`}
          onClick={() => setTab('skills')}
        >
          {t('character.tab_skills')}
        </button>
        <button
          type="button"
          className={`chip ${tab === 'modifiers' ? 'active' : ''}`}
          onClick={() => setTab('modifiers')}
        >
          {t('character.tab_modifiers')}
        </button>
      </div>

      {tab === 'overview' && (
        <div className="character-overview">
          <div className="profile-body" style={{ padding: '8px 0 14px' }}>
            {scene && (
              <Portrait
                id={p.id}
                sex={p.sex}
                ageGroup={p.ageGroup}
                cultureSet={scene.cultureSet}
                season={scene.season}
                scale={4}
              />
            )}
            <div className="profile-main">
              <h3>{p.name}</h3>
              <dl className="facts">
                <dt>{t('profile.sex')}</dt>
                <dd>{t(`menu.sex.${p.sex}`)}</dd>
                <dt>{t('profile.born')}</dt>
                <dd>
                  {t('profile.born_value', {
                    month: t(`month.${p.birth.month}`),
                    can: t(`canchi.can.${p.birth.can}`),
                    chi: t(`canchi.chi.${p.birth.chi}`),
                    year: p.birth.year,
                  })}
                </dd>
                <dt>{t('profile.origin')}</dt>
                <dd>{p.originName}</dd>
                <dt>{t('profile.stage')}</dt>
                <dd>
                  {p.lifeStage} ({t('profile.age', { age: p.age })})
                  {p.isHead ? ` · ${t('profile.head')}` : ''}
                </dd>
                <dt>{t('profile.status')}</dt>
                <dd>
                  <b>{p.statusRank.name}</b> ({t('profile.status_ladder', { n: p.statusRank.index + 1, total: p.statusRank.total })})
                  <div className="muted small">{p.statusRank.description}</div>
                </dd>
                {p.examDegreeId !== 'none' && (
                  <>
                    <dt>{t('profile.degree')}</dt>
                    <dd>{p.examDegreeName}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <h4>{t('character.traits_heading')}</h4>
          <div className="ambition-list">
            {p.traits.map((tr) => (
              <div key={tr.id} className="focus">
                <b>{tr.name}</b>
                <div className="muted small">{tr.description}</div>
              </div>
            ))}
          </div>

          {p.diseases.length > 0 && (
            <>
              <h4>{t('character.diseases_heading')}</h4>
              <div className="ambition-list">
                {p.diseases.map((d) => (
                  <div key={d.id} className="focus">
                    <div>
                      <b className="down">{d.name}</b>{' '}
                      <span className="muted small">
                        ({t(`severity.${d.severity}`)} · {t('disease.remaining', { n: d.remainingMonths })})
                      </span>
                    </div>
                    <div className="muted small">{d.description}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'skills' && (
        <div className="character-skills">
          <p className="muted small">{t('character.skills_intro')}</p>
          <div className="ambition-list">
            {p.skills.map((s) => {
              const def = store.content.index.skill.get(s.id);
              const pct = s.next > 0 ? Math.min(100, Math.round((s.xp / s.next) * 100)) : 0;
              return (
                <div key={s.id} className="focus">
                  <div className="card-head" style={{ marginBottom: 4 }}>
                    <b>{s.name}</b>
                    <span>
                      <b>{t(s.bandKey)}</b> ·{' '}
                      <span className="muted small">
                        {t('profile.skill_level', { level: s.level, xp: Math.floor(s.xp), next: Math.ceil(s.next) })}
                      </span>
                    </span>
                  </div>
                  {def?.description && <div className="muted small">{def.description}</div>}
                  <div className="stat-track" style={{ marginTop: 6 }}>
                    <div className="stat-fill good" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'modifiers' && (
        <div className="character-modifiers">
          <p className="muted small">{t('character.modifiers_intro')}</p>
          <StatBar
            label={t('stat.health')}
            value={p.health}
            max={p.healthMax}
            word={`${t(p.healthKey)} (${Math.round(p.health)}/${p.healthMax})`}
            tone="good"
          />
          <div className="focus" style={{ marginBottom: 10 }}>
            <ModifierList result={p.healthTrend} title={t('mods.health_per_year')} perYear={months} />
          </div>

          <StatBar
            label={t('stat.stress')}
            value={p.stress}
            max={100}
            word={`${t(p.stressKey)} (${Math.round(p.stress)}/100)`}
            tone="bad"
          />
          <div className="focus" style={{ marginBottom: 10 }}>
            <ModifierList result={p.stressTrend} title={t('mods.stress_per_year')} perYear={months} />
          </div>

          <div className="focus" style={{ marginBottom: 10 }}>
            <ModifierList result={p.satisfactionBreakdown} title={t('stat.satisfaction')} />
          </div>

          <div className="focus" style={{ marginBottom: 10 }}>
            <ModifierList result={p.reputationBreakdown} title={t('stat.reputation')} />
          </div>

          <div className="focus" style={{ marginBottom: 10 }}>
            <ModifierList result={p.filialPietyBreakdown} title={t('stat.filial_piety')} />
          </div>

          <div className="focus" style={{ marginBottom: 10 }}>
            <ModifierList result={p.scholarlyPrestigeBreakdown} title={t('stat.scholarly_prestige')} />
          </div>

          <div className="focus">
            <ModifierList result={p.deathRiskMod} title={t('mods.death_risk_factor')} />
          </div>
        </div>
      )}
    </Modal>
  );
}
