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

/** Id khai báo ở public/assets mà kiểm tra nội dung cần đối chiếu (chủ đề hoạt cảnh, địa điểm cảnh, bộ cảnh văn hóa, bảng màu sắc tộc). */
export function loadNodeAssetIds(root = projectRoot): {
  cutsceneThemes: string[];
  sceneLocations: string[];
  sceneCultureSets: string[];
  scenePhenotypes: string[];
} {
  const read = (rel: string) => JSON.parse(readFileSync(join(root, 'public', 'assets', rel), 'utf8')) as Record<string, unknown>;
  const ids = (o: unknown) => Object.keys((o ?? {}) as object).filter((k) => !k.startsWith('$'));
  return {
    cutsceneThemes: ids(read('common/placeholder/cutscenes.json').themes),
    sceneLocations: ids(read('common/scene-kit/locations.json').locations),
    sceneCultureSets: ids(read('common/scene-kit/cultures.json').cultures),
    scenePhenotypes: ids(read('common/scene-kit/base.json').phenotypePalettes),
  };
}
