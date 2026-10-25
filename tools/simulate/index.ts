// Mô phỏng headless: npm run simulate -- [--lives 200] [--bot toi_uu|all] [--start-age 16] [--seed s]
// In KPI cân bằng so với ngưỡng trong kpi-targets.json
import { readFileSync } from 'node:fs';
import { loadNodeContent } from '../shared/nodeContent';
import { BOT_NAMES, makeBot } from './bots';
import { runLife, type LifeResult } from './run';

type Range = [number, number];
const targets = JSON.parse(readFileSync(new URL('./kpi-targets.json', import.meta.url), 'utf8')) as Record<string, Range | number>;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const lives = Number(arg('lives', '200'));
const botArg = arg('bot', 'all');
const seed = arg('seed', 'sim');
const startAgeArg = arg('start-age', '');
const startAge = startAgeArg === '' ? undefined : Number(startAgeArg);
const maxYears = targets.max_years as number;

const content = loadNodeContent();
const bots = botArg === 'all' ? [...BOT_NAMES] : [botArg];
const t0 = performance.now();

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const mark = (key: string, v: number) => {
  const r = targets[key] as Range | undefined;
  if (!r) return '';
  return v >= r[0] && v <= r[1] ? '  ✔' : `  ✖ (mục tiêu ${r[0]}–${r[1]})`;
};

const all: LifeResult[] = [];
for (const b of bots) {
  const results: LifeResult[] = [];
  for (let i = 0; i < lives; i++) results.push(runLife(content, makeBot(b, `${seed}-${i}`), `${seed}-${b}-${i}`, startAge, maxYears));
  all.push(...results);

  const dead = results.filter((r) => r.deathAge !== null);
  const totalYears = results.reduce((a, r) => a + r.years, 0);
  const lifespan = mean(dead.map((r) => r.deathAge!));
  const decisionsPerYear = totalYears ? results.reduce((a, r) => a + r.decisions, 0) / totalYears : 0;
  const repeatRate = results.reduce((a, r) => a + r.repeatedEvents, 0) / Math.max(1, results.reduce((a, r) => a + r.decisions, 0));
  const unexpected = dead.filter((r) => r.causeId === 'tai_nan').length / Math.max(1, dead.length);
  const story = mean(results.map((r) => r.storyLinesPerYear));
  const loops = totalYears ? results.reduce((a, r) => a + r.openLoopsSum, 0) / totalYears : 0;
  const msPerMonth = content.balance.time.ms_per_month_at_1x / content.balance.time.speeds[content.balance.time.default_speed_index];
  const minutes = mean(results.map((r) => (r.years * 12 * msPerMonth) / 60000 + (r.decisions * (targets.seconds_per_decision as number)) / 60));

  const causes = new Map<string, number>();
  dead.forEach((r) => causes.set(r.causeId!, (causes.get(r.causeId!) ?? 0) + 1));

  console.log(`\n══ Bot: ${b} · ${lives} đời ══`);
  console.log(`Tuổi thọ TB (người chơi):     ${lifespan.toFixed(1)}${mark('lifespan_mean', lifespan)}`);
  console.log(`Quyết định / năm:             ${decisionsPerYear.toFixed(2)}${mark('decisions_per_year', decisionsPerYear)}`);
  console.log(`Tỷ lệ sự kiện lặp trong đời:  ${pct(repeatRate)}${mark('event_repeat_rate', repeatRate)}`);
  console.log(`Chết hoàn toàn bất ngờ:       ${pct(unexpected)}${mark('unexpected_death_rate', unexpected)}`);
  console.log(`Dòng chuyện kể / năm:         ${story.toFixed(2)}${mark('story_lines_per_year', story)}`);
  console.log(`Việc dang dở TB:              ${loops.toFixed(2)}${mark('open_loops_mean', loops)}`);
  console.log(`Phút chơi ước tính / đời:     ${minutes.toFixed(1)}${mark('minutes_per_life', minutes)}`);
  console.log(`Ruộng cuối đời TB:            ${mean(results.map((r) => r.farmlandEnd)).toFixed(2)} sào · tiền ${mean(results.map((r) => r.moneyEnd)).toFixed(1)} · nợ ${mean(results.map((r) => r.debtEnd)).toFixed(1)}`);
  console.log(`Từng nợ > 30 quan:            ${pct(results.filter((r) => r.everInDebtOver30).length / results.length)}`);
  console.log(`Nguyên nhân chết:             ${[...causes].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${pct(n / dead.length)}`).join(' · ')}`);
}

if (startAge === 0) {
  const childMortality = all.filter((r) => r.playerDiedYoung).length / all.length;
  console.log(`\nTử vong trẻ em (người chơi chết trước 6 tuổi): ${pct(childMortality)}${mark('child_mortality', childMortality)}`);
}
console.log(`\n(${all.length} đời trong ${((performance.now() - t0) / 1000).toFixed(1)} giây)`);
