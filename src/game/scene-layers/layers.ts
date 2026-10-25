// [0] Ghép 7 lớp cảnh (GDD 08 §2) từ SceneDescriptor bằng sprite — chỉ vẽ, không có luật chơi
import Phaser from 'phaser';
import type { SceneDescriptor } from '@core/index';
import { fillKey, type Place, type SceneLayout } from './art';
import { color } from './PixelPainter';

export interface SceneBuild {
  /** Vị trí ống khói (để lớp hạt bốc khói đúng chỗ), tính trên khung 320×180. */
  chimney: [number, number] | null;
}

function put(scene: Phaser.Scene, root: Phaser.GameObjects.Container, key: string, at: Place, frameRate: number) {
  if (!scene.textures.exists(key)) return null;
  const tex = scene.textures.get(key);
  const frames = tex.frameTotal - 1; // Phaser có thêm khung __BASE
  const obj = frames > 1 ? scene.add.sprite(0, 0, key, 0) : scene.add.image(0, 0, key);
  obj.setOrigin(0, 0);
  obj.setPosition(Math.round(at.x), Math.round(at.bottom !== undefined ? at.bottom - obj.height : at.y ?? 0));
  if (obj instanceof Phaser.GameObjects.Sprite) {
    const animKey = `${key}:loop`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({ key: animKey, frames: scene.anims.generateFrameNumbers(key, {}), frameRate, repeat: -1 });
    }
    obj.play({ key: animKey, startFrame: Math.floor(Math.random() * frames) });
  }
  root.add(obj);
  return obj;
}

export function buildScene(scene: Phaser.Scene, root: Phaser.GameObjects.Container, L: SceneLayout, d: SceneDescriptor): SceneBuild {
  root.removeAll(true);
  const vars = { season: d.season, weather: d.weather };
  const cond = L.conditions[d.condition] ?? {};
  const fr = L.frameRate;

  // Lớp 1 — địa hình (trời, đồi xa, lũy tre, ruộng, đường đất)
  for (const t of L.terrain) put(scene, root, fillKey(t.byCondition?.[d.condition] ?? t.key, vars), t, fr);

  // Lớp 6 (phần nước) — lũ dâng phủ ruộng, người và nhà đứng trong nước
  if (cond.flood) put(scene, root, L.flood.key, L.flood, fr)?.setAlpha(L.flood.alpha);

  // Lớp 2, 4, 5 — công trình, người, tài sản: xếp theo mép dưới để vật gần đè vật xa
  const drawables: { bottom: number; draw: () => void }[] = [];
  const house = d.house ? L.houses[d.house] : undefined;
  if (d.house && house) {
    drawables.push({
      bottom: house.bottom ?? 0,
      draw: () => {
        const h = put(scene, root, d.house!, house, fr);
        if (h && cond.lantern) put(scene, root, cond.lantern, { x: house.x + house.lantern[0], y: h.y + house.lantern[1] }, fr);
      },
    });
  }
  for (const prop of d.props) {
    (L.props[prop.sprite] ?? []).slice(0, prop.count).forEach((at) => drawables.push({ bottom: at.bottom ?? 0, draw: () => put(scene, root, prop.sprite, at, fr) }));
  }
  const P = L.people;
  const prefs = L.people.animBySeason[d.season] ?? [P.fallbackAnim];
  d.people.forEach((person, i) => {
    const base = `${P.sprites[person.ageGroup] ?? P.sprites.nguoi_lon}_${person.sex}`;
    const want = prefs[i % prefs.length];
    const key = [want, ...prefs, P.fallbackAnim].map((a) => `${base}_${a}`).find((k) => scene.textures.exists(k));
    if (!key) return;
    const at = { x: P.x + i * P.spacing, bottom: P.bottom };
    drawables.push({
      bottom: P.bottom,
      draw: () => {
        const s = put(scene, root, key, at, fr);
        if (s && person.isPlayer && scene.textures.exists(P.playerMarker)) {
          const m = scene.textures.get(P.playerMarker).getSourceImage();
          put(scene, root, P.playerMarker, { x: at.x + (s.width - m.width) / 2, y: s.y - m.height - 2 }, fr);
        }
      },
    });
  });
  drawables.sort((a, b) => a.bottom - b.bottom).forEach((x) => x.draw());

  // Lớp 6 — tình trạng (nghèo đói, thịnh vượng): phủ màu toàn cảnh
  if (cond.tint) root.add(scene.add.rectangle(0, 0, L.width, L.height, color(cond.tint), cond.alpha ?? 0.2).setOrigin(0, 0));

  // Lớp 3 — thời tiết (lớp phủ bán trong suốt)
  put(scene, root, fillKey(L.weather.key, vars), { x: 0, y: 0 }, fr)?.setAlpha(L.weather.alpha);

  return { chimney: house && d.house ? [house.x + house.chimney[0], (house.bottom ?? 0) - (scene.textures.get(d.house).getSourceImage().height - house.chimney[1])] : null };
}
