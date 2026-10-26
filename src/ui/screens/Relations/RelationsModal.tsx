// [8] Màn hình phụ Quan hệ & Làng xã (GDD 08 §6.2): Người quanh đời, Các dòng tộc trong làng & Gia quyến
import { useState } from 'react';
import type { HudView } from '@core/index';
import { Modal } from '../../components/Modal';
import { Portrait } from '../../components/Portrait';
import { num, useSnapshot, useUi } from '../../context';

type RelationsTab = 'npcs' | 'clans' | 'kin';

export function RelationsModal({ hud, onClose }: { hud: HudView; onClose: () => void }) {
  const { t } = useUi();
  const snap = useSnapshot();
  const [tab, setTab] = useState<RelationsTab>('npcs');
  const scene = snap.scene;

  const relationLabel = (rel: string, sex: string) => {
    const specific = t(`relation.${rel}.${sex}`);
    return specific === `relation.${rel}.${sex}` ? t(`relation.${rel}`) : specific;
  };

  return (
    <Modal title={t('relations.modal_title')} onClose={onClose}>
      <div className="subscreen-tabs row">
        <button
          type="button"
          className={`chip ${tab === 'npcs' ? 'active' : ''}`}
          onClick={() => setTab('npcs')}
        >
          {t('relations.tab_npcs', { n: hud.relations.length })}
        </button>
        <button
          type="button"
          className={`chip ${tab === 'clans' ? 'active' : ''}`}
          onClick={() => setTab('clans')}
        >
          {t('relations.tab_clans', { n: hud.villageClans.length })}
        </button>
        <button
          type="button"
          className={`chip ${tab === 'kin' ? 'active' : ''}`}
          onClick={() => setTab('kin')}
        >
          {t('relations.tab_kin', { n: hud.household.members.length })}
        </button>
      </div>

      {tab === 'npcs' && (
        <div>
          <p className="muted small">{t('relations.npcs_intro')}</p>
          {hud.relations.length === 0 && <p className="muted small">{t('relations.empty_npcs')}</p>}
          <ul className="relation-list">
            {hud.relations.map((r) => (
              <li key={r.id}>
                <div>
                  <b>{r.call}</b>
                  <div className="muted small">{t('profile.age', { age: r.age })}</div>
                </div>
                <div className="relation-meter">
                  <div className="meter-track">
                    <div
                      className={`meter-fill ${r.opinion >= 0 ? 'pos' : 'neg'}`}
                      style={{
                        width: `${Math.min(50, Math.abs(r.opinion) / 2)}%`,
                        [r.opinion >= 0 ? 'left' : 'right']: '50%',
                      }}
                    />
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
        </div>
      )}

      {tab === 'clans' && (
        <div>
          <p className="muted small">{t('relations.clans_intro')}</p>
          {hud.villageClans.length === 0 && <p className="muted small">{t('relations.empty_clans')}</p>}
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
                    {cl.tieReason ? ` · ${cl.tieReason}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'kin' && (
        <div>
          <h4>{t('family.title')}</h4>
          <ul className="people-list">
            {hud.household.members.map((m) => (
              <li key={m.id}>
                {scene && (
                  <Portrait
                    id={m.id}
                    sex={m.sex}
                    ageGroup={m.ageGroup}
                    cultureSet={scene.cultureSet}
                    season={scene.season}
                    scale={2}
                  />
                )}
                <div className="person-main">
                  <div>
                    <span className="muted">{m.isPlayer ? t('profile.you') : relationLabel(m.relation, m.sex)}</span>{' '}
                    <b>{m.name}</b>
                  </div>
                  <div className="muted small">
                    {t('profile.age', { age: m.age })} · {t(m.healthKey)}
                    {m.careerName ? ` · ${m.careerName}` : ''}
                    {m.traits.length > 0 ? ` · ${m.traits.join(', ')}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
