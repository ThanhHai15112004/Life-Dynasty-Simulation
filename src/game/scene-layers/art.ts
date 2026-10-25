// [0] Khóa tài nguyên JSON và kiểu danh mục sprite (public/assets/sprites.json — nay chỉ còn icon giao diện dùng)
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

export const SPRITE_MANIFEST_KEY = 'sprite-manifest';
/** [1] Bộ cảnh lắp ghép vẽ bằng code (public/assets/common/scene-kit.json). */
export const SCENE_KIT_KEY = 'scene-kit';
export const CUTSCENE_CONFIG_KEY = 'cutscene-config';
