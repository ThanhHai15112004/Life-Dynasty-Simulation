// [0] Lưu và tải game. Lõi không chạm IndexedDB: mọi thao tác đi qua StorageAdapter
// (trình duyệt: IndexedDB ở @bridge; Node: bộ nhớ). GĐ0 lưu ảnh chụp đầy đủ; lưu delta theo seed để GĐ sau.
import { SAVE_VERSION, type GameState } from '../entities/World';

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryStorage implements StorageAdapter {
  private data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
  async remove(key: string) {
    this.data.delete(key);
  }
}

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(text: string): GameState {
  const raw = JSON.parse(text) as Partial<GameState>;
  if (raw.version !== SAVE_VERSION && raw.version !== 1) {
    throw new SaveError(`Phiên bản save ${raw.version} không khớp ${SAVE_VERSION}`);
  }
  if (raw.version === 1) {
    raw.version = SAVE_VERSION;
    raw.ambition = raw.ambition ?? { id: null, achievedMilestones: [] };
    raw.reputation = raw.reputation ?? { dan_lang: 0 };
    raw.happiness = raw.happiness ?? { mood: 50, satisfaction: 50, baselineWealth: 100, ambitionBonus: 0 };
    for (const c of Object.values(raw.characters ?? {})) {
      c.diseases = c.diseases ?? [];
      c.opinionModifiers = c.opinionModifiers ?? [];
      c.favorWithPlayer = c.favorWithPlayer ?? 0;
    }
  }
  return raw as GameState;
}

export class SaveSystem {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly slotPrefix = 'dongdoi.save.',
  ) {}

  save(slot: string, state: GameState): Promise<void> {
    return this.storage.set(this.slotPrefix + slot, serialize(state));
  }

  async load(slot: string): Promise<GameState | null> {
    const text = await this.storage.get(this.slotPrefix + slot);
    return text ? deserialize(text) : null;
  }

  remove(slot: string): Promise<void> {
    return this.storage.remove(this.slotPrefix + slot);
  }
}
