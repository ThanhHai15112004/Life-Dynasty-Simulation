// [0] Đổi trạng thái game thành "mô tả cảnh" để Phaser vẽ 7 lớp (GDD 02 §4.4, GDD 08 §2)
// Renderer chỉ đọc descriptor này — nhờ vậy cảnh luôn khớp kết quả mô phỏng.
import { evaluate } from '../engine/RuleEvaluator';
import { holdingsOf, mainHouse } from '../entities/Property';
import type { SimContext } from '../systems/context';
import { activeCulture, ageGroupOf, ageNow, aliveMembers, eraStyleOf, playerHousehold, type EraStyle } from '../systems/people';
import { createResolver, seasonOf } from '../systems/resolver';
import { activeSettlementId } from '../world/region';

export interface ScenePerson {
  id: string;
  sex: 'm' | 'f';
  ageGroup: string;
  isPlayer: boolean;
  /** Tuổi thực để phân biệt bé ẵm ngửa / trẻ nhỏ / người lớn / cao niên. */
  age?: number;
  /** Mã nhóm nhân chủng / ngoại hình để chọn màu da, màu tóc phù hợp. */
  phenotype?: string;
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
  /** Phong cách thời đại (prehistoric, ancient, feudal, industrial, modern). */
  eraStyle?: EraStyle;
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
  const curCulture = activeCulture(ctx);
  const polity = state.polityId ? content.index.polity.get(state.polityId) : undefined;
  const defaultPhenotype = polity?.phenotype ?? curCulture?.phenotype ?? 'dong_a_bac';
  const eraStyle = eraStyleOf(state.clock.year, civId);
  const resolveDefaultCultureSet = (): string => {
    if (polity?.culture_set) return polity.culture_set;
    const y = state.clock.year;
    if (y >= 1945 || civId === 'hien_dai') {
      if (cultureId === 'au_tay' || cultureId === 'bac_au' || cultureId === 'nam_au_iberia' || cultureId === 'dong_au_slav' || cultureId === 'nhat_ban' || cultureId === 'trieu_tien' || cultureId === 'han_dong_a') {
        return 'hien_dai_au_dong_a';
      }
      if (cultureId === 'viet' || cultureId === 'cham_nam_dao' || cultureId === 'khmer_thai') {
        return 'hien_dai';
      }
      return 'hien_dai_nam_ban_cau';
    }
    if (y >= 1800 && y < 1945) {
      if (cultureId === 'au_tay' || cultureId === 'bac_au' || cultureId === 'nam_au_iberia' || cultureId === 'dong_au_slav') {
        return 'cong_nghiep_au_my';
      }
      if (civId === 'nho_giao' || civId === 'nam_a') {
        return 'can_dai_a_dong';
      }
    }
    if (y < -3000 || civId === 'bo_lac_nguyen_thuy') {
      if (cultureId === 'ai_cap_luong_ha' || cultureId === 'a_rap_ba_tu' || cultureId === 'ba_tu') return 'nguyen_thuy_can_dong';
      if (cultureId === 'au_tay' || cultureId === 'bac_au' || cultureId === 'dong_au_slav') return 'nguyen_thuy_bang_ha_au';
      if (cultureId === 'chau_phi' || cultureId === 'dong_phi' || cultureId === 'chau_my' || cultureId === 'inca_andes') return 'nguyen_thuy_thao_nguyen_phi';
      return 'bo_lac_nguyen_thuy';
    }
    if (y < 250) {
      if (cultureId === 'viet' || cultureId === 'cham_nam_dao' || cultureId === 'khmer_thai') return 'bach_viet_dong_son';
      if (cultureId === 'ai_cap_luong_ha') return 'ai_cap_luong_ha_co_dai';
      if (cultureId === 'la_ma_hy_lap' || cultureId === 'nam_au_iberia') return 'la_ma_hy_lap_co_dien';
      if (cultureId === 'an_do' || cultureId === 'tamil_nam_a') return 'song_an_co_dai';
      if (cultureId === 'han_dong_a' || cultureId === 'nhat_ban' || cultureId === 'trieu_tien') return 'dong_a_co_dai';
    }
    if (cultureId === 'nhat_ban' || cultureId === 'trieu_tien') return 'dong_bac_a_phong_kien';
    if (cultureId === 'han_dong_a') return 'trung_hoa_phong_kien';
    if (cultureId === 'cham_nam_dao' || cultureId === 'khmer_thai') return 'dong_nam_a_cham_khmer';
    if (civId === 'nam_a' || cultureId === 'an_do' || cultureId === 'tamil_nam_a') return 'nam_a_an_do';
    if (civId === 'hoi_giao' || cultureId === 'a_rap_ba_tu' || cultureId === 'ba_tu' || cultureId === 'tho_nhi_ky' || cultureId === 'ai_cap_luong_ha') return 'trung_dong_hoi_giao';
    if (cultureId === 'dong_au_slav') return 'dong_au_byzantine';
    if (cultureId === 'bac_au') return 'bac_au_viking';
    if (civId === 'phong_kien_au' || civId === 'co_dai_de_che' || cultureId === 'au_tay' || cultureId === 'la_ma_hy_lap' || cultureId === 'nam_au_iberia') return 'phong_kien_au';
    if (civId === 'du_muc' || cultureId === 'du_muc_mong') return 'thao_nguyen_du_muc';
    if (cultureId === 'chau_phi' || cultureId === 'dong_phi') return 'chau_phi_ban_dia';
    if (cultureId === 'chau_my' || cultureId === 'inca_andes' || cultureId === 'my_latinh') return 'chau_my_maya_inca';
    return content.index.civilization.get(civId)?.culture_set || sc.culture_set;
  };
  const cultureSet = resolveDefaultCultureSet();

  return {
    location: content.index.settlementType.get(currentSettlementType)?.scene_location ?? sc.location,
    cultureSet,
    eraStyle,
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
        phenotype: c.phenotypeId ?? defaultPhenotype,
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
