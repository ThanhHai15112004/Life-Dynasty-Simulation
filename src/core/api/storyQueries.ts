// Truy vấn lớp câu chuyện: bạn cùng lứa, mốc suy ngẫm, giấy khai sinh, thẻ đời để chia sẻ
import { canChi } from '../engine/GameClock';
import { fullName } from '../entities/Character';
import { farmlandOf } from '../entities/Property';
import type { PeerState } from '../entities/World';
import { SystemLog } from '../events/systemLogKeys';
import type { SimContext } from '../systems/context';
import { lifeExpectancyAtBirth } from '../systems/life/mortality';
import { activeCulture, ageNow, aliveMembers, player, playerHousehold } from '../systems/people';
import { pickEpitaph } from '../systems/story';

export interface PeerView {
  id: string;
  name: string;
  label: string;
  sex: 'm' | 'f';
  alive: boolean;
  /** Tuổi hiện tại (còn sống) hoặc tuổi lúc mất. */
  age: number;
  causeName: string | null;
  /** Chuyện gần nhất về người này (null nếu chưa có gì). */
  lastText: string | null;
  story: { age: number; text: string }[];
}

export interface BirthCardView {
  name: string;
  sex: 'm' | 'f';
  birthYear: number;
  can: number;
  chi: number;
  calendarStyle: 'can_chi' | 'bce_ce';
  lexicon: { currency: string; food: string; land: string; stapleCrop: string };
  settlementName: string;
  originName: string;
  /** Cứ 100 đứa trẻ sinh ra thì bao nhiêu đứa vào xuất thân này (theo origin_weights / birth_weight). */
  originSharePct: number;
  /** Thời kỳ lịch sử nơi nhân vật sinh ra (vd: Thời Nguyên Thủy, Đỉnh Cao Trung Cổ, Thế Giới Hiện Đại). */
  eraName: string;
  /** Quốc gia / Vùng lãnh thổ trên thế giới nơi nhân vật sinh ra. */
  polityName: string;
  /** Khu vực địa lý lớn (Đông Á, Nam Á, Châu Âu, Địa Trung Hải...). */
  regionLabel: string;
  /** Tên Khuôn văn minh áp dụng cho xã hội này. */
  civilizationName: string;
  /** Cứ 100 đứa trẻ chào đời trên thế giới thời kỳ này thì bao nhiêu đứa sinh ra ở vùng này. */
  worldPopSharePct: number;
  /** Tỷ lệ sống qua 5 tuổi (%) tại vùng & thời kỳ này theo dữ liệu nhân khẩu học. */
  childSurvivalPct: number;
  /** Tỷ lệ biết chữ (%) tại vùng & thời kỳ này. */
  literacyPct: number;
  /** Tỷ lệ dân thành thị (%) tại vùng & thời kỳ này. */
  urbanSharePct: number;
  /** Ghi chú sử liệu / thống kê thực tế hiển thị trên Giấy khai sinh (kiểu 1in8b). */
  historicalFact: string;
  parents: { relation: 'father' | 'mother'; name: string; age: number }[];
  siblings: number;
  farmland: number;
  money: number;
  lifeExpectancy: number;
  peers: PeerView[];
}

export interface StoryView {
  peers: PeerView[];
  reflectionDue: { age: number; question: string } | null;
  reflections: { age: number; question: string; answer: string }[];
  birthCard: BirthCardView;
}

export interface LifeCardView {
  name: string;
  sex: 'm' | 'f';
  birth: { year: number; can: number; chi: number };
  death: { year: number; can: number; chi: number };
  calendarStyle: 'can_chi' | 'bce_ce';
  age: number;
  causeName: string;
  originName: string;
  settlementName: string;
  eraName: string;
  polityName: string;
  careerName: string;
  generation: number;
  epitaph: string;
  highlights: string[];
  /** Một ô mỗi năm đã sống (mức mãn nguyện 0–100). */
  cells: number[];
  expectedLifespan: number;
  peers: PeerView[];
  reflections: { age: number; question: string; answer: string }[];
}

function peerView(ctx: SimContext, p: PeerState): PeerView {
  return {
    id: p.id,
    name: p.name,
    label: p.label,
    sex: p.sex,
    alive: p.alive,
    // Cùng lứa với người chơi: tuổi theo người chơi cho khớp số trên màn hình
    age: p.alive ? ageNow(ctx, player(ctx)) : (p.deathAge ?? 0),
    causeName: p.causeName,
    lastText: p.story.length > 0 ? p.story[p.story.length - 1].text : null,
    story: p.story,
  };
}

export function getStoryView(ctx: SimContext): StoryView {
  const { state } = ctx;
  return {
    peers: (state.peers ?? []).map((p) => peerView(ctx, p)),
    reflectionDue: state.reflectionDue ?? null,
    reflections: state.reflections ?? [],
    birthCard: getBirthCard(ctx),
  };
}

export function getBirthCard(ctx: SimContext): BirthCardView {
  const { state, content } = ctx;
  const me = player(ctx);
  const h = playerHousehold(ctx);
  const origin = content.index.origin.get(state.originId);
  const bookmark = (state.bookmarkId ? content.index.bookmark.get(state.bookmarkId) : undefined) ?? content.index.bookmark.get(content.defaultBookmarkId) ?? content.bookmarks[0];
  const polity =
    (state.polityId ? content.index.polity.get(state.polityId) : undefined) ??
    content.index.polity.get('dai_viet_nha_ly_1000ce') ??
    content.polities[0];
  const civ = content.index.civilization.get(state.civilization.id) ?? content.civilizations[0];
  const bmPolities = bookmark ? content.polities.filter((p) => p.bookmarks.includes(bookmark.id)) : content.polities;
  const totalWorldPopWeight = bmPolities.reduce((s, p) => s + p.population_weight, 0);
  const worldPopSharePct =
    totalWorldPopWeight > 0 && polity ? Math.max(1, Math.round((polity.population_weight / totalWorldPopWeight) * 100)) : 10;

  const weightForOrigin = (id: string, fallback: number) => polity?.origin_weights?.[id] ?? fallback;
  const totalOriginWeight = content.origins.reduce((s, o) => s + weightForOrigin(o.id, o.birth_weight), 0);
  const originWeight = origin ? weightForOrigin(origin.id, origin.birth_weight) : 0;

  const cc = canChi(me.birthYear);
  const parents: BirthCardView['parents'] = [];
  for (const [relation, id] of [['father', me.fatherId], ['mother', me.motherId]] as const) {
    const c = id ? state.characters[id] : undefined;
    if (c) parents.push({ relation, name: fullName(c), age: ageNow(ctx, c) });
  }
  const siblings = aliveMembers(ctx).filter(
    (c) => c.id !== me.id && ((me.fatherId && c.fatherId === me.fatherId) || (me.motherId && c.motherId === me.motherId)),
  ).length;
  const culture = activeCulture(ctx);
  const calendarStyle: 'can_chi' | 'bce_ce' =
    state.civilization.id === 'hien_dai' || state.clock.year >= 1945 || state.clock.year < -500
      ? 'bce_ce'
      : (culture?.calendar_style ?? 'can_chi');
  const rawLex = culture?.lexicon ?? { currency: '', food: '', land: '', staple_crop: '' };
  const childMortality = polity?.demographics.child_mortality ?? bookmark?.default_child_mortality ?? 0.25;
  return {
    name: fullName(me),
    sex: me.sex,
    birthYear: me.birthYear,
    can: cc.can,
    chi: cc.chi,
    calendarStyle,
    lexicon: {
      currency: rawLex.currency,
      food: rawLex.food,
      land: rawLex.land,
      stapleCrop: rawLex.staple_crop,
    },
    settlementName: state.world.settlementName,
    originName: origin?.name ?? state.originId,
    originSharePct: totalOriginWeight > 0 ? Math.round((originWeight / totalOriginWeight) * 100) : 0,
    eraName: bookmark?.era_name ?? '',
    polityName: polity?.name ?? '',
    regionLabel: polity?.region_label ?? '',
    civilizationName: civ?.name ?? '',
    worldPopSharePct,
    childSurvivalPct: Math.round((1 - childMortality) * 100),
    literacyPct: Math.round((polity?.demographics.literacy_rate ?? 0.05) * 100),
    urbanSharePct: Math.round((polity?.demographics.urban_share ?? 0.08) * 100),
    historicalFact: polity?.historical_fact ?? '',
    parents,
    siblings,
    farmland: farmlandOf(h, content),
    money: h.money,
    lifeExpectancy: Math.round(lifeExpectancyAtBirth(ctx)),
    peers: (state.peers ?? []).map((p) => peerView(ctx, p)),
  };
}

/** Thẻ đời cuối đời: thông tin in lên ảnh chia sẻ. */
export function getLifeCard(ctx: SimContext): LifeCardView | null {
  const { state, content } = ctx;
  if (!state.gameOver) return null;
  const me = player(ctx);
  const threshold = content.balance.display.highlight_importance;
  const maxHi = content.balance.display.life_card.max_highlights;
  // Bỏ biên niên và câu mở đầu đời (ai cũng có) — thẻ chỉ in chuyện riêng của đời này
  const openers = new Set([SystemLog.GameStart, ...content.origins.map((o) => o.start_log).filter((x): x is string => !!x)]);
  const highlights = state.log
    .flatMap((y) => y.entries.filter((e) => e.importance >= threshold && !e.sourceId.startsWith('chronicle.') && !openers.has(e.sourceId)))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxHi)
    .sort((a, b) => a.id - b.id)
    .map((e) => e.text);
  const careerId = state.career.history?.length ? state.career.history[state.career.history.length - 1].careerId : state.career.id;
  const bookmark = (state.bookmarkId ? content.index.bookmark.get(state.bookmarkId) : undefined) ?? content.index.bookmark.get(content.defaultBookmarkId) ?? content.bookmarks[0];
  const polity =
    (state.polityId ? content.index.polity.get(state.polityId) : undefined) ??
    content.index.polity.get('dai_viet_nha_ly_1000ce') ??
    content.polities[0];
  const culture = activeCulture(ctx);
  const calendarStyle: 'can_chi' | 'bce_ce' =
    state.civilization.id === 'hien_dai' || state.clock.year >= 1945 || state.clock.year < -500
      ? 'bce_ce'
      : (culture?.calendar_style ?? 'can_chi');
  const cDef = content.index.career.get(careerId);
  const careerName = cDef ? (cDef.names_by_civ?.[state.civilization.id] ?? cDef.name) : '';
  return {
    name: fullName(me),
    sex: me.sex,
    birth: { year: me.birthYear, ...canChi(me.birthYear) },
    death: { year: state.gameOver.year, ...canChi(state.gameOver.year) },
    calendarStyle,
    age: state.gameOver.age,
    causeName: content.balance.life.mortality.causes.find((c) => c.id === state.gameOver!.causeId)?.name ?? state.gameOver.causeId,
    originName: content.index.origin.get(state.originId)?.name ?? state.originId,
    settlementName: state.world.settlementName,
    eraName: bookmark?.era_name ?? '',
    polityName: polity?.name ?? '',
    careerName,
    generation: state.dynasty?.currentGeneration ?? 1,
    epitaph: pickEpitaph(ctx),
    highlights,
    // Năm mất chưa kịp chốt vào bản đồ đời: thêm ô cuối để đời ngắn vẫn có dấu
    cells: [
      ...state.lifeMap.map((c) => c.satisfaction),
      ...(state.lifeMap.length <= state.gameOver.age ? [state.happiness.satisfaction] : []),
    ],
    expectedLifespan: Math.round(lifeExpectancyAtBirth(ctx)),
    peers: (state.peers ?? []).map((p) => peerView(ctx, p)),
    reflections: state.reflections ?? [],
  };
}
