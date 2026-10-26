// Kiểm tra toàn bộ src/data/ trước khi build: npm run validate
import { ContentError } from '@content/ContentLoader';
import { loadNodeAssetIds, loadNodeContent } from '../shared/nodeContent';
import { validateContent } from './checks';

try {
  const content = loadNodeContent();
  const { errors, warnings } = validateContent(content, loadNodeAssetIds());
  for (const w of warnings) console.warn(`⚠  ${w}`);
  for (const e of errors) console.error(`✖  ${e}`);
  console.log(
    `\nNội dung: ${content.civilizations.length} khuôn văn minh, ${content.origins.length} xuất thân, ${content.careers.length} nghề, ` +
      `${content.events.length} sự kiện quyết định, ${content.ambient.length} mẫu nhật ký, ` +
      `${content.focuses.length} Focus, ${content.ambitions.length} tham vọng, ${content.diseases.length} bệnh, ` +
      `${content.properties.length} tài sản, ${content.ventures.length} cơ nghiệp, ${content.traits.length} tính cách.`,
  );
  console.log(errors.length === 0 ? `✔  Hợp lệ (${warnings.length} cảnh báo)` : `✖  ${errors.length} lỗi`);
  process.exit(errors.length === 0 ? 0 : 1);
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
