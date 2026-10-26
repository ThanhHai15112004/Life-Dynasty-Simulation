// [0] Ngữ cảnh React: GameStore + hàm dịch chữ từ src/data/lang
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { GameStore, StoreSnapshot } from '@bridge/GameStore';
import type { SceneKit } from '@game/scene-kit/types';
import { translate } from '@shared/template';

export type T = (key: string, params?: Record<string, string | number>) => string;

interface UiContext {
  store: GameStore;
  content: import('@content/ContentLoader').ContentBundle;
  t: T;
  /** id icon → đường dẫn ảnh (từ public/assets/sprites.json). */
  icons: Record<string, string>;
  /** [1] Bộ cảnh lắp ghép (vẽ chân dung bằng cùng bộ phận với cảnh), null khi chưa tải xong. */
  kit: SceneKit | null;
}

/** Danh mục sprite do npm run process-art sinh ra; UI chỉ cần phần icon. */
const SPRITE_MANIFEST_URL = 'assets/sprites.json';
/** Bộ cảnh lắp ghép — cùng file Phaser dùng để vẽ cảnh. */
const SCENE_KIT_URL = 'assets/common/scene-kit.json';

const Ctx = createContext<UiContext | null>(null);

export function UiProvider({ store, children }: { store: GameStore; children?: ReactNode }) {
  const lang = store.content.lang[store.content.balance.display.default_language] ?? {};
  const t: T = (key, params) => translate(lang, key, params);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [kit, setKit] = useState<SceneKit | null>(null);
  useEffect(() => {
    fetch(SPRITE_MANIFEST_URL)
      .then((r) => r.json() as Promise<{ icons?: Record<string, { url: string }> }>)
      .then((m) => setIcons(Object.fromEntries(Object.entries(m.icons ?? {}).map(([k, v]) => [k, v.url]))))
      .catch(() => setIcons({}));
    fetch(SCENE_KIT_URL)
      .then((r) => r.json() as Promise<SceneKit>)
      .then(setKit)
      .catch(() => setKit(null));
  }, []);
  return <Ctx.Provider value={{ store, content: store.content, t, icons, kit }}>{children}</Ctx.Provider>;
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

/**
 * [1.5] Quy quan ra tiền ngày nay cho dễ hình dung (kiểu 1in8b): làm tròn theo độ lớn,
 * đơn vị chữ lấy từ lang (money.modern / money.modern_million / money.modern_billion).
 */
export function modernMoney(t: T, quan: number, perQuan: number): string {
  const v = quan * perQuan;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  const locale = t('format.locale');
  const dec = (x: number) => x.toLocaleString(locale, { maximumFractionDigits: x >= 100 ? 0 : 1 });
  if (abs >= 1e9) return sign + t('money.modern_billion', { x: dec(abs / 1e9) });
  if (abs >= 1e6) return sign + t('money.modern_million', { x: dec(abs / 1e6) });
  return sign + t('money.modern', { x: (Math.round(abs / 1e3) * 1e3).toLocaleString(locale) });
}
