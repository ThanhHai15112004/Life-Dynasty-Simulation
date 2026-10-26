// [1] Cột phải: Gia đình (kèm chạy chữa người ốm), Người quanh đời, Bản đồ cuộc đời (1 ô = 1 năm), Biên niên thiên hạ
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { Portrait } from '../../components/Portrait';
import { Tooltip } from '../../components/Tooltip';
import { num, useSnapshot, useUi } from '../../context';

export function FamilyCard({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
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
        <span className="muted small">{t('family.count', { n: hud.household.members.length })}</span>
      </div>
      {others.length === 0 && <p className="muted small">{t('family.alone')}</p>}
      <ul className="people-list">
        {others.map((m) => (
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

export function RelationsCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('relations.title')}</h3>
        <span className="muted small">{t('relations.subtitle')}</span>
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

export function ChronicleCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('chronicle.title')}</h3>
        <span className="muted small">{hud.reign.name ? t('header.reign', { name: hud.reign.name, n: hud.reign.year }) : ''}</span>
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
