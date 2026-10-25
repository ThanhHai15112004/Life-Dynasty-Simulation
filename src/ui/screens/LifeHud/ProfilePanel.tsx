// [0] Hồ sơ: tên, tuổi, giai đoạn đời, sức khỏe/tinh thần (bằng lời + modifier), tính cách, kỹ năng, người trong nhà
import type { HudView } from '@core/index';
import { ModifierList } from '../../components/ModifierList';
import { StatBar } from '../../components/StatBar';
import { Tooltip } from '../../components/Tooltip';
import { useUi } from '../../context';

export function ProfilePanel({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
  const p = hud.player;
  const months = store.content.balance.calendar.months_per_year;
  return (
    <section className="panel profile">
      <h3>{p.name}</h3>
      <div className="muted">
        {t('profile.age', { age: p.age })} · {p.lifeStage}
        {p.isHead ? ` · ${t('profile.head')}` : ''}
      </div>
      <div className="muted small">
        {hud.career.name} · {hud.career.rankName}
      </div>
      <StatBar
        label={t('stat.health')}
        value={p.health}
        max={p.healthMax}
        word={t(p.healthKey)}
        tone="good"
        detail={<ModifierList result={p.healthTrend} title={t('mods.health_per_year')} perYear={months} />}
      />
      <StatBar
        label={t('stat.stress')}
        value={p.stress}
        max={100}
        word={t(p.stressKey)}
        tone="bad"
        detail={<ModifierList result={p.stressTrend} title={t('mods.stress_per_year')} perYear={months} />}
      />
      <StatBar
        label={t('stat.satisfaction')}
        value={p.satisfaction}
        max={100}
        word={t(p.satisfactionKey)}
        tone="good"
      />
      <div className="stat-head small">
        <span>{t('stat.reputation')}</span>
        <span className="stat-word">
          {t(p.reputationKey)} ({p.reputation >= 0 ? `+${p.reputation}` : p.reputation})
        </span>
      </div>
      {p.diseases.length > 0 && (
        <div className="traits">
          {p.diseases.map((d) => (
            <Tooltip key={d.id} content={`${d.description} (${t('disease.remaining', { n: d.remainingMonths })})`}>
              <span className="chip disease-chip">{d.name}</span>
            </Tooltip>
          ))}
        </div>
      )}
      <div className="traits">
        {p.traits.map((tr) => (
          <Tooltip key={tr.id} content={tr.description}>
            <span className="chip">{tr.name}</span>
          </Tooltip>
        ))}
      </div>
      <div className="skills">
        {p.skills.map((s) => (
          <Tooltip key={s.id} content={t('profile.skill_xp', { xp: Math.floor(s.xp), next: Math.ceil(s.next) })}>
            <div className="skill">
              <span>{s.name}</span>
              <b>{s.level}</b>
            </div>
          </Tooltip>
        ))}
      </div>
      <h4>{t('profile.family')}</h4>
      <ul className="members">
        {hud.household.members.map((m) => (
          <li key={m.id}>
            <span>{m.isPlayer ? t('profile.you') : m.call}</span>
            <span className="muted">
              {t('profile.age', { age: m.age })} · {t(m.healthKey)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
