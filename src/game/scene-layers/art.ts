// [0] Kiểu dữ liệu của hình vẽ tạm (public/assets/common/placeholder/scene-art.json)
export interface SceneArt {
  grid: { width: number; height: number };
  layout: {
    sceneHeightRatio: number;
    /** Chừa chỗ phía trên cho thanh thời gian (tỷ lệ chiều cao màn hình). */
    topOffsetRatio: number;
    horizonY: number;
    groundY: number;
    houseX: number;
    peopleX: number;
    peopleSpacing: number;
    propsX: number[];
    bambooX: number[];
  };
  skyTop: Record<string, string>;
  sky: Record<string, string>;
  hills: Record<string, string>;
  ground: Record<string, string>;
  groundStripe: Record<string, string>;
  path: string;
  bamboo: string;
  bambooLight: string;
  weather: Record<string, { tint: string; alpha: number }>;
  houses: Record<
    string,
    { width: number; wallHeight: number; roofHeight: number; wall: string; wallShade: string; roof: string; roofShade: string; door: string; bays: number; chimneyX: number }
  >;
  props: Record<string, { shape: string; w: number; h: number; color: string; accent: string; count?: number }>;
  people: {
    heights: Record<string, number>;
    skin: string;
    hair: string;
    elderHair: string;
    clothes: Record<string, string>;
    playerMarker: string;
  };
  conditions: Record<
    string,
    { water?: string; waterLight?: string; level?: number; alpha?: number; ground?: string; stripe?: string; tint?: string; lantern?: string }
  >;
  particles: Record<string, { color: string; count: number; speed: number }>;
  background: string;
}

export const SCENE_ART_KEY = 'scene-art';
