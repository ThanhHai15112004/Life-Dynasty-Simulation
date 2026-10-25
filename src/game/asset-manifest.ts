// [0] Danh sách file hình, âm thanh, dữ liệu vẽ cần tải (đường dẫn tính từ public/)
import { SCENE_ART_KEY } from './scene-layers/art';

export const assetManifest = {
  json: [{ key: SCENE_ART_KEY, url: 'assets/common/placeholder/scene-art.json' }],
} as const;
