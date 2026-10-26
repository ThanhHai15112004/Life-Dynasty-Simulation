// [0] Lưu và tải game. Lõi không chạm IndexedDB: mọi thao tác đi qua StorageAdapter
// (trình duyệt: IndexedDB ở @bridge; Node: bộ nhớ). GĐ0 lưu ảnh chụp đầy đủ; lưu delta theo seed để GĐ sau.
import { fullName } from '../entities/Character';
import { SAVE_VERSION, type GameState } from '../entities/World';

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys?(): Promise<string[]>;
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
  async keys() {
    return [...this.data.keys()];
  }
}

export type SaveErrorCode = 'save_corrupted' | 'save_version';

export class SaveError extends Error {
  constructor(
    message: string,
    public readonly code: SaveErrorCode = 'save_corrupted',
  ) {
    super(message);
    this.name = 'SaveError';
  }
}

export const DEFAULT_SAVE_SLOTS = ['auto', 'slot_1', 'slot_2', 'slot_3'] as const;
export type SaveSlotId = (typeof DEFAULT_SAVE_SLOTS)[number] | string;

export interface SaveSlotInfo {
  slot: string;
  exists: boolean;
  corrupted: boolean;
  errorCode?: SaveErrorCode;
  playerName?: string;
  age?: number;
  year?: number;
  generation?: number;
  originId?: string;
  playMode?: string;
  familyName?: string;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(text: string): GameState {
  let raw: Partial<GameState>;
  try {
    raw = JSON.parse(text) as Partial<GameState>;
  } catch {
    throw new SaveError('Dữ liệu save không phải JSON hợp lệ', 'save_corrupted');
  }
  if (!raw || typeof raw !== 'object') {
    throw new SaveError('Dữ liệu save rỗng hoặc sai cấu trúc', 'save_corrupted');
  }
  if (typeof raw.version !== 'number' || raw.version < 1 || raw.version > SAVE_VERSION) {
    throw new SaveError(`Phiên bản save ${String(raw.version)} không khớp ${SAVE_VERSION}`, 'save_version');
  }
  if (
    !raw.clock ||
    typeof raw.clock.year !== 'number' ||
    !raw.characters ||
    typeof raw.playerId !== 'string' ||
    !raw.characters[raw.playerId] ||
    !raw.households ||
    typeof raw.householdId !== 'string' ||
    !raw.households[raw.householdId]
  ) {
    throw new SaveError('Dữ liệu save bị hỏng hoặc khuyết trường bắt buộc', 'save_corrupted');
  }
  raw.version = SAVE_VERSION;
  // Trường mới cần giá trị từ data (khuôn văn minh, xuất thân...) được bù ở world/migrate.ts khi nạp vào GameSession
  for (const c of Object.values(raw.characters ?? {})) {
    c.diseases = c.diseases ?? [];
    c.opinionModifiers = c.opinionModifiers ?? [];
    c.favorWithPlayer = c.favorWithPlayer ?? 0;
  }
  return raw as GameState;
}

export function extractSlotInfo(slot: string, text: string | null): SaveSlotInfo {
  if (!text) {
    return { slot, exists: false, corrupted: false };
  }
  try {
    const state = deserialize(text);
    const me = state.characters[state.playerId];
    const age = me ? Math.max(0, state.clock.year - me.birthYear) : 0;
    return {
      slot,
      exists: true,
      corrupted: false,
      playerName: me ? fullName(me) : '',
      age,
      year: state.clock.year,
      generation: state.dynasty?.currentGeneration ?? 1,
      originId: state.originId,
      playMode: state.playMode ?? 'dynasty',
      familyName: state.dynasty?.familyName ?? me?.familyName ?? '',
    };
  } catch (e) {
    const code: SaveErrorCode = e instanceof SaveError ? e.code : 'save_corrupted';
    return {
      slot,
      exists: true,
      corrupted: true,
      errorCode: code,
    };
  }
}

export class SaveSystem {
  constructor(
    readonly storage: StorageAdapter,
    private readonly slotPrefix = 'dongdoi.save.',
  ) {}

  save(slot: string, state: GameState): Promise<void> {
    return this.storage.set(this.slotPrefix + slot, serialize(state));
  }

  async load(slot: string): Promise<GameState | null> {
    const text = await this.storage.get(this.slotPrefix + slot);
    return text ? deserialize(text) : null;
  }

  async loadRaw(slot: string): Promise<string | null> {
    return this.storage.get(this.slotPrefix + slot);
  }

  remove(slot: string): Promise<void> {
    return this.storage.remove(this.slotPrefix + slot);
  }

  async inspectSlot(slot: string): Promise<SaveSlotInfo> {
    const text = await this.storage.get(this.slotPrefix + slot);
    return extractSlotInfo(slot, text);
  }

  async listSlots(slots: readonly string[] = DEFAULT_SAVE_SLOTS): Promise<SaveSlotInfo[]> {
    const result: SaveSlotInfo[] = [];
    const seen = new Set<string>();
    for (const s of slots) {
      seen.add(s);
      result.push(await this.inspectSlot(s));
    }
    if (this.storage.keys) {
      const allKeys = await this.storage.keys();
      for (const k of allKeys) {
        if (k.startsWith(this.slotPrefix)) {
          const slot = k.slice(this.slotPrefix.length);
          if (!seen.has(slot)) {
            seen.add(slot);
            result.push(await this.inspectSlot(slot));
          }
        }
      }
    }
    return result;
  }
}
