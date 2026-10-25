// [0] Vẽ khối pixel trên lưới ảo, tự co giãn theo kích thước màn hình (pixel luôn vuông, sắc nét)
import Phaser from 'phaser';

export const color = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

export class PixelPainter {
  constructor(
    readonly g: Phaser.GameObjects.Graphics,
    readonly unit: number,
    readonly originX: number,
    readonly originY: number,
  ) {}

  rect(x: number, y: number, w: number, h: number, hex: string, alpha = 1): void {
    this.g.fillStyle(color(hex), alpha);
    this.g.fillRect(
      Math.round(this.originX + x * this.unit),
      Math.round(this.originY + y * this.unit),
      Math.ceil(w * this.unit),
      Math.ceil(h * this.unit),
    );
  }

  /** Tam giác mái nhà vẽ bằng các bậc pixel. */
  roof(x: number, y: number, w: number, h: number, hex: string, shade: string): void {
    for (let i = 0; i < h; i++) {
      const inset = Math.round(((h - i) / h) * (w / 4));
      this.rect(x + inset - 2, y + i, w - inset * 2 + 4, 1, i % 3 === 0 ? shade : hex);
    }
  }
}
