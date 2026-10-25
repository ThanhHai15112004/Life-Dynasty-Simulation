// [1] Cảnh hoạt cảnh 3–4 giây (GDD 08 §4): nhận thông báo 'cutscene' từ GameStore, phát lần lượt, vẽ chồng lên LifeScene
import Phaser from 'phaser';
import type { GameStore } from '@bridge/GameStore';
import { cutsceneFade, drawCutsceneFx, type CutsceneConfig, type CutsceneTextStyle, type CutsceneTheme } from '../cutscenes';
import { STORE_REGISTRY_KEY } from '../registryKeys';
import { partRects, partSize } from '../scene-kit/compose';
import type { SceneKit } from '../scene-kit/types';
import { CUTSCENE_CONFIG_KEY, SCENE_KIT_KEY } from '../scene-layers/art';
import { PixelPainter } from '../scene-layers/PixelPainter';

interface QueuedCutscene {
  id: string;
  title: string;
  subtitle: string;
}

interface ActiveCutscene extends QueuedCutscene {
  theme: CutsceneTheme | undefined;
  startTimeMs: number;
}

export class CutsceneScene extends Phaser.Scene {
  private layout!: SceneKit;
  private cfg!: CutsceneConfig;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private queue: QueuedCutscene[] = [];
  private active: ActiveCutscene | null = null;
  /** Vị trí và hệ số co của khung gốc trên màn hình. */
  private frame = { x: 0, y: 0, scale: 1 };

  constructor() {
    super('CutsceneScene');
  }

  create(): void {
    this.layout = this.cache.json.get(SCENE_KIT_KEY) as SceneKit;
    this.cfg = this.cache.json.get(CUTSCENE_CONFIG_KEY) as CutsceneConfig;
    const store = this.registry.get(STORE_REGISTRY_KEY) as GameStore;
    this.fxGfx = this.add.graphics();
    this.titleText = this.add.text(0, 0, '').setOrigin(0.5, 0).setVisible(false);
    this.subText = this.add.text(0, 0, '').setOrigin(0.5, 0).setVisible(false);

    const unsubscribe = store.notifications.on('cutscene', (payload) => {
      this.queue.push(payload);
      if (!this.active) this.startNext();
    });
    const onResize = () => this.fit();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      unsubscribe();
      this.scale.off('resize', onResize);
    });
    this.fit();
  }

  private startNext(): void {
    const next = this.queue.shift();
    if (!next) {
      this.active = null;
      this.titleText.setVisible(false);
      this.subText.setVisible(false);
      return;
    }
    const theme = this.cfg.themes[next.id];
    this.active = { ...next, theme, startTimeMs: this.time.now };
    this.titleText.setText(next.title).setVisible(true);
    this.subText.setText(next.subtitle).setVisible(true);
    this.fit();
  }

  private applyStyle(t: Phaser.GameObjects.Text, s: CutsceneTextStyle): void {
    t.setStyle({
      fontFamily: s.fontFamily,
      fontSize: `${Math.round(s.fontSize * this.frame.scale)}px`,
      color: s.color,
      fontStyle: s.fontStyle,
      align: 'center',
    });
  }

  private fit(): void {
    const { width, height } = this.scale;
    const L = this.layout;
    const scale = Math.min(width / L.width, height / L.height);
    const x = Math.floor((width - L.width * scale) / 2);
    const y = Math.floor((height - L.height * scale) / 2);
    this.frame = { x, y, scale };
    this.fxGfx.setPosition(x, y).setScale(scale);

    const b = this.cfg.banner;
    const { title, subtitle } = this.cfg.text;
    const centerX = x + (b.x + b.width / 2) * scale;
    const wrap = (b.width - 2 * b.spriteInset) * scale;
    this.applyStyle(this.titleText, title);
    this.applyStyle(this.subText, subtitle);
    this.titleText.setPosition(centerX, y + (b.y + title.offsetY) * scale).setWordWrapWidth(wrap);
    this.subText.setPosition(centerX, y + (b.y + subtitle.offsetY) * scale).setWordWrapWidth(wrap);

  }

  update(time: number): void {
    this.fxGfx.clear();
    const a = this.active;
    if (!a) return;
    const elapsedSec = (time - a.startTimeMs) / 1000;
    if (elapsedSec >= this.cfg.durationSec) {
      this.startNext();
      return;
    }
    const fade = cutsceneFade(this.cfg, elapsedSec);
    this.titleText.setAlpha(fade);
    this.subText.setAlpha(fade);
    if (!a.theme) return;
    const painter = new PixelPainter(this.fxGfx, 1, 0, 0);
    drawCutsceneFx(painter, this.layout, this.cfg, a.theme, elapsedSec);
    // Bộ phận treo hai bên băng rôn (đèn lồng...) lấy từ bộ cảnh lắp ghép
    const part = a.theme.bannerSprite ? this.layout.parts[a.theme.bannerSprite] : undefined;
    if (part) {
      const b = this.cfg.banner;
      const { w, h } = partSize(part);
      for (const px of [b.x + b.spriteInset, b.x + b.width - b.spriteInset - w]) {
        for (const r of partRects(part, px, b.y + b.spriteInset + h, (slot) => (slot.startsWith('#') ? slot : undefined))) {
          painter.rect(r.x, r.y, r.w, r.h, r.color, fade);
        }
      }
    }
  }
}
