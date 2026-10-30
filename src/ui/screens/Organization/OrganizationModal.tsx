// [2][3] Màn hình Tổ chức Fractal (5 yếu tố + Giao phó cấp dưới), Quyền lực mềm (Mưu kế/Bí mật/Thế kẹt), Triều chính & Khởi nghĩa 8 giai đoạn
import { useState } from 'react';
import type { HudView } from '@core/index';
import type { DelegationPolicy, OrganizationFactorKey } from '@core/entities/Organization';
import type { SchemeKind } from '@core/entities/World';
import { Modal } from '../../components/Modal';
import { StatBar } from '../../components/StatBar';
import { useUi } from '../../context';

type TabId = 'orgs' | 'social' | 'politics' | 'rebellion';

const FACTOR_KEYS: OrganizationFactorKey[] = ['treasury', 'morale', 'security', 'investment', 'influence'];
const POLICIES: DelegationPolicy[] = ['treasury', 'balanced', 'expansion'];
const SCHEME_KINDS: SchemeKind[] = ['ket_than', 'tim_bi_mat', 'boi_nho', 'ung_ho_lang', 'ep_hon_su'];

export function OrganizationModal({ hud, onClose }: { hud: HudView; onClose: () => void }) {
  const { store, t } = useUi();
  const [tab, setTab] = useState<TabId>('orgs');
  const [selectedNpc, setSelectedNpc] = useState<string>(hud.relations[0]?.id ?? '');
  const [selectedScheme, setSelectedScheme] = useState<SchemeKind>('ket_than');

  const orgs = hud.organizations ?? [];
  const social = hud.social;
  const politics = hud.politics;
  const rebellion = politics?.rebellion;
  const money = hud.personal.active ? hud.personal.money : hud.household.money;

  return (
    <Modal title={t('org.modal_title')} onClose={onClose}>
      <div className="subscreen-tabs">
        <button className={`small ${tab === 'orgs' ? 'active' : ''}`} onClick={() => setTab('orgs')}>
          {t('org.tab_orgs', { n: orgs.length })}
        </button>
        <button className={`small ${tab === 'social' ? 'active' : ''}`} onClick={() => setTab('social')}>
          {t('org.tab_social')}
        </button>
        <button className={`small ${tab === 'politics' ? 'active' : ''}`} onClick={() => setTab('politics')}>
          {t('org.tab_politics')}
        </button>
        <button className={`small ${tab === 'rebellion' ? 'active' : ''}`} onClick={() => setTab('rebellion')}>
          {t('org.tab_rebellion')}
        </button>
      </div>

      {tab === 'orgs' && (
        <div className="modal-section">
          {orgs.map((org) => {
            const joined = org.playerRank >= 0;
            const canDelegate = org.playerRank >= 2;
            const firstDeputyId = org.availableDeputies[0]?.id ?? null;
            return (
              <div key={org.id} className="card" style={{ marginBottom: 10 }}>
                <div className="card-head">
                  <h4>{org.name}</h4>
                  <span className="tag">
                    {joined
                      ? t('org.rank_label', {
                          rank: org.playerRankName ?? '',
                          idx: org.playerRank + 1,
                          merit: Math.round(org.playerContribution),
                        })
                      : t('org.not_member')}
                  </span>
                </div>
                <p className="small muted">{org.description}</p>
                <div className="summary-axes" style={{ marginTop: 6 }}>
                  {FACTOR_KEYS.map((fk) => {
                    const val = Math.round(org.factors[fk]);
                    return (
                      <div key={fk} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <StatBar
                            label={t(`org.factor.${fk}`)}
                            value={val}
                            max={100}
                            word={`${val}/100`}
                            tone="good"
                          />
                        </div>
                        {joined && (
                          <button
                            className="small"
                            disabled={money < 3}
                            onClick={() =>
                              store.dispatch({ type: 'investOrganizationFactor', orgId: org.id, factor: fk })
                            }
                          >
                            {t('org.invest_btn', { cost: 3 })}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {!joined ? (
                    <button
                      className="small primary"
                      disabled={!org.canJoin}
                      onClick={() => store.dispatch({ type: 'joinOrganization', orgId: org.id })}
                    >
                      {t('org.join_btn', { cost: org.joinCostMoney })}
                    </button>
                  ) : (
                    <>
                      <button
                        className="small"
                        disabled={money < 2}
                        onClick={() =>
                          store.dispatch({ type: 'contributeOrganization', orgId: org.id, amount: 2 })
                        }
                      >
                        {t('org.contribute_btn')}
                      </button>
                      {canDelegate &&
                        POLICIES.map((pol) => {
                          const isActive =
                            org.delegation.deputyId !== null && org.delegation.policy === pol;
                          return (
                            <button
                              key={pol}
                              className={`small ${isActive ? 'active' : ''}`}
                              onClick={() =>
                                store.dispatch({
                                  type: 'delegateOrganization',
                                  orgId: org.id,
                                  deputyId: isActive ? null : firstDeputyId,
                                  policy: pol,
                                })
                              }
                            >
                              {t(`org.policy.${pol}`)}
                            </button>
                          );
                        })}
                    </>
                  )}
                </div>
                {org.delegation.deputyId && org.delegation.deputyName && (
                  <p className="small muted" style={{ marginTop: 6 }}>
                    {t('org.deputy_label', {
                      name: org.delegation.deputyName,
                      loyalty: Math.round(org.delegation.deputyLoyalty),
                      competence: Math.min(100, 60 + org.delegation.monthsDelegated),
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'social' && social && (
        <div className="modal-section">
          <div className="card" style={{ marginBottom: 10 }}>
            <StatBar
              label={t('social.dread_label', { n: Math.round(social.dread) })}
              value={social.dread}
              max={100}
              word={`${Math.round(social.dread)}/100`}
              tone="bad"
            />
            <h4 style={{ marginTop: 8 }}>{t('social.schemes_title')}</h4>
            {social.activeScheme ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="small">
                  {t('social.active_scheme', {
                    kind: t(`social.scheme.${social.activeScheme.kind}`),
                    target: social.activeScheme.targetName,
                    progress: Math.round(social.activeScheme.progress),
                    chance: Math.round(social.activeScheme.secrecy),
                  })}
                </span>
                <button className="small" onClick={() => store.dispatch({ type: 'cancelScheme' })}>
                  {t('social.cancel_scheme_btn')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <select
                  value={selectedScheme}
                  onChange={(e) => setSelectedScheme(e.target.value as SchemeKind)}
                >
                  {SCHEME_KINDS.map((sk) => (
                    <option key={sk} value={sk}>
                      {t(`social.scheme.${sk}`)}
                    </option>
                  ))}
                </select>
                <select value={selectedNpc} onChange={(e) => setSelectedNpc(e.target.value)}>
                  {hud.relations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.call} ({r.role})
                    </option>
                  ))}
                </select>
                <button
                  className="small primary"
                  disabled={!selectedNpc}
                  onClick={() =>
                    store.dispatch({ type: 'startScheme', kind: selectedScheme, targetId: selectedNpc })
                  }
                >
                  {t('social.start_scheme_btn')}
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <h4>{t('social.hooks_title', { n: social.hooks.length })}</h4>
            {social.hooks.map((h) => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <span className="small">
                  <b>{h.targetName}</b> ({h.strength}) — {h.reason}
                </span>
                {h.direction === 'on_npc' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['extort_money', 'force_support', 'forgive_debt'] as const).map((act) => (
                      <button
                        key={act}
                        className="small"
                        onClick={() => store.dispatch({ type: 'useHook', hookId: h.id, action: act })}
                      >
                        {t(`social.hook_action.${act}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <h4>{t('social.secrets_title', { n: social.secrets.length })}</h4>
            {social.secrets.map((sec) => (
              <div
                key={sec.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <span className="small">
                  <b>{sec.ownerName}</b>: {sec.label.startsWith('social.') ? t(sec.label) : sec.label}
                </span>
                {!sec.exposed && (
                  <button
                    className="small"
                    onClick={() => store.dispatch({ type: 'exposeSecret', secretId: sec.id })}
                  >
                    {t('social.expose_btn')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'politics' && politics && (
        <div className="modal-section">
          <div className="card" style={{ marginBottom: 10 }}>
            <StatBar
              label={t('politics.mandate_label', { n: Math.round(politics.mandateOfHeaven) })}
              value={politics.mandateOfHeaven}
              max={100}
              word={`${Math.round(politics.mandateOfHeaven)}/100`}
              tone="good"
            />
            <p className="small muted">
              {t('politics.treasury_army', {
                treasury: Math.round(politics.imperialTreasury),
                army: Math.round(politics.imperialArmy),
              })}
            </p>
            {hud.dynasty.playMode === 'legacy_of_ages' && (
              <button
                className="small primary"
                style={{ marginTop: 6 }}
                onClick={() => store.dispatch({ type: 'fastForwardDecade' })}
              >
                {t('era.fast_forward_btn')}
              </button>
            )}
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <h4>{t('politics.factions_title')}</h4>
            {politics.factions.map((f) => {
              const aligned = politics.alignedFactionId === f.id;
              return (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <b>{f.name}</b> ({Math.round(f.influence)}%)
                  </div>
                  <button
                    className={`small ${aligned ? 'active' : ''}`}
                    onClick={() => store.dispatch({ type: 'alignFaction', factionId: f.id })}
                  >
                    {aligned ? t('politics.aligned_badge') : t('politics.align_btn')}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <h4>{t('politics.petitions_title')}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(['giam_thue', 'chan_te', 'tang_binh'] as const).map((pet) => (
                <button
                  key={pet}
                  className="small"
                  onClick={() => store.dispatch({ type: 'petitionCourt', policy: pet })}
                >
                  {t(`politics.petition.${pet}`)}
                </button>
              ))}
              {(['suppress_unrest', 'fortify_border'] as const).map((act) => (
                <button
                  key={act}
                  className="small"
                  onClick={() =>
                    store.dispatch({
                      type: 'militaryCampaign',
                      provinceId: politics.provinces[0]?.id ?? 'kinh_lo',
                      action: act,
                    })
                  }
                >
                  {t(`politics.military.${act}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h4>{t('politics.provinces_title', { n: politics.provinces.length })}</h4>
            {politics.provinces.map((p) => (
              <div key={p.id} style={{ marginBottom: 6 }}>
                <b>{p.name}</b> —{' '}
                <span className="small muted">
                  {t('politics.province_stats', {
                    prosperity: Math.round(p.prosperity),
                    grievance: Math.round(p.grievance),
                    garrison: Math.round(p.garrison),
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'rebellion' && rebellion && (
        <div className="modal-section">
          <div className="card">
            <h4>
              {t('rebellion.stage_label', {
                stage: t(`rebellion.stage.${rebellion.stage}`),
                idx: rebellion.stageIndex,
                progress: Math.round(rebellion.progress),
              })}
            </h4>
            <StatBar
              label={t(`rebellion.stage.${rebellion.stage}`)}
              value={rebellion.progress}
              max={100}
              word={`${Math.round(rebellion.progress)}%`}
              tone="bad"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {!rebellion.playerJoined ? (
                <button
                  className="small primary"
                  onClick={() => store.dispatch({ type: 'joinRebellion' })}
                >
                  {t('rebellion.join_btn')}
                </button>
              ) : (
                (
                  ['gather_followers', 'stockpile_supplies', 'keep_secrecy', 'advance_stage'] as const
                ).map((act) => (
                  <button
                    key={act}
                    className="small"
                    onClick={() => store.dispatch({ type: 'rebellionAction', action: act })}
                  >
                    {t(`rebellion.action.${act}`)}
                  </button>
                ))
              )}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              {t(`rebellion.promise.${rebellion.promise}`)}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
