// [0] Ngữ cảnh mô phỏng truyền cho mọi hệ thống trong một tick
import type { ContentBundle } from '@content/ContentLoader';
import { RngStreams } from '../engine/Rng';
import type { GameState } from '../entities/World';

export interface SimContext {
  state: GameState;
  content: ContentBundle;
  rng: RngStreams;
}

/** Tên luồng RNG theo hệ thống — tách luồng để thêm nội dung không làm lệch hệ thống khác. */
export const RngStream = {
  World: 'world',
  Life: 'life',
  Npc: 'npc',
  Economy: 'economy',
  Director: 'director',
  Events: 'events',
  Ambient: 'ambient',
  Display: 'display',
  Generate: 'generate',
  Clans: 'clans',
  Region: 'region',
  /** Bạn cùng lứa sống song song (luồng riêng để không làm lệch các hệ thống khác). */
  Peers: 'peers',
  Social: 'social',
  Organization: 'organization',
  Politics: 'politics',
} as const;

export function createContext(state: GameState, content: ContentBundle): SimContext {
  return { state, content, rng: new RngStreams(state.seed, state.rng) };
}

export function newId(ctx: SimContext, prefix: string): string {
  ctx.state.nextId += 1;
  return `${prefix}${ctx.state.nextId}`;
}
