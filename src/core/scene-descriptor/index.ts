// [0] Đổi trạng thái game thành "mô tả cảnh" để Phaser vẽ 7 lớp (GDD 02 §4.4, GDD 08 §2)
// Renderer chỉ đọc descriptor này — nhờ vậy cảnh luôn khớp kết quả mô phỏng.
import { evaluate } from '../engine/RuleEvaluator';
import { holdingsOf, mainHouse } from '../entities/Property';
import type { SimContext } from '../systems/context';
import { ageGroupOf, ageNow, aliveMembers, playerHousehold } from '../systems/people';
import { createResolver, seasonOf } from '../systems/resolver';

export interface ScenePerson {
  id: string;
  sex: 'm' | 'f';
  ageGroup: string;
  isPlayer: boolean;
}

export interface SceneDescriptor {
  /** Lớp 1 — địa hình/địa điểm. */
  location: string;
  cultureSet: string;
  /** Lớp 2 — công trình chính (sprite id) hoặc null. */
  house: string | null;
  /** Lớp 3 — mùa và thời tiết. */
  season: string;
  weather: string;
  /** Lớp 4 — người trong hộ. */
  people: ScenePerson[];
  /** Lớp 5 — đồ vật, tài sản. */
  props: { sprite: string; count: number }[];
  /** Lớp 6 — tình trạng. */
  condition: string;
  /** Lớp 7 — hiệu ứng hạt. */
  particles: string[];
  wealth: string;
  career: string;
  examDegree: string;
  statusRank: string;
}

export function buildSceneDescriptor(ctx: SimContext): SceneDescriptor {
  const { state, content } = ctx;
  const sc = content.balance.scene;
  const h = playerHousehold(ctx);
  const r = createResolver(ctx);
  const house = mainHouse(h, content);
  const props = holdingsOf(h, content)
    .filter((p) => p.type.scene?.layer === 'props')
    .map((p) => ({ sprite: p.type.scene!.sprite, count: Math.min(p.count, p.type.scene!.max_draw) }));

  return {
    location: content.index.settlementType.get(state.world.settlementType)?.scene_location ?? sc.location,
    cultureSet: sc.culture_set,
    house: house?.scene?.sprite ?? null,
    season: seasonOf(ctx),
    weather: state.world.weather,
    people: aliveMembers(ctx, h).map((c) => ({
      id: c.id,
      sex: c.sex,
      ageGroup: ageGroupOf(ctx, ageNow(ctx, c)),
      isPlayer: c.id === state.playerId,
    })),
    props,
    condition: sc.condition_rules.find((rule) => evaluate(rule.condition, r))?.value ?? sc.default_condition,
    particles: sc.particle_rules.filter((rule) => evaluate(rule.condition, r)).map((rule) => rule.value),
    wealth: h.livingStandard,
    career: state.career.id,
    examDegree: state.civilization.examDegree,
    statusRank: state.civilization.statusRank,
  };
}
