// [3] Thực thể: Nhà nước, Triều đình, Phe phái & Nổi dậy 8 giai đoạn (Phase 11 — GDD 03 §11–12)
import type { ProvinceState } from './Province';

export type RebellionStageId =
  | 'none'
  | 'cam_phan'
  | 'ket_noi'
  | 'to_chuc'
  | 'cho_thoi'
  | 'khoi_nghia'
  | 'lan_rong'
  | 'ket_cuc'
  | 'hau_noi_day';

export interface CourtFactionState {
  id: string;
  name: string;
  /** Thế lực trong triều (0..100). */
  influence: number;
  /** Quan hệ / sự ủng hộ với người chơi (-100..100). */
  favorWithPlayer: number;
}

export interface RebellionState {
  /** Giai đoạn hiện tại trong 8 giai đoạn nổi dậy từ dưới lên. */
  stage: RebellionStageId;
  /** Tiến độ giai đoạn hiện tại (0..100). */
  progress: number;
  /** Mức bất mãn tích tụ của vùng (0..100). */
  grievance: number;
  /** Số đồng chí / nghĩa quân đã tập hợp. */
  followers: number;
  /** Lương thảo và vũ khí tích trữ (0..100). */
  supplies: number;
  /** Độ bí mật của tổ chức nghĩa quân (0..100, về 0 khi chưa khởi nghĩa sẽ bị lộ). */
  secrecy: number;
  /** Uy tín chính nghĩa với dân nghèo (0..100). */
  legitimacy: number;
  /** Lời hứa với dân khi khởi sự ('chia_ruong' | 'xoa_thue' | 'tru_gian'). */
  promise: 'chia_ruong' | 'xoa_thue' | 'tru_gian';
  /** Người chơi có đang tham gia / lãnh đạo phong trào không. */
  playerJoined: boolean;
}

export interface PolityState {
  /** Thiên mệnh / Chính danh của triều đình đương nhiệm (0..100). */
  mandateOfHeaven: number;
  /** Ngân khố quốc gia (0..1000). */
  imperialTreasury: number;
  /** Binh lực triều đình. */
  imperialArmy: number;
  /** Phe phái đang liên kết với người chơi ('thanh_luu' | 'the_gia' | 'quan_cong' | null). */
  alignedFactionId: string | null;
  /** Các phe phái trong phủ/triều đình. */
  factions: Record<string, CourtFactionState>;
  /** Các tỉnh trong vương quốc. */
  provinces: Record<string, ProvinceState>;
}
