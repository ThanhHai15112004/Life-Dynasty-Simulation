// [2] Thực thể: Dòng họ (Phase 3 — Truyền đời / Dynasty & Phase 4 — Các họ trong làng)
import type { Sex } from './Character';
import type { CareerHistoryEntry, LogYear } from './World';

export type ClanTie = 'none' | 'in_law' | 'ally' | 'feud';

export interface NpcClan {
  id: string;
  familyName: string;
  headId: string;
  householdId: string;
  careerId: string;
  statusRankId: string;
  prestige: number;
  relationWithPlayer: number;
  tie: ClanTie;
  tieReason?: string;
  sinceYear: number;
}

export interface DynastyFeud {
  id: string;
  targetName: string;
  grudge: number;
  reason: string;
  sinceYear: number;
}

export interface UnfinishedWish {
  id: string;
  fromGeneration: number;
  fromName: string;
  ambitionId: string | null;
  milestoneId: string | null;
  text: string;
  fulfilled: boolean;
}

export interface PastLifeRecord {
  generation: number;
  characterId: string;
  name: string;
  sex: Sex;
  birthYear: number;
  deathYear: number;
  deathAge: number;
  causeId: string;
  causeName: string;
  careerId: string;
  careerHistory?: CareerHistoryEntry[];
  statusRankId: string;
  examDegreeId: string;
  yearsPlayed: number;
  decisions: number;
  closing: {
    money: number;
    food: number;
    debt: number;
    farmland: number;
    netWorth: number;
  };
  axes: { id: string; score: number; bandKey: string }[];
  highlights: { year: number; text: string }[];
  lifeMap: { age: number; year: number; satisfaction: number; marks: string[] }[];
  log: LogYear[];
}

export interface DynastyState {
  familyName: string;
  founderId: string;
  currentGeneration: number;
  prestige: number;
  feuds: DynastyFeud[];
  unfinishedWishes: UnfinishedWish[];
  pastLives: PastLifeRecord[];
  /** Người giám hộ khi người kế vị còn nhỏ (mẹ, chú/bác, cô/dì). */
  guardianId: string | null;
}
