// [1] Định nghĩa dữ liệu & hàm vẽ hiệu ứng hoạt cảnh 3–4 giây (GDD 08 §4) — đọc cấu hình từ cutscenes.json
import type { SceneLayout } from '../scene-layers/art';
import type { PixelPainter } from '../scene-layers/PixelPainter';

export interface CutsceneTheme {
  overlayTint: string;
  overlayAlpha: number;
  accentColor: string;
  secondaryColor: string;
  particleCount: number;
  bannerSprite?: string;
}

export interface CutsceneConfig {
  durationSec: number;
  banner: {
    x: number;
    y: number;
    width: number;
    height: number;
    bg: string;
    bgAlpha: number;
    border: string;
  };
  themes: Record<string, CutsceneTheme>;
}

/** Vẽ các hạt/cờ/sóng hoạt cảnh theo thời gian trên khung 320×180. */
export function drawCutsceneFx(
  p: PixelPainter,
  L: SceneLayout,
  cfg: CutsceneConfig,
  cutsceneId: string,
  elapsedSec: number,
): void {
  const theme = cfg.themes[cutsceneId];
  if (!theme) return;
  const progress = Math.min(1, elapsedSec / cfg.durationSec);
  const fade = progress < 0.15 ? progress / 0.15 : progress > 0.8 ? (1 - progress) / 0.2 : 1;

  // Lớp phủ sắc thái toàn khung cảnh
  p.rect(0, 0, L.width, L.height, theme.overlayTint, theme.overlayAlpha * fade);

  // Vẽ khung viền băng rôn hoạt cảnh ở phía trên cảnh pixel
  const b = cfg.banner;
  p.rect(b.x - 1, b.y - 1, b.width + 2, b.height + 2, theme.accentColor, 0.9 * fade);
  p.rect(b.x, b.y, b.width, b.height, b.bg, b.bgAlpha * fade);
  p.rect(b.x + 2, b.y + 2, b.width - 4, 1, b.border, 0.85 * fade);
  p.rect(b.x + 2, b.y + b.height - 3, b.width - 4, 1, b.border, 0.85 * fade);

  // Vẽ các hạt/biểu tượng chuyển động theo chủ đề hoạt cảnh
  const n = theme.particleCount;
  for (let i = 0; i < n; i++) {
    const px = ((i * 43 + elapsedSec * 28 * ((i % 3) + 1)) % (L.width - 16)) + 8;
    const py = ((i * 29 + elapsedSec * 18) % (L.height - 30)) + 20;
    const color = i % 2 === 0 ? theme.accentColor : theme.secondaryColor;
    if (cutsceneId === 'vinh_quy_bai_to') {
      // Cờ lọng & hoa giấy rợp đường
      p.rect(px, py, 2, 3, color, 0.85 * fade);
    } else if (cutsceneId === 'tang_le') {
      // Dải mưa trắng trầm mặc
      p.rect(px, py, 1, 4, color, 0.65 * fade);
    } else {
      p.rect(px, py, 2, 2, color, 0.8 * fade);
    }
  }
}

