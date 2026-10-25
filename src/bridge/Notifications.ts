// [0] Cầu nối: báo tin từ lõi ra Phaser/UI — năm mới, có sự kiện, người thân qua đời, hết đời, đã lưu
export type NotificationMap = {
  newYear: { year: number };
  decision: { eventId: string };
  death: { characterIds: string[] };
  gameOver: Record<string, never>;
  saved: Record<string, never>;
  commandFailed: { error: string };
};

type Listener<K extends keyof NotificationMap> = (payload: NotificationMap[K]) => void;

export class Notifications {
  private listeners = new Map<keyof NotificationMap, Set<(payload: never) => void>>();

  on<K extends keyof NotificationMap>(type: K, fn: Listener<K>): () => void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(fn as (payload: never) => void);
    return () => set.delete(fn as (payload: never) => void);
  }

  emit<K extends keyof NotificationMap>(type: K, payload: NotificationMap[K]): void {
    this.listeners.get(type)?.forEach((fn) => (fn as Listener<K>)(payload));
  }
}
