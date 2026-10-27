// [0] Danh sách file cần tải (đường dẫn tính từ public/). Cảnh vẽ bằng code từ các tệp trong scene-kit/, không cần sprite sheet.
import { SCENE_KIT_MODULES } from './scene-kit/loader';
import { CUTSCENE_CONFIG_KEY } from './scene-layers/art';

export const AUDIO_CONFIG_KEY = 'audio-config';

export const assetManifest = {
  json: [
    ...SCENE_KIT_MODULES.map((m) => ({ key: m.key, url: m.url })),
    { key: CUTSCENE_CONFIG_KEY, url: 'assets/common/placeholder/cutscenes.json' },
    { key: AUDIO_CONFIG_KEY, url: 'assets/common/placeholder/audio.json' },
  ],
} as const;
