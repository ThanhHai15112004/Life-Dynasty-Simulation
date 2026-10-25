// [0] Thực thể: Con người (GDD 02 §2.1) — GĐ0 dùng các nhóm Định danh, Trạng thái, Năng lực, Bản ngã, Quan hệ tối thiểu
import type { StoredModifier } from '../engine/ModifierSystem';

export type Sex = 'm' | 'f';

export interface SkillState {
  level: number;
  xp: number;
}

export interface ActiveDisease {
  id: string;
  remainingMonths: number;
}

export interface Character {
  id: string;
  familyName: string;
  givenName: string;
  sex: Sex;
  birthYear: number;
  birthMonth: number;
  alive: boolean;
  deathYear?: number;
  deathCauseId?: string;

  health: number;
  stress: number;
  skills: Record<string, SkillState>;
  traits: string[];
  modifiers: StoredModifier[];
  /** [1] Danh sách bệnh đang mắc và thời gian còn lại. */
  diseases: ActiveDisease[];

  householdId: string | null;
  fatherId?: string;
  motherId?: string;
  /** [1] ID vợ hoặc chồng. */
  spouseId?: string;
  /** [1] Trạng thái mang thai (chỉ áp dụng với nữ). */
  pregnancy?: { monthsLeft: number; fatherId: string } | null;
  /** Vai trò trong làng (ba_ho, ly_truong...) nếu là NPC làng. */
  villageRole?: string;
  /** Thiện cảm tổng với người chơi (-100..100). */
  opinionOfPlayer: number;
  /** [1] Các nguồn thiện cảm có thời hạn để giải thích trong UI. */
  opinionModifiers?: StoredModifier[];
  /** [1] Ân tình với người chơi (>0: nợ ân tình người chơi; <0: người chơi nợ họ). */
  favorWithPlayer?: number;
}

/** Tuổi tính theo tháng sinh: qua tháng sinh của năm nay mới tăng tuổi. */
export function ageOf(c: Character, year: number, month: number): number {
  const end = c.alive ? { year, month } : { year: c.deathYear ?? year, month };
  let age = end.year - c.birthYear;
  if (end.month < c.birthMonth) age -= 1;
  return Math.max(0, age);
}

export function fullName(c: Character): string {
  return `${c.familyName} ${c.givenName}`;
}
