// [0] Đọc file trong src/data/ và báo lỗi nếu viết sai.
// Không tự đọc đĩa: nhận danh sách file thô từ adapter (Vite ở trình duyệt, fs ở Node) để chạy được cả hai nơi.
import { parse as parseYaml } from 'yaml';
import type { ZodType, ZodTypeDef } from 'zod';
import {
  ambientFileSchema,
  balanceSchemas,
  cultureSchema,
  decisionEventFileSchema,
  focusFileSchema,
  langSchema,
  originSchema,
  propertyFileSchema,
  skillFileSchema,
  traitFileSchema,
  type AmbientTemplate,
  type Balance,
  type Culture,
  type DecisionEvent,
  type Focus,
  type LangPack,
  type Origin,
  type PropertyType,
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
  origins: Origin[];
  cultures: Culture[];
  events: DecisionEvent[];
  ambient: AmbientTemplate[];
  lang: Record<string, LangPack>;
  /** Tra cứu nhanh theo id. */
  index: {
    skill: Map<string, Skill>;
    trait: Map<string, Trait>;
    focus: Map<string, Focus>;
    property: Map<string, PropertyType>;
    origin: Map<string, Origin>;
    culture: Map<string, Culture>;
    event: Map<string, DecisionEvent>;
    ambient: Map<string, AmbientTemplate>;
    livingStandard: Map<string, Balance['living_standards']['levels'][number]>;
    lifeStage: Map<string, Balance['life']['life_stages'][number]>;
    harvestQuality: Map<string, Balance['economy']['harvest_qualities'][number]>;
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
  const events = collect('events/common', decisionEventFileSchema, 'events');
  const ambient = collect('events/ambient', ambientFileSchema, 'templates');
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
    origin: indexBy(origins, 'origins'),
    culture: indexBy(cultures, 'cultures'),
    event: indexBy(events, 'events'),
    ambient: indexBy(ambient, 'events/ambient'),
    livingStandard: indexBy((balance.living_standards as Balance['living_standards'] | undefined)?.levels ?? [], 'living_standards'),
    lifeStage: indexBy((balance.life as Balance['life'] | undefined)?.life_stages ?? [], 'life_stages'),
    harvestQuality: indexBy((balance.economy as Balance['economy'] | undefined)?.harvest_qualities ?? [], 'harvest_qualities'),
  };

  if (issues.length > 0) throw new ContentError(issues);

  return {
    balance: balance as Balance,
    skills,
    traits,
    focuses,
    properties,
    origins,
    cultures,
    events,
    ambient,
    lang,
    index,
  };
}
