// [0] Tải tài nguyên JSON (bộ cảnh lắp ghép đã chia nhỏ, cấu hình hoạt cảnh) rồi mở cảnh chính và lớp hoạt cảnh
import Phaser from 'phaser';
import { assetManifest } from '../asset-manifest';
import { mergeSceneKit, SCENE_KIT_MODULES, type SceneKitModuleMap } from '../scene-kit/loader';
import { SCENE_KIT_KEY } from '../scene-layers/art';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    for (const a of assetManifest.json) this.load.json(a.key, a.url);
  }

  create(): void {
    const modules: Record<string, unknown> = {};
    for (const m of SCENE_KIT_MODULES) {
      modules[m.id] = this.cache.json.get(m.key);
    }
    this.cache.json.add(SCENE_KIT_KEY, mergeSceneKit(modules as unknown as SceneKitModuleMap));
    this.scene.start('LifeScene');
    this.scene.launch('CutsceneScene');
  }
}
