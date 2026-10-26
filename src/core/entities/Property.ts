// [0] Tài sản: GĐ0 lưu dạng số lượng theo loại trên hộ; loại tài sản (giá, thu nhập, modifier, lớp cảnh) khai báo trong data/properties/
import type { ContentBundle } from '@content/ContentLoader';
import type { PropertyType } from '@content/schemas';
import type { Household } from './Household';

export interface PropertyHolding {
  type: PropertyType;
  count: number;
}

export function holdingsOf(h: Household, content: ContentBundle): PropertyHolding[] {
  return Object.entries(h.properties)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ type: content.index.property.get(id), count }))
    .filter((x): x is PropertyHolding => x.type !== undefined);
}

export function farmlandOf(h: Household, content: ContentBundle): number {
  return holdingsOf(h, content)
    .filter((p) => p.type.farmland)
    .reduce((sum, p) => sum + p.count, 0);
}

/** Nhà bậc cao nhất hộ đang có (để vẽ cảnh, tính modifier nhà ở). */
export function mainHouse(h: Household, content: ContentBundle): PropertyType | undefined {
  return holdingsOf(h, content)
    .filter((p) => p.type.category === 'house')
    .sort((a, b) => (b.type.house_tier ?? 0) - (a.type.house_tier ?? 0))[0]?.type;
}

/** [6] Tìm bậc nhà kế tiếp có thể nâng cấp lên từ nhà hiện tại của hộ. */
export function nextHouseUpgrade(h: Household, content: ContentBundle): PropertyType | undefined {
  const cur = mainHouse(h, content);
  if (!cur) return undefined;
  return content.properties.find(
    (p) => p.category === 'house' && (p.upgrade_from === cur.id || p.house_tier === (cur.house_tier ?? 0) + 1),
  );
}
