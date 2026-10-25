// [0] Danh sách file cần tải (đường dẫn tính từ public/). Sprite cụ thể đọc từ sprites.json do npm run process-art sinh ra.
import { SCENE_LAYOUT_KEY, SPRITE_MANIFEST_KEY } from './scene-layers/art';

export const assetManifest = {
  json: [
    { key: SCENE_LAYOUT_KEY, url: 'assets/common/scene-layout.json' },
    { key: SPRITE_MANIFEST_KEY, url: 'assets/sprites.json' },
  ],
} as const;
