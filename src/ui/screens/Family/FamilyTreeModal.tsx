// [2] Màn hình Gia phả nhiều đời & Sử sách các đời (5 trục + Bản đồ cuộc đời + Nhật ký riêng từng đời)
import { useState } from 'react';
import type { DynastyView, FamilyTreeNodeView } from '@core/index';
import { Icon } from '../../components/Icon';
import { StatBar } from '../../components/StatBar';
import { Tooltip } from '../../components/Tooltip';
import { num, useUi } from '../../context';

export function FamilyTreeModal({
  dynasty,
  onClose,
}: {
  dynasty: DynastyView;
  onClose: () => void;
}) {
  const { t } = useUi();
  const [tab, setTab] = useState<'tree' | 'chronicle' | 'wishes'>('tree');
  const [expandedGen, setExpandedGen] = useState<number | null>(null);

  // Nhóm thành viên theo thế hệ
  const groups = new Map<number, FamilyTreeNodeView[]>();
  for (const node of dynasty.familyTree) {
    const list = groups.get(node.generation) ?? [];
    list.push(node);
    groups.set(node.generation, list);
  }
  const sortedGens = [...groups.keys()].sort((a, b) => a - b);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="summary panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div>
            <div className="event-kicker">{t('dynasty.prestige', { n: num(dynasty.prestige) })}</div>
            <h2>{t('dynasty.modal_title', { family: dynasty.familyName })}</h2>
          </div>
          <button onClick={onClose}>{t('common.close')}</button>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <button className={tab === 'tree' ? 'active' : ''} onClick={() => setTab('tree')}>
            {t('dynasty.tab_tree')}
          </button>
          <button className={tab === 'chronicle' ? 'active' : ''} onClick={() => setTab('chronicle')}>
            {t('dynasty.tab_chronicle')} ({dynasty.pastLives.length})
          </button>
          <button className={tab === 'wishes' ? 'active' : ''} onClick={() => setTab('wishes')}>
            {t('dynasty.tab_wishes')}
          </button>
        </div>

        {tab === 'tree' && (
          <div>
            {sortedGens.map((gen) => {
              const members = groups.get(gen) ?? [];
              return (
                <div key={gen} style={{ marginBottom: 12 }}>
                  <h4>
                    {gen <= 0 ? t('dynasty.ancestor_gen') : t('dynasty.gen_label', { n: gen })}
                  </h4>
                  <ul className="people-list">
                    {members.map((m) => (
                      <li key={m.id}>
                        <div className="person-main" style={{ width: '100%' }}>
                          <div className="card-head">
                            <div>
                              <b>{m.name}</b>{' '}
                              <span className="muted small">
                                (
                                {m.alive
                                  ? t('dynasty.years_alive', { birth: m.birthYear, age: m.age })
                                  : t('dynasty.years_lived', {
                                      birth: m.birthYear,
                                      death: m.deathYear ?? m.birthYear + m.age,
                                      age: m.age,
                                    })}
                                )
                              </span>
                            </div>
                            <div className="chips">
                              {m.isPlayer && <span className="chip">{t('dynasty.current_tag')}</span>}
                              {!m.isPlayer && m.wasPlayed && (
                                <span className="chip">{t('dynasty.played_tag')}</span>
                              )}
                              {m.adopted && <span className="chip">{t('dynasty.adopted_tag')}</span>}
                              {m.collateral && (
                                <span className="chip">{t('dynasty.collateral_tag')}</span>
                              )}
                            </div>
                          </div>
                          {m.spouseName && (
                            <div className="muted small">
                              {t('dynasty.spouse_prefix', { name: m.spouseName })}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'chronicle' && (
          <div>
            {dynasty.pastLives.length === 0 && (
              <p className="muted small">{t('dynasty.no_past_lives')}</p>
            )}
            <ul className="people-list">
              {dynasty.pastLives.map((life) => {
                const isExpanded = expandedGen === life.generation;
                return (
                  <li
                    key={`${life.generation}:${life.characterId}`}
                    className="card"
                    style={{ marginBottom: 10 }}
                  >
                    <div className="person-main" style={{ width: '100%' }}>
                      <div className="card-head">
                        <b>
                          {t('dynasty.gen_label', { n: life.generation })} · {life.name}
                        </b>
                        <span className="muted small">
                          {t('dynasty.years_lived', {
                            birth: life.birthYear,
                            death: life.deathYear,
                            age: life.deathAge,
                          })}{' '}
                          · {life.causeName}
                        </span>
                      </div>

                      <div className="summary-axes" style={{ marginTop: 6 }}>
                        {life.axes.map((ax) => (
                          <StatBar
                            key={ax.id}
                            label={t(`axis.${ax.id}`)}
                            value={ax.score}
                            max={100}
                            word={t(ax.bandKey)}
                            tone="good"
                          />
                        ))}
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() =>
                            setExpandedGen(isExpanded ? null : life.generation)
                          }
                        >
                          {isExpanded ? t('dynasty.hide_life_detail') : t('dynasty.view_life_detail')}
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 10 }}>
                          {life.lifeMap.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <h4>{t('lifemap.title')}</h4>
                              <div className="life-grid">
                                {life.lifeMap.map((cell) => (
                                  <Tooltip
                                    key={cell.year}
                                    content={t('lifemap.cell', {
                                      age: cell.age,
                                      year: cell.year,
                                      n: cell.satisfaction,
                                    })}
                                  >
                                    <span
                                      className="cell lived"
                                      style={{ opacity: 0.35 + (cell.satisfaction / 100) * 0.65 }}
                                    >
                                      {cell.marks[0] && <Icon id={cell.marks[0]} />}
                                    </span>
                                  </Tooltip>
                                ))}
                              </div>
                            </div>
                          )}

                          {life.highlights.length > 0 && (
                            <div>
                              <h4>{t('summary.highlights')}</h4>
                              <ul className="highlights">
                                {life.highlights.map((h, i) => (
                                  <li key={i}>
                                    <span className="muted">{h.year}</span> {h.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === 'wishes' && (
          <div>
            <h4>{t('dynasty.wishes_title')}</h4>
            {dynasty.unfinishedWishes.length === 0 ? (
              <p className="muted small">{t('dynasty.wishes_empty')}</p>
            ) : (
              <ul className="people-list">
                {dynasty.unfinishedWishes.map((w) => (
                  <li key={w.id}>
                    <div className="person-main">
                      <div>
                        <b>{w.text}</b>
                      </div>
                      <div className="muted small">
                        {t('dynasty.wish_from', { gen: w.fromGeneration, name: w.fromName })}
                      </div>
                    </div>
                    <span className="chip">
                      {w.fulfilled ? t('dynasty.wish_fulfilled') : t('dynasty.wish_pending')}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h4 style={{ marginTop: 12 }}>{t('dynasty.feuds_title')}</h4>
            {dynasty.feuds.length === 0 ? (
              <p className="muted small">{t('dynasty.feuds_empty')}</p>
            ) : (
              <ul className="people-list">
                {dynasty.feuds.map((f) => (
                  <li key={f.id}>
                    <div className="person-main">
                      <b>{f.targetName}</b>
                      <div className="muted small">{f.reason}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
