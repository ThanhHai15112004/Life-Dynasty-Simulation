// [0] Danh sách file cần tải (đường dẫn tính từ public/). Cảnh vẽ bằng code từ scene-kit.json, không cần sprite sheet.
import { CUTSCENE_CONFIG_KEY, SCENE_KIT_KEY } from './scene-layers/art';

export const assetManifest = {
  json: [
    { key: SCENE_KIT_KEY, url: 'assets/common/scene-kit.json' },
    { key: CUTSCENE_CONFIG_KEY, url: 'assets/common/placeholder/cutscenes.json' },
  ],
} as const;
