// [0] Lưu game trong trình duyệt bằng IndexedDB (lõi chỉ biết StorageAdapter)
import type { StorageAdapter } from '@core/engine/SaveSystem';

const DB_NAME = 'dong-doi';
const STORE = 'saves';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export class IndexedDbStorage implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    const v = await run<unknown>('readonly', (s) => s.get(key));
    return typeof v === 'string' ? v : null;
  }
  async set(key: string, value: string): Promise<void> {
    await run('readwrite', (s) => s.put(value, key));
  }
  async remove(key: string): Promise<void> {
    await run('readwrite', (s) => s.delete(key));
  }
  async keys(): Promise<string[]> {
    const all = await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
    return (all ?? []).map((k) => String(k));
  }
}
