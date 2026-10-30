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
  eraStoryFileSchema,
  focusFileSchema,
  langSchema,
  lifestyleFileSchema,
  organizationFileSchema,
  originFileSchema,
  polityFileSchema,
  propertyFileSchema,
  religionFileSchema,
  scenarioFileSchema,
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
  type Lifestyle,
  type OrganizationDef,
  type Origin,
  type PlayMode,
  type Polity,
  type PropertyType,
  type Religion,
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
  lifestyles: Lifestyle[];
  properties: PropertyType[];
  ventures: VentureDef[];
  organizations: OrganizationDef[];
  diseases: Disease[];
  ambitions: Ambition[];
  careers: Career[];
  sideJobs: SideJob[];
  civilizations: Civilization[];
  settlementTypes: SettlementType[];
  bookmarks: Bookmark[];
  defaultBookmarkId: string;
  /** Danh sách mốc thời đại được khai báo qua thư mục con trong src/data/eras/<NN_bookmark_id>/. */
  eraFolders: string[];
  polities: Polity[];
  chronicle: { startReign: string; startReignByEra: Record<string, string>; entries: ChronicleEntry[] };
  origins: Origin[];
  cultures: Culture[];
  religions: Religion[];
  events: DecisionEvent[];
  /** Lớp câu chuyện mặc định và theo từng thời đại: bạn cùng lứa, mốc suy ngẫm, văn bia (src/data/eras/<NN>/story.yaml). */
  story: StoryContent;
  storyByEra: Record<string, StoryContent>;
  ambient: AmbientTemplate[];
  scenarios: Scenario[];
  lang: Record<string, LangPack>;
  /** Tra cứu nhanh theo id. */
  index: {
    skill: Map<string, Skill>;
    trait: Map<string, Trait>;
    focus: Map<string, Focus>;
    lifestyle: Map<string, Lifestyle>;
    property: Map<string, PropertyType>;
    venture: Map<string, VentureDef>;
    organization: Map<string, OrganizationDef>;
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
    religion: Map<string, Religion>;
    event: Map<string, DecisionEvent>;
    ambient: Map<string, AmbientTemplate>;
    /** Ghi đè mẫu thông báo hệ thống (sys.*) riêng theo từng thời đại (bookmarkId -> Map<templateId, AmbientTemplate>). */
    ambientByEra: Map<string, Map<string, AmbientTemplate>>;
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

  const applyDefaultEras = <T>(items: T[], defaultEras?: string[]): T[] => {
    if (!defaultEras || defaultEras.length === 0) return items;
    for (const item of items) {
      const rec = item as Record<string, unknown>;
      if (!rec.eras) rec.eras = [...defaultEras];
    }
    return items;
  };

  const collect = <P extends object, K extends keyof P & string>(
    dir: string,
    schema: ZodType<P, ZodTypeDef, unknown>,
    key: K,
    folderEras?: string[],
  ): P[K] extends (infer Item)[] ? Item[] : never => {
    const out: unknown[] = [];
    for (const f of groups.get(dir) ?? []) {
      const parsed = parseFile(f, schema);
      if (parsed) {
        const list = parsed[key] as unknown as unknown[];
        const fileEras = (parsed as { eras?: string[] }).eras;
        out.push(...applyDefaultEras(list, fileEras ?? folderEras));
      }
    }
    return out as P[K] extends (infer Item)[] ? Item[] : never;
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
  const focuses: Focus[] = [];
  const lifestyles: Lifestyle[] = [];
  const properties: PropertyType[] = [];
  const ventures: VentureDef[] = [];
  const organizations: OrganizationDef[] = [];
  const diseases: Disease[] = [];
  const ambitions: Ambition[] = [];
  const careers: Career[] = [];
  const sideJobs: SideJob[] = [];
  const civilizations = single('civilizations', civilizationSchema).sort((a, b) =>
    a.id === 'nho_giao' ? -1 : b.id === 'nho_giao' ? 1 : a.id.localeCompare(b.id),
  );
  const settlementTypes = collect('world', settlementTypeFileSchema, 'settlement_types');
  const bookmarkFiles = single('world/bookmarks', bookmarkFileSchema);
  const bookmarks = bookmarkFiles.flatMap((f) => f.bookmarks);
  const defaultBookmarkId = bookmarkFiles.find((f) => f.default_bookmark)?.default_bookmark ?? bookmarks[0]?.id ?? '';
  const polities = collect('world/polities', polityFileSchema, 'polities');
  const startReignByEra: Record<string, string> = {};
  const chronicle = {
    startReign: '',
    startReignByEra,
    entries: [] as ChronicleEntry[],
  };
  const events: DecisionEvent[] = [];
  const ambient = collect('events/ambient', ambientFileSchema, 'templates');
  const ambientByEra = new Map<string, Map<string, AmbientTemplate>>();
  const scenarios: Scenario[] = [];
  const origins: Origin[] = [];
  const storyByEra: Record<string, StoryContent> = {};

  // Nạp các gói nội dung riêng theo từng Thời đại tại src/data/eras/<NN_bookmark_id>/
  const eraFolders: string[] = [];
  const eraDirNames = [...groups.keys()].filter((d) => d.startsWith('eras/')).sort();
  for (const dir of eraDirNames) {
    const folderName = dir.slice('eras/'.length);
    if (folderName.includes('/')) {
      issues.push(`src/data/${dir}: thư mục thời đại chỉ hỗ trợ 1 cấp con trực tiếp dưới src/data/eras/`);
      continue;
    }
    const eraBookmarkId = folderName.replace(/^\d+_/, '');
    if (!eraFolders.includes(eraBookmarkId)) eraFolders.push(eraBookmarkId);
    const defaultEraList = [eraBookmarkId];
    if (!ambientByEra.has(eraBookmarkId)) ambientByEra.set(eraBookmarkId, new Map());

    for (const f of groups.get(dir) ?? []) {
      const name = baseName(f.path);
      if (name === 'origins' || name.startsWith('origins_')) {
        const parsed = parseFile(f, originFileSchema);
        if (parsed) origins.push(...applyDefaultEras(parsed.origins, parsed.eras ?? defaultEraList));
      } else if (name === 'focuses' || name.startsWith('focuses_')) {
        const parsed = parseFile(f, focusFileSchema);
        if (parsed) focuses.push(...applyDefaultEras(parsed.focuses, parsed.eras ?? defaultEraList));
      } else if (name === 'lifestyles' || name.startsWith('lifestyles_')) {
        const parsed = parseFile(f, lifestyleFileSchema);
        if (parsed) lifestyles.push(...applyDefaultEras(parsed.lifestyles, parsed.eras ?? defaultEraList));
      } else if (name === 'careers' || name.startsWith('careers_')) {
        const parsed = parseFile(f, careerFileSchema);
        if (parsed) {
          careers.push(...applyDefaultEras(parsed.careers, parsed.eras ?? defaultEraList));
          sideJobs.push(...applyDefaultEras(parsed.side_jobs, parsed.eras ?? defaultEraList));
        }
      } else if (name === 'properties' || name.startsWith('properties_')) {
        const parsed = parseFile(f, propertyFileSchema);
        if (parsed) properties.push(...applyDefaultEras(parsed.properties, parsed.eras ?? defaultEraList));
      } else if (name === 'ventures' || name.startsWith('ventures_')) {
        const parsed = parseFile(f, ventureFileSchema);
        if (parsed) ventures.push(...applyDefaultEras(parsed.ventures, parsed.eras ?? defaultEraList));
      } else if (name === 'organizations' || name.startsWith('organizations_')) {
        const parsed = parseFile(f, organizationFileSchema);
        if (parsed) organizations.push(...applyDefaultEras(parsed.organizations, parsed.eras ?? defaultEraList));
      } else if (name === 'ambitions' || name.startsWith('ambitions_')) {
        const parsed = parseFile(f, ambitionFileSchema);
        if (parsed) ambitions.push(...applyDefaultEras(parsed.ambitions, parsed.eras ?? defaultEraList));
      } else if (name === 'diseases' || name.startsWith('diseases_')) {
        const parsed = parseFile(f, diseaseFileSchema);
        if (parsed) diseases.push(...applyDefaultEras(parsed.diseases, parsed.eras ?? defaultEraList));
      } else if (name === 'chronicle' || name.startsWith('chronicle_')) {
        const parsed = parseFile(f, chronicleFileSchema);
        if (parsed) {
          if (parsed.start_reign) {
            startReignByEra[eraBookmarkId] = parsed.start_reign;
            if (!chronicle.startReign) chronicle.startReign = parsed.start_reign;
          }
          chronicle.entries.push(...applyDefaultEras(parsed.entries, parsed.eras ?? defaultEraList));
        }
      } else if (name === 'ambient' || name.startsWith('ambient_')) {
        const parsed = parseFile(f, ambientFileSchema);
        if (parsed) {
          const eraMap = ambientByEra.get(eraBookmarkId)!;
          for (const t of applyDefaultEras(parsed.templates, parsed.eras ?? defaultEraList)) {
            if (t.id.startsWith('sys.')) {
              if (eraMap.has(t.id)) issues.push(`${f.path}: trùng id thông báo hệ thống "${t.id}" trong cùng thời đại`);
              eraMap.set(t.id, t);
            } else {
              ambient.push(t);
            }
          }
        }
      } else if (name === 'events' || name.startsWith('events_')) {
        const parsed = parseFile(f, decisionEventFileSchema);
        if (parsed) events.push(...applyDefaultEras(parsed.events, parsed.eras ?? defaultEraList));
      } else if (name === 'story' || name.startsWith('story_')) {
        const parsed = parseFile(f, eraStoryFileSchema);
        if (parsed && parsed.peers) {
          if (parsed.epitaphs.length === 0) {
            issues.push(`${f.path}: khi đã khai báo peers thì epitaphs phải có ít nhất 1 câu văn bia`);
          } else {
            storyByEra[eraBookmarkId] = {
              peers: parsed.peers,
              reflections: parsed.reflections,
              epitaphs: parsed.epitaphs,
            };
          }
        }
      } else if (name === 'scenarios' || name.startsWith('scenarios_')) {
        const parsed = parseFile(f, scenarioFileSchema);
        if (parsed) scenarios.push(...applyDefaultEras(parsed.scenarios, parsed.eras ?? defaultEraList));
      } else {
        issues.push(
          `${f.path}: tên file trong thư mục thời đại không hợp lệ "${name}" (chỉ hỗ trợ origins, focuses, lifestyles, careers, properties, ventures, organizations, ambitions, diseases, chronicle, ambient, events, story, scenarios)`,
        );
      }
    }
  }
  if (startReignByEra[defaultBookmarkId]) {
    chronicle.startReign = startReignByEra[defaultBookmarkId];
  }

  // Sự kiện không ghi giai đoạn đời: gán giai đoạn mặc định (sự kiện hẹn trước giữ nguyên để chuỗi không đứt)
  const defaultStages = (balance.director as Balance['director'] | undefined)?.default_event_life_stages ?? [];
  if (defaultStages.length > 0) {
    for (const ev of events) if (!ev.life_stages && !ev.scheduled_only) ev.life_stages = [...defaultStages];
  }
  const cultures = single('cultures', cultureSchema).sort((a, b) =>
    a.id === 'viet' ? -1 : b.id === 'viet' ? 1 : a.id.localeCompare(b.id),
  );
  const religions = collect('religions', religionFileSchema, 'religions');
  const defaultStory = storyByEra[defaultBookmarkId] ?? Object.values(storyByEra)[0];
  if (!defaultStory) issues.push('src/data/eras/: cần ít nhất một file story.yaml có đầy đủ peers và epitaphs');

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
    lifestyle: indexBy(lifestyles, 'lifestyles'),
    property: indexBy(properties, 'properties'),
    venture: indexBy(ventures, 'ventures'),
    organization: indexBy(organizations, 'organizations'),
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
    religion: indexBy(religions, 'religions'),
    event: indexBy(events, 'events'),
    ambient: indexBy(ambient, 'events/ambient'),
    ambientByEra,
    scenario: indexBy(scenarios, 'scenarios'),
    livingStandard: indexBy((balance.living_standards as Balance['living_standards'] | undefined)?.levels ?? [], 'living_standards'),
    lifeStage: indexBy((balance.life as Balance['life'] | undefined)?.life_stages ?? [], 'life_stages'),
    harvestQuality: indexBy((balance.economy as Balance['economy'] | undefined)?.harvest_qualities ?? [], 'harvest_qualities'),
    fateMode: indexBy((balance.fate_modes as Balance['fate_modes'] | undefined)?.modes ?? [], 'fate_modes'),
    playMode: indexBy((balance.fate_modes as Balance['fate_modes'] | undefined)?.play_modes ?? [], 'play_modes'),
  };

  if (issues.length > 0) throw new ContentError(issues);

  return {
    story: defaultStory,
    storyByEra,
    balance: balance as Balance,
    skills,
    traits,
    focuses,
    lifestyles,
    properties,
    ventures,
    organizations,
    diseases,
    ambitions,
    careers,
    sideJobs,
    civilizations,
    settlementTypes,
    bookmarks,
    defaultBookmarkId,
    eraFolders,
    polities,
    chronicle,
    origins,
    cultures,
    religions,
    events,
    ambient,
    scenarios,
    lang,
    index,
  };
}
