// [1] Cột trái: Hồ sơ cá nhân (kiểu tờ khai, có chân dung pixel), Trạng thái, Gia sản, Kỹ năng
import { useState } from 'react';
import type { HudView } from '@core/index';
import { Modal } from '../../components/Modal';
import { ModifierList } from '../../components/ModifierList';
import { Portrait } from '../../components/Portrait';
import { StatBar } from '../../components/StatBar';
import { Tooltip } from '../../components/Tooltip';
import { YearClose } from '../../components/YearClose';
import { modernMoney, num, useSnapshot, useUi } from '../../context';
import { LedgerPanel } from './LedgerPanel';
import { MarketPanel } from './MarketPanel';
import { PropertiesPanel } from '../Properties/PropertiesPanel';

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
        {scene && <Portrait id={p.id} sex={p.sex} ageGroup={p.ageGroup} cultureSet={scene.cultureSet} season={scene.season} scale={4} />}
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

/** [1.5] Nhà ở, ruộng, kho thóc, nợ, của khác của hộ (dùng chung cho gia sản của bạn và gia cảnh nhà cha mẹ). */
function Holdings({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const h = hud.household;
  const u = hud.wealthUnits;
  const land = h.properties.filter((p) => p.farmland).reduce((sum, p) => sum + p.count, 0);
  const home = h.properties.find((p) => p.category === 'house');
  const others = h.properties.filter((p) => !p.farmland && p.category !== 'house');
  return (
    <dl className="holdings">
      {home && (
        <>
          <dt>{t('wealth.home')}</dt>
          <dd>{home.name}</dd>
        </>
      )}
      <dt>{t('wealth.land')}</dt>
      <dd>{land > 0 ? t('wealth.land_value', { sao: land, m2: Math.round(land * u.m2PerSao).toLocaleString(t('format.locale')) }) : t('wealth.no_land')}</dd>
      <dt>{t('wealth.food')}</dt>
      <dd className={h.foodWarning ? 'down' : ''}>
        {t('wealth.food_value', { months: Number.isFinite(h.foodMonths) ? num(h.foodMonths) : '∞', food: num(h.food) })}
      </dd>
      {h.debt > 0 && (
        <>
          <dt>{t('ledger.debt')}</dt>
          <dd className="down">
            {num(h.debt)} {t('unit.money')}
          </dd>
        </>
      )}
      {others.length > 0 && (
        <>
          <dt>{t('wealth.others')}</dt>
          <dd>{others.map((p) => `${p.name} ${p.count} ${p.unit}`).join(' · ')}</dd>
        </>
      )}
      {hud.ventures.owned.length > 0 && (
        <>
          <dt>{t('wealth.ventures_label')}</dt>
          <dd>
            {hud.ventures.owned
              .map(
                (v) =>
                  `${v.name} (${v.profitYear >= 0 ? '+' : ''}${num(v.profitYear)} ${t('unit.money')}/${t('wealth.per_year')})`,
              )
              .join(' · ')}
          </dd>
        </>
      )}
      {hud.npcLoans.lent.length > 0 && (
        <>
          <dt>{t('wealth.loans_lent_label')}</dt>
          <dd>
            {hud.npcLoans.lent.map((l) => `${l.npcCall}: ${num(l.amount)} ${t('unit.money')}`).join(' · ')}
          </dd>
        </>
      )}
    </dl>
  );
}

/** [1.5] Ô số lớn kiểu 1in8b: số bằng quan, dòng nhỏ quy ra giá ngày nay (hoặc lời chú thích khi chưa có). */
function BigMoney({ label, value, unit, note }: { label: string; value: number | null; unit: string; note?: string }) {
  const { t } = useUi();
  return (
    <div>
      <div className="muted small">{label}</div>
      <div className={`big-num ${value !== null && value < 0 ? 'down' : ''}`}>
        {value !== null ? num(value) : '—'} {value !== null && <small>{unit}</small>}
      </div>
      <div className="muted small">{note ?? t('wealth.no_income')}</div>
    </div>
  );
}

export function WealthCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const h = hud.household;
  const m = hud.manage;
  const u = hud.wealthUnits;
  const ps = hud.personal;
  const [open, setOpen] = useState<'ledger' | 'spend' | 'properties' | null>(null);
  const modern = (v: number) => t('wealth.modern', { value: modernMoney(t, v, u.modernPerQuan) });
  // [1.5] Chưa làm chủ hộ: thẻ là của riêng bạn (kiểu 1in8b); nhà cha mẹ chỉ là gia cảnh
  const own = ps.active;
  const netWorth = own ? ps.money : h.netWorth;
  const income = own ? ps.incomeYear : h.incomeYear;
  const close = own ? ps.yearClose : h.yearClose;
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t(own ? 'wealth.title_personal' : 'wealth.title')}</h3>
        <span className="muted small">{t(`living.short.${h.livingStandard}`)}</span>
      </div>
      {own && <p className="manage-note">{t('wealth.personal_note', { who: m.headCall })}</p>}
      <div className="wealth-grid">
        <BigMoney label={t('wealth.net_worth')} value={netWorth} unit={t('unit.money')} note={modern(netWorth)} />
        <BigMoney
          label={t('wealth.income_year')}
          value={income > 0 ? income : null}
          unit={t('wealth.per_year')}
          note={income > 0 ? modern(income) : own && ps.young ? t('wealth.young_note') : t('wealth.no_income')}
        />
      </div>
      {close ? <YearClose close={close} /> : <p className="muted small">{t('wealth.first_year')}</p>}
      {own ? (
        <>
          <h4>
            {t('wealth.family_title', { who: m.headCall })} · <span className="muted">{t('wealth.family_band')}:</span> {t(ps.familyKey)}
          </h4>
          <Holdings hud={hud} />
        </>
      ) : (
        <Holdings hud={hud} />
      )}
      <div className="row">
        <button className="wide-btn" onClick={() => setOpen('ledger')}>
          {t('wealth.open_ledger')}
        </button>
        {m.isHead && (
          <>
            <button className="wide-btn" onClick={() => setOpen('properties')}>
              {t('wealth.open_properties')}
            </button>
            <button className="wide-btn" onClick={() => setOpen('spend')}>
              {t('wealth.open_spend')}
            </button>
          </>
        )}
      </div>
      {open === 'ledger' && (
        <Modal title={t('tab.ledger')} onClose={() => setOpen(null)}>
          <LedgerPanel hud={hud} />
        </Modal>
      )}
      {open === 'properties' && (
        <Modal title={t('properties.modal_title')} onClose={() => setOpen(null)}>
          <PropertiesPanel hud={hud} />
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
      <h4>{t('spend.saving_title')}</h4>
      <label className="toggle">
        <input type="checkbox" checked={m.autoSellSurplus} onChange={(e) => store.dispatch({ type: 'setAutoManage', key: 'sellSurplus', value: e.target.checked })} />
        {t('spend.auto_sell_surplus')}
      </label>
      <label className="toggle">
        <input type="checkbox" checked={m.autoInvest} onChange={(e) => store.dispatch({ type: 'setAutoManage', key: 'invest', value: e.target.checked })} />
        {t('spend.auto_invest')}
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
