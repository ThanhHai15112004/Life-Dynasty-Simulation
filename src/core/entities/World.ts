// [0] Trạng thái tổng của một ván chơi — toàn bộ là dữ liệu thuần (JSON được) để lưu/tải và chạy headless
import type { ExamDegreeId } from '@content/schemas';
import type { Character } from './Character';
import type { Household, LedgerYear, Purse } from './Household';

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
    /** [1] Loại khu định cư (data/world/settlement_types.yaml). */
    settlementType: string;
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
    /** [1] Niên hiệu hiện tại và năm lên ngôi (biên niên vương triều). */
    reignName: string;
    reignStartYear: number;
    /** [1] Biên niên khóa động tĩnh quân sự đến hết năm này. */
    alertLock: { id: string; untilYear: number } | null;
  };
  /** [1] Biến cố biên niên đã xảy ra: id → năm. */
  chronicle: Record<string, number>;
  /** [1] Bản đồ cuộc đời: mỗi năm đã sống một ô (tuổi, mãn nguyện, các dấu mốc nổi bật). */
  lifeMap: { age: number; year: number; satisfaction: number; marks: string[] }[];

  characters: Record<string, Character>;
  households: Record<string, Household>;
  playerId: string;
  householdId: string;
  /** Vai trò làng → id nhân vật đang giữ. */
  village: Record<string, string>;

  /** [1] Trọng tâm năm nay (một lựa chọn; '' khi còn quá nhỏ để chọn). */
  focus: { primary: string };
  /** [1] Chủ hộ để mô phỏng tự lo: mức sống theo gia cảnh, tự trả nợ, [1.5] bán thóc dư sau gặt, mua tài sản khi có dư. Chưa làm chủ hộ thì luôn tự động. */
  autoManage: { livingStandard: boolean; repayDebt: boolean; sellSurplus: boolean; invest: boolean };
  /** [1.5] Tài sản ròng lúc mở sổ đầu năm nay (để chốt sổ theo mức thay đổi). */
  yearOpenNetWorth: number;
  /** [1.5] Túi tiền riêng của người chơi khi chưa làm chủ hộ. */
  purse: Purse;
  /** [1] Nghề nhà: nghề nuôi cả hộ (kinh tế hộ, sự kiện "con nhà buôn"...). Chủ hộ đổi nghề thì nghề nhà đổi theo. */
  householdCareer: string;
  /** [1] Người chơi đã làm chủ hộ (để nhận biết lúc vừa tiếp quản nhà). */
  wasHead: boolean;
  /** [1] Nghề riêng của người chơi ('' khi còn nhỏ; phụ việc nhà / thất nghiệp là nghề loại trang_thai) (GDD 04). */
  career: {
    id: string;
    /** Tháng bắt đầu nghề hiện tại (tính thâm niên). */
    since: number;
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
  /** [1] Trạng thái Khuôn văn minh (Quan liêu Nho giáo: Hiếu đạo, Danh vọng sĩ phu, Khoa cử, Cư tang). */
  civilization: {
    id: string;
    filialPiety: number;
    scholarlyPrestige: number;
    examDegree: ExamDegreeId;
    mourningMonthsLeft: number;
    /** Bậc thang địa vị hiện tại (id trong status_ranks của khuôn văn minh). */
    statusRank: string;
  };
  /** [1] Hàng đợi hoạt cảnh (micro-cutscene) vừa phát sinh, @bridge lấy ra cho Phaser vẽ lần lượt. */
  cutscenes: string[];
  flags: Record<string, FlagState>;

  eventHistory: Record<string, { lastMonthIndex: number; count: number }>;
  ambientHistory: Record<string, { lastMonthIndex: number; lastVariant: number; count: number }>;
  scheduled: ScheduledEvent[];
  pending: PendingEvent | null;
  /** [1] Chuyện nhỏ đang chờ người chơi chọn (dừng thời gian như sự kiện thường). */
  minor: PendingEvent | null;
  lastResolution: Resolution | null;

  director: {
    tension: number;
    decisionsThisYear: number;
    lastDecisionMonthIndex: number;
    ambientSlots: number[];
    unexpectedDeathsThisYear: number;
    mourningThisYear: boolean;
    /** [1] Số chuyện nhỏ năm nay và tháng của chuyện nhỏ gần nhất. */
    minorThisYear: number;
    lastMinorMonthIndex: number;
  };

  log: LogYear[];
  ledgerHistory: LedgerYear[];
  stats: { decisions: number; minorDecisions: number; eventsSeen: Record<string, number> };
  gameOver: { year: number; age: number; causeId: string } | null;
}
