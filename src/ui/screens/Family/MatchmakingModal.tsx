// [2] Màn hình Hôn sự (Chợ hôn nhân & Mai mối trong làng): chọn người thành thân, đối chiếu gia thế / tính cách / sính lễ / của hồi môn
import { useState } from 'react';
import type { HudView, MatchmakingTargetView } from '@core/index';
import { num, useUi } from '../../context';

export function MatchmakingModal({
  hud,
  initialTargetId,
  onClose,
}: {
  hud: HudView;
  initialTargetId?: string;
  onClose: () => void;
}) {
  const { t, store } = useUi();
  const targets = hud.matchmaking.targets;
  const [selectedId, setSelectedId] = useState<string>(
    initialTargetId ?? targets[0]?.characterId ?? '',
  );

  const activeTarget: MatchmakingTargetView | undefined =
    targets.find((m) => m.characterId === selectedId) ?? targets[0];

  const handleArrange = (targetCharId: string, candidateId: string) => {
    const ok = store.dispatch({ type: 'arrangeMarriage', targetCharId, candidateId });
    if (ok && targets.length <= 1) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="summary panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div>
            <div className="event-kicker">
              {t('dynasty.badge', {
                family: hud.dynasty.familyName,
                gen: hud.dynasty.currentGeneration,
              })}
            </div>
            <h2>{t('matchmaking.modal_title')}</h2>
          </div>
          <button onClick={onClose}>{t('common.close')}</button>
        </div>

        <p className="muted small" style={{ marginBottom: 12 }}>
          {t('matchmaking.modal_subtitle')}
        </p>

        {targets.length === 0 ? (
          <p className="muted small">{t('matchmaking.no_eligible_members')}</p>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="muted small">{t('matchmaking.select_member')}</span>
              {targets.map((tg) => (
                <button
                  key={tg.characterId}
                  className={activeTarget?.characterId === tg.characterId ? 'active' : ''}
                  onClick={() => setSelectedId(tg.characterId)}
                >
                  {tg.name} ({t('profile.age', { age: tg.age })})
                </button>
              ))}
            </div>

            {activeTarget && (
              <div>
                {activeTarget.candidates.length === 0 ? (
                  <p className="muted small">{t('matchmaking.no_candidates')}</p>
                ) : (
                  <ul className="people-list">
                    {activeTarget.candidates.map((cand) => {
                      const blockKey =
                        cand.blockReason === 'feud'
                          ? 'error.clan_feud'
                          : cand.blockReason
                            ? `error.${cand.blockReason}`
                            : undefined;
                      return (
                        <li key={cand.characterId} className="card" style={{ marginBottom: 8 }}>
                          <div className="person-main" style={{ width: '100%' }}>
                            <div className="card-head">
                              <div>
                                <b>{cand.name}</b>{' '}
                                <span className="muted small">
                                  ({t('profile.age', { age: cand.age })})
                                </span>
                              </div>
                              <span className="chip">
                                {t(`matchmaking.tier.${cand.matchTier}`)}
                              </span>
                            </div>

                            <div className="muted small" style={{ marginTop: 4 }}>
                              {t('matchmaking.clan_info', {
                                clan: cand.clanName,
                                status: cand.statusRankName,
                                career: cand.careerName,
                              })}{' '}
                              ·{' '}
                              {t('matchmaking.clan_relation', {
                                n:
                                  cand.relationWithPlayer >= 0
                                    ? `+${cand.relationWithPlayer}`
                                    : cand.relationWithPlayer,
                              })}
                              {!activeTarget.isPlayer && cand.rebelChance > 0
                                ? ` · ${t('matchmaking.rebel_chance', { n: cand.rebelChance })}`
                                : ''}
                            </div>

                            {cand.traits.length > 0 && (
                              <div className="chips" style={{ marginTop: 4 }}>
                                {cand.traits.map((tr) => (
                                  <span key={tr.id} className="chip">
                                    {tr.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div
                              className="card-head"
                              style={{ marginTop: 8, alignItems: 'center' }}
                            >
                              <span className="small">
                                {cand.bridePrice > 0
                                  ? t('matchmaking.bride_price', { n: num(cand.bridePrice) })
                                  : t('matchmaking.dowry', { n: num(cand.dowry) })}
                              </span>
                              <button
                                disabled={cand.blockReason !== null}
                                title={blockKey ? t(blockKey) : undefined}
                                onClick={() =>
                                  handleArrange(activeTarget.characterId, cand.characterId)
                                }
                              >
                                {activeTarget.isPlayer
                                  ? t('matchmaking.arrange_self_btn')
                                  : t('matchmaking.arrange_btn')}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
