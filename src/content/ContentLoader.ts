// [0] Đọc file trong src/data/ và báo lỗi nếu viết sai.
// Không tự đọc đĩa: nhận danh sách file thô từ adapter (Vite ở trình duyệt, fs ở Node) để chạy được cả hai nơi.
import { parse as parseYaml } from 'yaml';
import type { ZodType, ZodTypeDef } from 'zod';
import {
  ambitionFileSchema,
  ambientFileSchema,
  balanceSchemas,
  careerFileSchema,
  chronicleFileSchema,
  civilizationSchema,
  cultureSchema,
  decisionEventFileSchema,
  diseaseFileSchema,
  focusFileSchema,
  langSchema,
  originSchema,
  propertyFileSchema,
  scenarioFileSchema,
  settlementTypeFileSchema,
  skillFileSchema,
  traitFileSchema,
  type Ambition,
  type AmbientTemplate,
  type Balance,
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
  type PropertyType,
  type Scenario,
  type SettlementType,
  type Skill,
  type Trait,
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
  diseases: Disease[];
  ambitions: Ambition[];
  careers: Career[];
  civilizations: Civilization[];
  settlementTypes: SettlementType[];
  chronicle: { startReign: string; entries: ChronicleEntry[] };
  origins: Origin[];
  cultures: Culture[];
  events: DecisionEvent[];
  ambient: AmbientTemplate[];
  scenarios: Scenario[];
  lang: Record<string, LangPack>;
  /** Tra cứu nhanh theo id. */
  index: {
    skill: Map<string, Skill>;
    trait: Map<string, Trait>;
    focus: Map<string, Focus>;
    property: Map<string, PropertyType>;
    disease: Map<string, Disease>;
    ambition: Map<string, Ambition>;
    career: Map<string, Career>;
    civilization: Map<string, Civilization>;
    settlementType: Map<string, SettlementType>;
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
  const diseases = collect('diseases', diseaseFileSchema, 'diseases');
  const ambitions = collect('ambitions', ambitionFileSchema, 'ambitions');
  const careers = collect('careers', careerFileSchema, 'careers');
  const civilizations = single('civilizations', civilizationSchema);
  const settlementTypes = collect('world', settlementTypeFileSchema, 'settlement_types');
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
  const ambient = collect('events/ambient', ambientFileSchema, 'templates');
  const scenarios = collect('scenarios', scenarioFileSchema, 'scenarios');
  const origins = single('origins', originSchema);
  const cultures = single('cultures', cultureSchema);

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
    disease: indexBy(diseases, 'diseases'),
    ambition: indexBy(ambitions, 'ambitions'),
    career: indexBy(careers, 'careers'),
    civilization: indexBy(civilizations, 'civilizations'),
    settlementType: indexBy(settlementTypes, 'world/settlement_types'),
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
  };

  if (issues.length > 0) throw new ContentError(issues);

  return {
    balance: balance as Balance,
    skills,
    traits,
    focuses,
    properties,
    diseases,
    ambitions,
    careers,
    civilizations,
    settlementTypes,
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
