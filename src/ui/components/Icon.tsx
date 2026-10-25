// [0] Icon pixel theo id (nhật ký, sự kiện, Focus); chưa có ảnh thì không hiện gì
import { useUi } from '../context';

export function Icon({ id, size }: { id: string; size?: 'sm' | 'lg' }) {
  const { icons } = useUi();
  const url = icons[id];
  if (!url) return null;
  return <img className={`pixel-icon ${size ?? 'sm'}`} src={url} alt="" draggable={false} />;
}
