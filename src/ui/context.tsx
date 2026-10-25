// [0] Ngữ cảnh React: GameStore + hàm dịch chữ từ src/data/lang
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { GameStore, StoreSnapshot } from '@bridge/GameStore';
import { translate } from '@shared/template';

export type T = (key: string, params?: Record<string, string | number>) => string;

interface UiContext {
  store: GameStore;
  t: T;
}

const Ctx = createContext<UiContext | null>(null);

export function UiProvider({ store, children }: { store: GameStore; children?: ReactNode }) {
  const lang = store.content.lang[store.content.balance.display.default_language] ?? {};
  const t: T = (key, params) => translate(lang, key, params);
  return <Ctx.Provider value={{ store, t }}>{children}</Ctx.Provider>;
}

export function useUi(): UiContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('UiProvider chưa được bọc');
  return c;
}

export function useSnapshot(): StoreSnapshot {
  const { store } = useUi();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Định dạng số tiền/thóc: tối đa 1 chữ số lẻ. */
export const num = (v: number): string => String(Math.round(v * 10) / 10);
export const signed = (v: number): string => `${v > 0 ? '+' : ''}${num(v)}`;
