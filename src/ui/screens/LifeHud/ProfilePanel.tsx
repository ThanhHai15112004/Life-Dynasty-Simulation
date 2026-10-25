// [1] Cột trái: Hồ sơ cá nhân (kiểu tờ khai, có chân dung pixel), Trạng thái, Gia sản, Kỹ năng
import { useState } from 'react';
import type { HudView } from '@core/index';
import { Modal } from '../../components/Modal';
import { ModifierList } from '../../components/ModifierList';
import { Portrait } from '../../components/Portrait';
import { StatBar } from '../../components/StatBar';
import { Tooltip } from '../../components/Tooltip';
import { num, useSnapshot, useUi } from '../../context';
import { LedgerPanel } from './LedgerPanel';
import { MarketPanel } from './MarketPanel';

/** Bỏ dấu tiếng Việt để in dòng mã kiểu tờ khai (chỉ trang trí). */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();

export function ProfileCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const snap = useSnapshot();
  const p = hud.player;
  const scene = snap.scene;
  const code = `DD<${plain(p.name).replace(/\s+/g, '<<')}`.padEnd(34, '<').slice(0, 34);
  const code2 = `${p.birth.year}${String(p.birth.month).padStart(2, '0')}${p.sex.toUpperCase()}<${plain(hud.household.settlement.name).replace(/\s+/g, '')}`.padEnd(34, '<').slice(0, 34);
  return (
    <section className="card profile-card">
      <div className="profile-band">
        <span>{t('profile.card_title')}</span>
        <span>{hud.date.year}</span>
      </div>
      <div className="profile-body">
        {scene && <Portrait id={p.id} sex={p.sex} ageGroup={p.ageGroup} cultureSet={scene.cultureSet} season={scene.season} scale={5} />}
        <div className="profile-main">
          <h2 className="profile-name">{p.name}</h2>
          <dl className="facts">
            <dt>{t('profile.sex')}</dt>
            <dd>{t(`menu.sex.${p.sex}`)}</dd>
            <dt>{t('profile.born')}</dt>
            <dd>{t('profile.born_value', { month: t(`month.${p.birth.month}`), can: t(`canchi.can.${p.birth.can}`), chi: t(`canchi.chi.${p.birth.chi}`), year: p.birth.year })}</dd>
            <dt>{t('profile.home')}</dt>
            <dd>
              <Tooltip content={hud.household.settlement.typeDescription}>
                <span className="underline">{hud.household.settlement.name}</span>
              </Tooltip>{' '}
              · {hud.household.settlement.typeName}
            </dd>
            <dt>{t('profile.origin')}</dt>
            <dd>{p.originName}</dd>
            <dt>{t('profile.career')}</dt>
            <dd>{hud.career.kind === '' ? t('profile.no_career_yet') : hud.career.kind === 'nghe' ? `${hud.career.name} · ${hud.career.rankName}` : hud.career.name}</dd>
            <dt>{t('profile.household_career')}</dt>
            <dd>{hud.career.household.name}</dd>
            <dt>{t('profile.status')}</dt>
            <dd>
              <Tooltip content={`${p.statusRank.description} (${t('profile.status_ladder', { n: p.statusRank.index + 1, total: p.statusRank.total })})`}>
                <span className="underline">{p.statusRank.name}</span>
              </Tooltip>
            </dd>
            {p.examDegreeId !== 'none' && (
              <>
                <dt>{t('profile.degree')}</dt>
                <dd>{p.examDegreeName}</dd>
              </>
            )}
            <dt>{t('profile.stage')}</dt>
            <dd>
              {p.lifeStage}
              {p.isHead ? ` · ${t('profile.head')}` : ''}
            </dd>
          </dl>
        </div>
      </div>
      <div className="traits">
        {p.traits.map((tr) => (
          <Tooltip key={tr.id} content={tr.description}>
            <span className="chip">{tr.name}</span>
          </Tooltip>
        ))}
        {p.diseases.map((d) => (
          <Tooltip key={d.id} content={`${d.description} (${t('disease.remaining', { n: d.remainingMonths })})`}>
            <span className="chip disease-chip">{d.name}</span>
          </Tooltip>
        ))}
      </div>
      {p.mourningMonthsLeft > 0 && <div className="mourning">{t('profile.mourning', { n: p.mourningMonthsLeft })}</div>}
      <div className="mrz">
        <div>{code}</div>
        <div>{code2}</div>
      </div>
    </section>
  );
}

export function StatusCard({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
  const p = hud.player;
  const months = store.content.balance.calendar.months_per_year;
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('status.title')}</h3>
        <span className="muted small">{t('status.scale')}</span>
      </div>
      <StatBar label={t('stat.health')} value={p.health} max={p.healthMax} word={t(p.healthKey)} tone="good" detail={<ModifierList result={p.healthTrend} title={t('mods.health_per_year')} perYear={months} />} />
      <StatBar label={t('stat.stress')} value={p.stress} max={100} word={t(p.stressKey)} tone="bad" detail={<ModifierList result={p.stressTrend} title={t('mods.stress_per_year')} perYear={months} />} />
      <StatBar label={t('stat.satisfaction')} value={p.satisfaction} max={100} word={t(p.satisfactionKey)} tone="good" />
      <StatBar label={t('stat.reputation')} value={p.reputation + 100} max={200} word={`${t(p.reputationKey)} (${p.reputation >= 0 ? '+' : ''}${p.reputation})`} tone="good" />
      <StatBar label={t('stat.filial_piety')} value={p.filialPiety} max={100} word={String(p.filialPiety)} tone="good" />
      {p.scholarlyPrestige > 0 && <StatBar label={t('stat.scholarly_prestige')} value={p.scholarlyPrestige} max={100} word={String(p.scholarlyPrestige)} tone="good" />}
    </section>
  );
}

export function WealthCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const h = hud.household;
  const m = hud.manage;
  const [open, setOpen] = useState<'ledger' | 'spend' | null>(null);
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('wealth.title')}</h3>
        <span className="muted small">{t(`living.short.${h.livingStandard}`)}</span>
      </div>
      {!m.isHead && <p className="manage-note">{t('wealth.not_head', { who: m.headCall })}</p>}
      <div className="wealth-grid">
        <div>
          <div className="muted small">{t('ledger.money')}</div>
          <div className="big-num">{num(h.money)} <small>{t('unit.money')}</small></div>
        </div>
        <div>
          <div className="muted small">{t('ledger.food')}</div>
          <div className={`big-num ${h.foodWarning ? 'down' : ''}`}>{num(h.food)} <small>{t('unit.food')}</small></div>
          <div className="muted small">{t('ledger.food_months', { months: Number.isFinite(h.foodMonths) ? num(h.foodMonths) : '∞' })}</div>
        </div>
        <div>
          <div className="muted small">{t('ledger.debt')}</div>
          <div className={`big-num ${h.debt > 0 ? 'down' : ''}`}>{num(h.debt)} <small>{t('unit.money')}</small></div>
        </div>
        <div>
          <div className="muted small">{t('wealth.income')}</div>
          <div className="big-num">{h.regularIncome > 0 ? `+${num(h.regularIncome)}` : '—'} <small>{t('wealth.per_month')}</small></div>
        </div>
      </div>
      <div className="row">
        <button className="wide-btn" onClick={() => setOpen('ledger')}>
          {t('wealth.open_ledger')}
        </button>
        {m.isHead && (
          <button className="wide-btn" onClick={() => setOpen('spend')}>
            {t('wealth.open_spend')}
          </button>
        )}
      </div>
      {open === 'ledger' && (
        <Modal title={t('tab.ledger')} onClose={() => setOpen(null)}>
          <LedgerPanel hud={hud} />
        </Modal>
      )}
      {open === 'spend' && (
        <Modal title={t('wealth.open_spend')} onClose={() => setOpen(null)}>
          <SpendPanel hud={hud} />
        </Modal>
      )}
    </section>
  );
}

/** [1] Chi tiêu · đầu tư (chỉ chủ hộ): mức sống tự động hay chọn tay, tự trả nợ, chợ và tài sản. */
function SpendPanel({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const m = hud.manage;
  return (
    <div>
      <p className="muted small">{t('spend.intro')}</p>
      <h4>{t('living.title')}</h4>
      <label className="toggle">
        <input type="checkbox" checked={m.autoLivingStandard} onChange={(e) => store.dispatch({ type: 'setAutoManage', key: 'livingStandard', value: e.target.checked })} />
        {t('spend.auto_living')}
      </label>
      <div className="living">
        {hud.livingStandards.map((l) => (
          <button key={l.id} className={`living-opt ${hud.household.livingStandard === l.id ? 'active' : ''}`} title={l.description} onClick={() => store.dispatch({ type: 'setLivingStandard', id: l.id })}>
            <span>{l.name}</span>
            <span className="small">{t('living.cost', { money: num(l.monthlyMoney) })}</span>
          </button>
        ))}
      </div>
      <h4>{t('spend.debt_title')}</h4>
      <label className="toggle">
        <input type="checkbox" checked={m.autoRepayDebt} onChange={(e) => store.dispatch({ type: 'setAutoManage', key: 'repayDebt', value: e.target.checked })} />
        {t('spend.auto_repay')}
      </label>
      <h4>{t('tab.market')}</h4>
      <MarketPanel hud={hud} />
    </div>
  );
}

export function SkillsCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('skills.title')}</h3>
      </div>
      {hud.player.skills.every((s) => s.level === 0) && <p className="muted small">{t('skills.none_yet')}</p>}
      <div className="skills">
        {hud.player.skills
          .filter((s) => s.level > 0)
          .map((s) => (
            <Tooltip key={s.id} content={t('profile.skill_level', { level: s.level, xp: Math.floor(s.xp), next: Math.ceil(s.next) })}>
              <div className="skill">
                <span>{s.name}</span>
                <b>{t(s.bandKey)}</b>
              </div>
            </Tooltip>
          ))}
      </div>
    </section>
  );
}
