// [0] Kiểu dữ liệu bố cục cảnh (public/assets/common/scene-layout.json) và danh mục sprite (public/assets/sprites.json)
export interface Place {
  x: number;
  /** Đặt theo mép trên… */
  y?: number;
  /** …hoặc theo mép dưới (đứng trên mặt đất). */
  bottom?: number;
}

export interface SceneLayout {
  width: number;
  height: number;
  sceneHeightRatio: number;
  topOffsetRatio: number;
  background: string;
  frameRate: number;
  terrain: (Place & { key: string; byCondition?: Record<string, string> })[];
  houses: Record<string, Place & { chimney: [number, number]; lantern: [number, number] }>;
  props: Record<string, Place[]>;
  people: {
    x: number;
    spacing: number;
    bottom: number;
    sprites: Record<string, string>;
    animBySeason: Record<string, string[]>;
    fallbackAnim: string;
    playerMarker: string;
  };
  flood: Place & { key: string; alpha: number };
  weather: { key: string; alpha: number };
  conditions: Record<string, { tint?: string; alpha?: number; lantern?: string; flood?: boolean }>;
  particles: Record<string, { color: string; count: number; speed: number }>;
}

export interface SpriteInfo {
  url: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}

export interface SpriteManifest {
  sprites: Record<string, SpriteInfo>;
  icons: Record<string, SpriteInfo>;
}

export const SCENE_LAYOUT_KEY = 'scene-layout';
export const SPRITE_MANIFEST_KEY = 'sprite-manifest';
export const CUTSCENE_CONFIG_KEY = 'cutscene-config';

/** Thay {season}, {weather}... trong khóa sprite. */
export const fillKey = (key: string, vars: Record<string, string>): string => key.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? k);
