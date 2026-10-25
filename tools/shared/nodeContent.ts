// Nguồn dữ liệu cho Node (mô phỏng headless, kiểm tra nội dung, test): đọc đệ quy thư mục src/data/
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, type ContentBundle, type RawFile } from '@content/ContentLoader';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export function readDataFiles(root = projectRoot): RawFile[] {
  const out: RawFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ya?ml|json)$/.test(name)) {
        out.push({ path: relative(root, full).replace(/\\/g, '/'), text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(join(root, 'src', 'data'));
  return out;
}

export function loadNodeContent(root = projectRoot): ContentBundle {
  return loadContent(readDataFiles(root));
}
