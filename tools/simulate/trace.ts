// Theo dõi một đời theo từng năm để chẩn đoán cân bằng: npm run trace -- --bot lieu_linh --seed x
import { GameSession } from '@core/api/GameSession';
import { getHudView } from '@core/api/queries';
import { loadNodeContent } from '../shared/nodeContent';
import { makeBot } from './bots';

const arg = (n: string, f: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : f;
};
const content = loadNodeContent();
const bot = makeBot(arg('bot', 'toi_uu'), arg('seed', 't'));
const s = GameSession.create(content, { seed: arg('seed', 't') });
const row = () => {
  const v = s.read(getHudView);
  const h = v.household;
  const f = (x: number) => x.toFixed(1).padStart(6);
  console.log(
    `${v.date.year} tuổi ${String(v.player.age).padStart(2)} | SK ${f(v.player.health)} (${f(v.player.healthTrend.value * 12)}/năm) stress ${f(v.player.stress)} | ` +
      `tiền ${f(h.money)} thóc ${f(h.food)} nợ ${f(h.debt)} | ${h.livingStandard} ruộng ${h.properties.find((p) => p.id === 'ruong')?.count ?? 0} người ${h.members.length} | ${v.focus.primary}`,
  );
};
s.read(getHudView) && bot.yearly(s.read(getHudView)).forEach((c) => s.dispatch(c));
row();
while (!s.state.gameOver && s.state.clock.year < content.balance.time.start_year + 100) {
  const r = s.tickMonth();
  if (r.minor) s.autoResolveMinor();
  if (r.decision) s.dispatch({ type: 'chooseOption', optionId: bot.choose(s.read(getHudView)) });
  if (s.state.gameOver) break;
  bot.monthly(s.read(getHudView)).forEach((c) => s.dispatch(c));
  if (r.newYear) {
    row();
    bot.yearly(s.read(getHudView)).forEach((c) => s.dispatch(c));
  }
}
console.log('Kết thúc:', s.state.gameOver);
const last = s.state.ledgerHistory.at(-1);
if (last) console.log('Sổ năm cuối:', last.entries.map((e) => `${e.category} ${e.money.toFixed(1)}q/${e.food.toFixed(1)}t`).join(' · '));
