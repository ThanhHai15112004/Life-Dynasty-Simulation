// [1] Chân dung pixel: vẽ người bằng đúng bộ phận và bảng màu của cảnh (scene-kit.json), phóng nguyên lần
import { useEffect, useRef } from 'react';
import {
  cultureOf,
  partSize,
  personRects,
  resolvePersonPartId,
  sceneColors,
  type PersonVisualInput,
} from '@game/scene-kit/compose';
import { useSnapshot, useUi } from '../context';

export function Portrait({
  id,
  sex,
  ageGroup,
  cultureSet,
  season,
  scale,
}: {
  id: string;
  sex: 'm' | 'f';
  ageGroup: string;
  cultureSet: string;
  season: string;
  scale: number;
}) {
  const { kit } = useUi();
  const snap = useSnapshot();
  const ref = useRef<HTMLCanvasElement>(null);
  const culture = kit ? cultureOf(kit, cultureSet) : null;
  const scenePerson = snap.scene?.people.find((sp) => sp.id === id);
  const person: PersonVisualInput = scenePerson ?? { id, sex, ageGroup };
  const partId = culture ? resolvePersonPartId(culture, person) : '';
  const part = kit && partId ? kit.parts[partId] : undefined;
  const size = part ? partSize(part) : { w: 0, h: 0 };
  // Chừa chỗ cho mũ/nón (rộng hơn đầu) và một hàng nền phía dưới
  const w = size.w + 4;
  const h = size.h + 4;

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !kit || !culture) return;
    ctx.clearRect(0, 0, w * scale, h * scale);
    const base = sceneColors(culture, season);
    const { rects } = personRects(kit, culture, person, 2, h - 1, base);
    for (const r of rects) {
      ctx.globalAlpha = r.alpha ?? 1;
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
    }
  }, [
    kit,
    culture,
    id,
    sex,
    ageGroup,
    season,
    scale,
    w,
    h,
    person.age,
    person.career,
    person.statusRank,
    person.examDegree,
    person.healthState,
    person.isPregnant,
    person.isMourning,
  ]);

  if (!part) return <div className="portrait empty" />;
  return <canvas ref={ref} className="portrait" width={w * scale} height={h * scale} />;
}
