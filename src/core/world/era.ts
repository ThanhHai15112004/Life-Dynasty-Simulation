// [5] Hệ thống Thời đại — Era System & Chế độ chơi Xuyên Thời Đại (Phase 13 — GDD 06 §4)
import { writeTemplate } from '../events/journal';
import { SystemLog } from '../events/systemLogKeys';
import type { SimContext } from '../systems/context';

/** Kiểm tra và tự động chuyển giao Mốc thời đại (Bookmark) khi năm lịch sử vượt qua ngưỡng thời kỳ mới. */
export function yearlyEraTransition(ctx: SimContext): void {
  const { state, content } = ctx;
  const year = state.clock.year;
  const sorted = [...content.bookmarks].sort((a, b) => a.year - b.year);
  let targetBm = sorted[0];
  for (const bm of sorted) {
    if (year >= bm.year) {
      targetBm = bm;
    } else {
      break;
    }
  }
  if (!targetBm || targetBm.id === state.bookmarkId) return;

  const oldBm = state.bookmarkId ? content.index.bookmark.get(state.bookmarkId) : undefined;
  // Chỉ chuyển tiếp lên thời đại mới hơn khi thời gian tiến về phía trước
  if (oldBm && targetBm.year <= oldBm.year) return;

  state.bookmarkId = targetBm.id;
  // Tìm polity tương ứng cùng văn hóa trong thời đại mới (nếu có)
  const matchingPolity = content.polities.find(
    (p) => p.bookmarks.includes(targetBm.id) && p.culture === state.cultureId,
  );
  if (matchingPolity) {
    state.polityId = matchingPolity.id;
  }

  writeTemplate(ctx, SystemLog.EraTransition, {
    params: { title: targetBm.era_name },
  });
}
