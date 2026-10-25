// [1] Định nghĩa dữ liệu & hàm vẽ hiệu ứng hoạt cảnh 3–4 giây (GDD 08 §4) — mọi màu, cỡ, nhịp đọc từ cutscenes.json
import type { SceneKit } from '../scene-kit/types';
import type { PixelPainter } from '../scene-layers/PixelPainter';

export interface CutsceneTheme {
  overlayTint: string;
  overlayAlpha: number;
  accentColor: string;
  secondaryColor: string;
  particleCount: number;
  particle: { w: number; h: number; alpha: number };
  /** Sprite treo hai bên băng rôn (vd. đèn lồng), bỏ trống thì không vẽ. */
  bannerSprite?: string;
}

export interface CutsceneTextStyle {
  fontFamily: string;
  /** Cỡ chữ trên khung gốc, nhân với hệ số co của cảnh. */
  fontSize: number;
  color: string;
  fontStyle: string;
  /** Khoảng cách từ mép trên băng rôn (khung gốc). */
  offsetY: number;
}

export interface CutsceneConfig {
  durationSec: number;
  fadeInShare: number;
  fadeOutShare: number;
  banner: {
    x: number;
    y: number;
    width: number;
    height: number;
    bg: string;
    bgAlpha: number;
    border: string;
    spriteInset: number;
  };
  text: { title: CutsceneTextStyle; subtitle: CutsceneTextStyle };
  particleMotion: { spreadX: number; spreadY: number; speedX: number; speedY: number; marginX: number; marginTop: number; marginBottom: number };
  themes: Record<string, CutsceneTheme>;
}

/** Độ hiện (0..1) theo thời gian: mờ vào, giữ, mờ ra. */
export function cutsceneFade(cfg: CutsceneConfig, elapsedSec: number): number {
  const progress = Math.min(1, elapsedSec / cfg.durationSec);
  if (progress < cfg.fadeInShare) return progress / cfg.fadeInShare;
  if (progress > 1 - cfg.fadeOutShare) return (1 - progress) / cfg.fadeOutShare;
  return 1;
}

/** Vẽ lớp phủ, băng rôn và hạt chuyển động theo chủ đề trên khung gốc. */
export function drawCutsceneFx(p: PixelPainter, L: Pick<SceneKit, 'width' | 'height'>, cfg: CutsceneConfig, theme: CutsceneTheme, elapsedSec: number): void {
  const fade = cutsceneFade(cfg, elapsedSec);

  // Lớp phủ sắc thái toàn khung cảnh
  p.rect(0, 0, L.width, L.height, theme.overlayTint, theme.overlayAlpha * fade);

  // Băng rôn hoạt cảnh ở phía trên cảnh pixel
  const b = cfg.banner;
  p.rect(b.x - 1, b.y - 1, b.width + 2, b.height + 2, theme.accentColor, 0.9 * fade);
  p.rect(b.x, b.y, b.width, b.height, b.bg, b.bgAlpha * fade);
  p.rect(b.x + 2, b.y + 2, b.width - 4, 1, b.border, 0.85 * fade);
  p.rect(b.x + 2, b.y + b.height - 3, b.width - 4, 1, b.border, 0.85 * fade);

  // Hạt chuyển động (cờ lọng, hoa giấy, mưa trắng...) — hình dạng theo theme.particle
  const m = cfg.particleMotion;
  const spanX = L.width - 2 * m.marginX;
  const spanY = L.height - m.marginTop - m.marginBottom;
  for (let i = 0; i < theme.particleCount; i++) {
    const px = ((i * m.spreadX + elapsedSec * m.speedX * ((i % 3) + 1)) % spanX) + m.marginX;
    const py = ((i * m.spreadY + elapsedSec * m.speedY) % spanY) + m.marginTop;
    const color = i % 2 === 0 ? theme.accentColor : theme.secondaryColor;
    p.rect(px, py, theme.particle.w, theme.particle.h, color, theme.particle.alpha * fade);
  }
}
