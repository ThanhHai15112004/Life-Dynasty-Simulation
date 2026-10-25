// [1] Cảnh hoạt cảnh 3–4 giây (GDD 08 §4): lắng nghe thông báo 'cutscene' từ GameStore và vẽ chồng lên LifeScene
import Phaser from 'phaser';
import type { GameStore } from '@bridge/GameStore';
import { drawCutsceneFx, type CutsceneConfig } from '../cutscenes';
import { STORE_REGISTRY_KEY } from '../registryKeys';
import { CUTSCENE_CONFIG_KEY, SCENE_LAYOUT_KEY, type SceneLayout } from '../scene-layers/art';
import { PixelPainter } from '../scene-layers/PixelPainter';

interface ActiveCutscene {
  id: string;
  title: string;
  subtitle: string;
  startTimeMs: number;
}

export class CutsceneScene extends Phaser.Scene {
  private layout!: SceneLayout;
  private cfg!: CutsceneConfig;
  private store!: GameStore;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private activeCutscene: ActiveCutscene | null = null;
  private unsubscribe?: () => void;

  constructor() {
    super('CutsceneScene');
  }

  create(): void {
    this.layout = this.cache.json.get(SCENE_LAYOUT_KEY) as SceneLayout;
    this.cfg = this.cache.json.get(CUTSCENE_CONFIG_KEY) as CutsceneConfig;
    this.store = this.registry.get(STORE_REGISTRY_KEY) as GameStore;
    this.fxGfx = this.add.graphics();

    this.titleText = this.add
      .text(0, 0, '', {
        fontFamily: 'serif',
        fontSize: '16px',
        color: '#f7e7c4',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.subText = this.add
      .text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#d8ccb8',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.unsubscribe = this.store.notifications.on('cutscene', (payload) => {
      this.activeCutscene = {
        id: payload.id,
        title: payload.title,
        subtitle: payload.subtitle,
        startTimeMs: this.time.now,
      };
      this.titleText.setText(payload.title).setVisible(true);
      this.subText.setText(payload.subtitle).setVisible(true);
      this.fit();
    });

    this.scale.on('resize', () => this.fit());
    this.events.once('shutdown', () => this.unsubscribe?.());
    this.fit();
  }

  private fit(): void {
    const { width, height } = this.scale;
    const L = this.layout;
    const sceneH = height * L.sceneHeightRatio;
    const scale = Math.max(1, Math.min(width / L.width, sceneH / L.height));
    const x = Math.floor((width - L.width * scale) / 2);
    const y = Math.floor((sceneH - L.height * scale) / 2 + height * L.topOffsetRatio);
    this.fxGfx.setPosition(x, y).setScale(scale);

    const b = this.cfg.banner;
    const centerX = x + (b.x + b.width / 2) * scale;
    const topY = y + (b.y + 6) * scale;
    this.titleText.setPosition(centerX, topY);
    this.subText.setPosition(centerX, topY + 20);
  }

  update(time: number): void {
    this.fxGfx.clear();
    if (!this.activeCutscene) return;
    const elapsedSec = (time - this.activeCutscene.startTimeMs) / 1000;
    if (elapsedSec >= this.cfg.durationSec) {
      this.activeCutscene = null;
      this.titleText.setVisible(false);
      this.subText.setVisible(false);
      return;
    }
    drawCutsceneFx(new PixelPainter(this.fxGfx, 1, 0, 0), this.layout, this.cfg, this.activeCutscene.id, elapsedSec);
  }
}
