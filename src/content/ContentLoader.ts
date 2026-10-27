// [0] Đọc file trong src/data/ và báo lỗi nếu viết sai.
// Không tự đọc đĩa: nhận danh sách file thô từ adapter (Vite ở trình duyệt, fs ở Node) để chạy được cả hai nơi.
import { parse as parseYaml } from 'yaml';
import type { ZodType, ZodTypeDef } from 'zod';
import {
  ambitionFileSchema,
  ambientFileSchema,
  balanceSchemas,
  bookmarkFileSchema,
  careerFileSchema,
  chronicleFileSchema,
  civilizationSchema,
  cultureSchema,
  decisionEventFileSchema,
  diseaseFileSchema,
  focusFileSchema,
  langSchema,
  originSchema,
  polityFileSchema,
  propertyFileSchema,
  scenarioFileSchema,
  storySchema,
  settlementTypeFileSchema,
  skillFileSchema,
  traitFileSchema,
  ventureFileSchema,
  type Ambition,
  type AmbientTemplate,
  type Balance,
  type Bookmark,
  type Career,
  type ChronicleEntry,
  type Civilization,
  type Culture,
  type DecisionEvent,
  type Disease,
  type FateMode,
  type Focus,
  type LangPack,
  type Origin,
  type PlayMode,
  type Polity,
  type PropertyType,
  type Scenario,
  type SettlementType,
  type SideJob,
  type Skill,
  type StoryContent,
  type Trait,
  type VentureDef,
} from './schemas';

export interface RawFile {
  /** Đường dẫn tương đối tính từ gốc dự án, dạng 'src/data/balance/time.yaml'. */
  path: string;
  text: string;
}

export interface ContentBundle {
  balance: Balance;
  skills: Skill[];
  traits: Trait[];
  focuses: Focus[];
  properties: PropertyType[];
  ventures: VentureDef[];
  diseases: Disease[];
  ambitions: Ambition[];
  careers: Career[];
  sideJobs: SideJob[];
  civilizations: Civilization[];
  settlementTypes: SettlementType[];
  bookmarks: Bookmark[];
  defaultBookmarkId: string;
  polities: Polity[];
  chronicle: { startReign: string; entries: ChronicleEntry[] };
  origins: Origin[];
  cultures: Culture[];
  events: DecisionEvent[];
  /** Lớp câu chuyện: bạn cùng lứa, mốc suy ngẫm, văn bia (src/data/story/). */
  story: StoryContent;
  ambient: AmbientTemplate[];
  scenarios: Scenario[];
  lang: Record<string, LangPack>;
  /** Tra cứu nhanh theo id. */
  index: {
    skill: Map<string, Skill>;
    trait: Map<string, Trait>;
    focus: Map<string, Focus>;
    property: Map<string, PropertyType>;
    venture: Map<string, VentureDef>;
    disease: Map<string, Disease>;
    ambition: Map<string, Ambition>;
    career: Map<string, Career>;
    sideJob: Map<string, SideJob>;
    civilization: Map<string, Civilization>;
    settlementType: Map<string, SettlementType>;
    bookmark: Map<string, Bookmark>;
    polity: Map<string, Polity>;
    chronicle: Map<string, ChronicleEntry>;
    origin: Map<string, Origin>;
    culture: Map<string, Culture>;
    event: Map<string, DecisionEvent>;
    ambient: Map<string, AmbientTemplate>;
    scenario: Map<string, Scenario>;
    livingStandard: Map<string, Balance['living_standards']['levels'][number]>;
    lifeStage: Map<string, Balance['life']['life_stages'][number]>;
    harvestQuality: Map<string, Balance['economy']['harvest_qualities'][number]>;
    fateMode: Map<string, FateMode>;
    playMode: Map<string, PlayMode>;
  };
}

export class ContentError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Dữ liệu nội dung có ${issues.length} lỗi:\n- ${issues.join('\n- ')}`);
    this.name = 'ContentError';
  }
}

/** Nhóm file theo thư mục con của data/. */
function groupFiles(files: RawFile[]): Map<string, RawFile[]> {
  const groups = new Map<string, RawFile[]>();
  for (const f of files) {
    const rel = f.path.replace(/\\/g, '/').replace(/^\/?(.*?)data\//, '');
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    const list = groups.get(dir) ?? [];
    list.push({ path: rel, text: f.text });
    groups.set(dir, list);
  }
  for (const list of groups.values()) list.sort((a, b) => a.path.localeCompare(b.path));
  return groups;
}

function baseName(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  return name.replace(/\.(ya?ml|json)$/, '');
}

export function loadContent(files: RawFile[]): ContentBundle {
  const issues: string[] = [];
  const groups = groupFiles(files);

  const parseFile = <T>(file: RawFile, schema: ZodType<T, ZodTypeDef, unknown>): T | undefined => {
    let raw: unknown;
    try {
      raw = file.path.endsWith('.json') ? JSON.parse(file.text) : parseYaml(file.text);
    } catch (e) {
      issues.push(`${file.path}: không đọc được (${(e as Error).message})`);
      return undefined;
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push(`${file.path} › ${issue.path.join('.') || '(gốc)'}: ${issue.message}`);
      }
      return undefined;
    }
    return result.data;
  };

  const collect = <T, K extends string>(
    dir: string,
    schema: ZodType<Record<K, T[]>, ZodTypeDef, unknown>,
    key: K,
  ): T[] => {
    const out: T[] = [];
    for (const f of groups.get(dir) ?? []) {
      const parsed = parseFile(f, schema);
      if (parsed) out.push(...parsed[key]);
    }
    return out;
  };

  const single = <T>(dir: string, schema: ZodType<T, ZodTypeDef, unknown>): T[] =>
    (groups.get(dir) ?? []).map((f) => parseFile(f, schema)).filter((x): x is T => x !== undefined);

  // Cân bằng: mỗi file một schema theo tên file
  const balance: Partial<Record<keyof Balance, unknown>> = {};
  const balanceFiles = new Map((groups.get('balance') ?? []).map((f) => [baseName(f.path), f]));
  for (const key of Object.keys(balanceSchemas) as (keyof Balance)[]) {
    const file = balanceFiles.get(key);
    if (!file) {
      issues.push(`src/data/balance/${key}.yaml: thiếu file`);
      continue;
    }
    balance[key] = parseFile(file, balanceSchemas[key] as ZodType<unknown, ZodTypeDef, unknown>);
  }

  const skills = collect('skills', skillFileSchema, 'skills');
  const traits = collect('traits', traitFileSchema, 'traits');
  const focuses = collect('focuses', focusFileSchema, 'focuses');
  const properties = collect('properties', propertyFileSchema, 'properties');
  const ventures = collect('ventures', ventureFileSchema, 'ventures');
  const diseases = collect('diseases', diseaseFileSchema, 'diseases');
  const ambitions = collect('ambitions', ambitionFileSchema, 'ambitions');
  const careerFiles = single('careers', careerFileSchema);
  const careers = careerFiles.flatMap((f) => f.careers);
  const sideJobs = careerFiles.flatMap((f) => f.side_jobs);
  const civilizations = single('civilizations', civilizationSchema).sort((a, b) =>
    a.id === 'nho_giao' ? -1 : b.id === 'nho_giao' ? 1 : a.id.localeCompare(b.id),
  );
  const settlementTypes = collect('world', settlementTypeFileSchema, 'settlement_types');
  const bookmarkFiles = single('world/bookmarks', bookmarkFileSchema);
  const bookmarks = bookmarkFiles.flatMap((f) => f.bookmarks);
  const defaultBookmarkId = bookmarkFiles.find((f) => f.default_bookmark)?.default_bookmark ?? bookmarks[0]?.id ?? '';
  const polities = collect('world/polities', polityFileSchema, 'polities');
  const chronicleFiles = single('chronicle', chronicleFileSchema);
  const chronicle = {
    startReign: chronicleFiles.find((f) => f.start_reign)?.start_reign ?? '',
    entries: chronicleFiles.flatMap((f) => f.entries),
  };
  const events = [
    ...collect('events/common', decisionEventFileSchema, 'events'),
    ...collect('events/careers', decisionEventFileSchema, 'events'),
    ...collect('events/crossover', decisionEventFileSchema, 'events'),
    ...collect('events/civilizations', decisionEventFileSchema, 'events'),
  ];
  // Sự kiện không ghi giai đoạn đời: gán giai đoạn mặc định (sự kiện hẹn trước giữ nguyên để chuỗi không đứt)
  const defaultStages = (balance.director as Balance['director'] | undefined)?.default_event_life_stages ?? [];
  if (defaultStages.length > 0) {
    for (const ev of events) if (!ev.life_stages && !ev.scheduled_only) ev.life_stages = [...defaultStages];
  }
  const ambient = collect('events/ambient', ambientFileSchema, 'templates');
  const scenarios = collect('scenarios', scenarioFileSchema, 'scenarios');
  const origins = single('origins', originSchema);
  const cultures = single('cultures', cultureSchema).sort((a, b) =>
    a.id === 'viet' ? -1 : b.id === 'viet' ? 1 : a.id.localeCompare(b.id),
  );
  const storyFiles = single('story', storySchema);
  if (storyFiles.length !== 1) issues.push(`src/data/story/: cần đúng một file (đang có ${storyFiles.length})`);

  const lang: Record<string, LangPack> = {};
  for (const f of groups.get('lang') ?? []) {
    const parsed = parseFile(f, langSchema);
    if (parsed) lang[baseName(f.path)] = parsed;
  }

  const indexBy = <T extends { id: string }>(list: T[], label: string): Map<string, T> => {
    const map = new Map<string, T>();
    for (const item of list) {
      if (map.has(item.id)) issues.push(`${label}: trùng id "${item.id}"`);
      map.set(item.id, item);
    }
    return map;
  };

  const index = {
    skill: indexBy(skills, 'skills'),
    trait: indexBy(traits, 'traits'),
    focus: indexBy(focuses, 'focuses'),
    property: indexBy(properties, 'properties'),
    venture: indexBy(ventures, 'ventures'),
    disease: indexBy(diseases, 'diseases'),
    ambition: indexBy(ambitions, 'ambitions'),
    career: indexBy(careers, 'careers'),
    sideJob: indexBy(sideJobs, 'careers/side_jobs'),
    civilization: indexBy(civilizations, 'civilizations'),
    settlementType: indexBy(settlementTypes, 'world/settlement_types'),
    bookmark: indexBy(bookmarks, 'world/bookmarks'),
    polity: indexBy(polities, 'world/polities'),
    chronicle: indexBy(chronicle.entries, 'chronicle'),
    origin: indexBy(origins, 'origins'),
    culture: indexBy(cultures, 'cultures'),
    event: indexBy(events, 'events'),
    ambient: indexBy(ambient, 'events/ambient'),
    scenario: indexBy(scenarios, 'scenarios'),
    livingStandard: indexBy((balance.living_standards as Balance['living_standards'] | undefined)?.levels ?? [], 'living_standards'),
    lifeStage: indexBy((balance.life as Balance['life'] | undefined)?.life_stages ?? [], 'life_stages'),
    harvestQuality: indexBy((balance.economy as Balance['economy'] | undefined)?.harvest_qualities ?? [], 'harvest_qualities'),
    fateMode: indexBy((balance.fate_modes as Balance['fate_modes'] | undefined)?.modes ?? [], 'fate_modes'),
    playMode: indexBy((balance.fate_modes as Balance['fate_modes'] | undefined)?.play_modes ?? [], 'play_modes'),
  };

  if (issues.length > 0) throw new ContentError(issues);

  return {
    story: storyFiles[0],
    balance: balance as Balance,
    skills,
    traits,
    focuses,
    properties,
    ventures,
    diseases,
    ambitions,
    careers,
    sideJobs,
    civilizations,
    settlementTypes,
    bookmarks,
    defaultBookmarkId,
    polities,
    chronicle,
    origins,
    cultures,
    events,
    ambient,
    scenarios,
    lang,
    index,
  };
}
