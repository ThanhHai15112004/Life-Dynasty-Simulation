// [1] Tải và ghép bộ cảnh lắp ghép đã chia nhỏ theo nhóm (public/assets/common/scene-kit/*.json):
// base, cultures, locations, houses, people, hats, trees, props, terrain.
import type { KitCulture, KitLocation, KitPart, SceneKit } from './types';

export const SCENE_KIT_MODULES = [
  { id: 'base', key: 'scene-kit:base', url: 'assets/common/scene-kit/base.json' },
  { id: 'cultures', key: 'scene-kit:cultures', url: 'assets/common/scene-kit/cultures.json' },
  { id: 'locations', key: 'scene-kit:locations', url: 'assets/common/scene-kit/locations.json' },
  { id: 'houses', key: 'scene-kit:houses', url: 'assets/common/scene-kit/houses.json' },
  { id: 'people', key: 'scene-kit:people', url: 'assets/common/scene-kit/people.json' },
  { id: 'hats', key: 'scene-kit:hats', url: 'assets/common/scene-kit/hats.json' },
  { id: 'trees', key: 'scene-kit:trees', url: 'assets/common/scene-kit/trees.json' },
  { id: 'props', key: 'scene-kit:props', url: 'assets/common/scene-kit/props.json' },
  { id: 'terrain', key: 'scene-kit:terrain', url: 'assets/common/scene-kit/terrain.json' },
] as const;

export const PART_MODULE_IDS = ['houses', 'people', 'hats', 'trees', 'props', 'terrain'] as const;

export interface SceneKitModuleMap {
  base: Omit<SceneKit, 'cultures' | 'locations' | 'parts'>;
  cultures: { cultures: Record<string, KitCulture> };
  locations: { locations: Record<string, KitLocation> };
  houses: { parts: Record<string, KitPart> };
  people: { parts: Record<string, KitPart> };
  hats: { parts: Record<string, KitPart> };
  trees: { parts: Record<string, KitPart> };
  props: { parts: Record<string, KitPart> };
  terrain: { parts: Record<string, KitPart> };
}

/** Ghép các tệp con của scene-kit thành một đối tượng SceneKit thống nhất cho Phaser và React. */
export function mergeSceneKit(modules: SceneKitModuleMap): SceneKit {
  const parts: Record<string, KitPart> = {};
  for (const modId of PART_MODULE_IDS) {
    Object.assign(parts, modules[modId]?.parts ?? {});
  }
  return {
    ...modules.base,
    cultures: modules.cultures.cultures ?? {},
    locations: modules.locations.locations ?? {},
    parts,
  };
}

/** Tải song song toàn bộ tệp con của scene-kit qua fetch (dùng cho React Portrait). */
export async function fetchSceneKit(): Promise<SceneKit> {
  const entries = await Promise.all(
    SCENE_KIT_MODULES.map(async (m) => {
      const res = await fetch(m.url);
      if (!res.ok) throw new Error(`Không tải được ${m.url}: ${res.status}`);
      return [m.id, await res.json()] as const;
    }),
  );
  return mergeSceneKit(Object.fromEntries(entries) as unknown as SceneKitModuleMap);
}

