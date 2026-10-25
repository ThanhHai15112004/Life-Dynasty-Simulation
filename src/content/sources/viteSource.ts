// [0] Nguồn dữ liệu cho trình duyệt: Vite gói toàn bộ src/data/ dạng chuỗi thô lúc build
import type { RawFile } from '../ContentLoader';

const modules = import.meta.glob('/src/data/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function viteRawFiles(): RawFile[] {
  return Object.entries(modules).map(([path, text]) => ({ path: path.replace(/^\//, ''), text }));
}
