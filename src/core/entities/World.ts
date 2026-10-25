// [0] Trạng thái tổng của một ván chơi — toàn bộ là dữ liệu thuần (JSON được) để lưu/tải và chạy headless
import type { Character } from './Character';
import type { Household, LedgerYear } from './Household';

export const SAVE_VERSION = 2;

export interface LogEntry {
  id: number;
  year: number;
  month: number;
  sourceId: string;
  kind: string;
  text: string;
  importance: number;
  tone: string;
  icon: string;
  rumor: boolean;
  highlight: boolean;
  /** Bản rút gọn để gộp vào câu tổng hợp năm (R4). */
  short?: string;
  /** Tác động nhỏ hiển thị cuối dòng (R9), khóa chỉ số → giá trị. */
  deltas: Record<string, number>;
}

export interface LogYear {
  year: number;
  age: number;
  entries: LogEntry[];
}

export interface ScheduledEvent {
  eventId: string;
  dueMonthIndex: number;
  roles: Record<string, string>;
  label?: string;
}

export interface OptionChanceView {
  /** Xác suất thật (ẩn với người chơi). */
  p: number;
  /** Khoảng hiển thị, hẹp lại khi kỹ năng cao (GDD 05 §6). */
  shown: [number, number];
}

export interface PendingEvent {
  instanceId: number;
  eventId: string;
  roles: Record<string, string>;
  text: string;
  title: string;
  options: { id: string; text: string; hint?: string; chance?: OptionChanceView }[];
}

export interface Resolution {
  eventId: string;
  title: string;
  optionText: string;
  resultText: string;
  success: boolean | null;
  deltas: Record<string, number>;
}

export interface FlagState {
  /** Hết hạn ở tháng thứ mấy kể từ đầu game (null = vĩnh viễn). */
  expiresAt: number | null;
  label?: string;
}

export interface GameState {
  version: number;
  seed: string;
  originId: string;
  cultureId: string;
  rng: Record<string, number>;
  nextId: number;

  clock: { year: number; month: number; monthIndex: number };
  world: {
    settlementName: string;
    harvestQuality: string;
    foodPrice: number;
    weather: string;
    lastHarvest: number;
    /** [1] Chỉ số giá hàng buôn đường dài (0.7..1.5, cao khi thị trấn khan hàng). */
    tradeIndex: number;
    /** [1] Động tĩnh quân sự / biên ải: 'binh_yen' | 'tuan_tra' | 'chien_dich'. */
    militaryAlert: string;
    /** [1] Mức gắt gao của quan quân tuần tra thảo khấu (0..100). */
    patrolLevel: number;
  };

  characters: Record<string, Character>;
  households: Record<string, Household>;
  playerId: string;
  householdId: string;
  /** Vai trò làng → id nhân vật đang giữ. */
  village: Record<string, string>;

  focus: { primary: string; secondary: string | null };
  /** [1] Trạng thái nghề nghiệp hiện tại của người chơi (GDD 04). */
  career: {
    id: string;
    rankIndex: number;
    merit: number;
    wanted: number;
    actionCooldowns: Record<string, number>;
  };
  /** [1] Tham vọng cả đời đang theo đuổi và các mốc phụ đã đạt. */
  ambition: { id: string | null; achievedMilestones: string[] };
  /** [1] Danh tiếng theo nhóm xã hội (mặc định: dan_lang). */
  reputation: Record<string, number>;
  /** [1] Trạng thái Hạnh phúc tâm lý 3 tầng (Mood, Mãn nguyện đời, Kỳ vọng thích nghi). */
  happiness: {
    mood: number;
    satisfaction: number;
    baselineWealth: number;
    ambitionBonus: number;
  };
  flags: Record<string, FlagState>;

  eventHistory: Record<string, { lastMonthIndex: number; count: number }>;
  ambientHistory: Record<string, { lastMonthIndex: number; lastVariant: number; count: number }>;
  scheduled: ScheduledEvent[];
  pending: PendingEvent | null;
  lastResolution: Resolution | null;

  director: {
    tension: number;
    decisionsThisYear: number;
    lastDecisionMonthIndex: number;
    ambientSlots: number[];
    unexpectedDeathsThisYear: number;
    mourningThisYear: boolean;
  };

  log: LogYear[];
  ledgerHistory: LedgerYear[];
  stats: { decisions: number; eventsSeen: Record<string, number> };
  gameOver: { year: number; age: number; causeId: string } | null;
}
