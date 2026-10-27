// [0] Đổi trạng thái game thành "mô tả cảnh" để Phaser vẽ 7 lớp (GDD 02 §4.4, GDD 08 §2)
// Renderer chỉ đọc descriptor này — nhờ vậy cảnh luôn khớp kết quả mô phỏng.
import { evaluate } from '../engine/RuleEvaluator';
import { holdingsOf, mainHouse } from '../entities/Property';
import type { SimContext } from '../systems/context';
import { ageGroupOf, ageNow, aliveMembers, playerHousehold } from '../systems/people';
import { createResolver, seasonOf } from '../systems/resolver';
import { activeSettlementId } from '../world/region';

export interface ScenePerson {
  id: string;
  sex: 'm' | 'f';
  ageGroup: string;
  isPlayer: boolean;
  /** Tuổi thực để phân biệt bé ẵm ngửa / trẻ nhỏ / người lớn / cao niên. */
  age?: number;
  /** Nghề nghiệp của nhân vật (để chọn màu áo, mũ nón, phụ kiện). */
  career?: string;
  /** Bậc địa vị của hộ/nhân vật (dan_ngheo, thuong_dan, phu_ho, si_phu, quan_lai). */
  statusRank?: string;
  /** Học vị khoa cử (none, sinh_do, huong_cong, tien_si). */
  examDegree?: string;
  /** Tình trạng sức khỏe hiển thị dáng vẻ (khoe, om_yeu, benh_nang). */
  healthState?: 'khoe' | 'om_yeu' | 'benh_nang';
  /** Đang mang thai (vẽ bụng bầu). */
  isPregnant?: boolean;
  /** Đang cư tang (mặc áo xô trắng, đội khăn tang). */
  isMourning?: boolean;
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
  const propMap = new Map<string, number>();
  for (const p of holdingsOf(h, content)) {
    if (p.type.scene?.layer === 'props') {
      const cur = propMap.get(p.type.scene.sprite) ?? 0;
      propMap.set(p.type.scene.sprite, Math.min(cur + p.count, p.type.scene.max_draw));
    }
  }
  for (const v of h.ventures ?? []) {
    const vDef = content.index.venture.get(v.id);
    if (vDef?.scene_prop) {
      propMap.set(vDef.scene_prop, Math.max(1, propMap.get(vDef.scene_prop) ?? 0));
    }
  }
  const props = Array.from(propMap.entries()).map(([sprite, count]) => ({ sprite, count }));

  const currentSettlementType = activeSettlementId(ctx);
  const isMourning = state.civilization.mourningMonthsLeft > 0;
  const civId = state.civilization.id;
  const cultureId = state.cultureId ?? '';
  const cultureSet =
    state.clock.year >= 1945 || civId === 'hien_dai'
      ? 'hien_dai'
      : state.clock.year < -1000 || civId === 'bo_lac_nguyen_thuy'
        ? 'bo_lac_nguyen_thuy'
        : civId === 'phong_kien_au' || civId === 'co_dai_de_che' || cultureId === 'au_tay' || cultureId === 'la_ma_hy_lap'
          ? 'phong_kien_au'
          : civId === 'hoi_giao' || civId === 'nam_a' || cultureId === 'a_rap_ba_tu' || cultureId === 'an_do'
            ? 'trung_dong_hoi_giao'
            : civId === 'du_muc' || cultureId === 'du_muc_mong'
              ? 'thao_nguyen_du_muc'
              : content.index.civilization.get(civId)?.culture_set || sc.culture_set;

  return {
    location: content.index.settlementType.get(currentSettlementType)?.scene_location ?? sc.location,
    cultureSet,
    house: house?.scene?.sprite ?? null,
    season: seasonOf(ctx),
    weather: state.world.weather,
    people: aliveMembers(ctx, h).map((c) => {
      const age = ageNow(ctx, c);
      const isPlayer = c.id === state.playerId;
      const career = isPlayer
        ? state.career.id || state.householdCareer
        : c.careerId || state.householdCareer;
      const healthState: 'khoe' | 'om_yeu' | 'benh_nang' =
        c.diseases.length > 0 || c.health < 40
          ? 'benh_nang'
          : c.health < 65
            ? 'om_yeu'
            : 'khoe';
      return {
        id: c.id,
        sex: c.sex,
        ageGroup: ageGroupOf(ctx, age),
        isPlayer,
        age,
        career,
        statusRank: state.civilization.statusRank,
        examDegree: isPlayer ? state.civilization.examDegree : 'none',
        healthState,
        isPregnant: Boolean(c.pregnancy),
        isMourning,
      };
    }),
    props,
    condition: sc.condition_rules.find((rule) => evaluate(rule.condition, r))?.value ?? sc.default_condition,
    particles: sc.particle_rules.filter((rule) => evaluate(rule.condition, r)).map((rule) => rule.value),
    wealth: h.livingStandard,
    career: state.career.id,
    examDegree: state.civilization.examDegree,
    statusRank: state.civilization.statusRank,
  };
}
