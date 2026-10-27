// Kiểm thử phiên chơi với dữ liệu thật: tất định, lưu/tải, auto-pause, lệnh người chơi
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';
import { marryPlayer } from '../systems/family';
import { earnPersonal, ownMoney } from '../systems/economy/purse';
import { cureCharacter, infectCharacter, kill } from '../systems/life';
import { player, playerHousehold } from '../systems/people';
import { changeFilialPiety, examStage, setExamDegree } from '../systems/status';
import { applyEffects } from '../events/effects';
import { fireMinor } from '../events/decision';
import { deserialize, serialize } from '../engine/SaveSystem';

const content = loadNodeContent();

/** Cho người chơi làm chủ hộ: người lớn tuổi hơn trong nhà qua đời. */
function makeHead(s: GameSession): void {
  s.read((ctx) => {
    const me = player(ctx);
    for (const c of Object.values(ctx.state.characters)) {
      if (c.alive && c.householdId === me.householdId && c.id !== me.id && c.birthYear * 12 + c.birthMonth <= me.birthYear * 12 + me.birthMonth) kill(ctx, c, 'benh');
    }
  });
}

/** Chơi n tháng, luôn chọn phương án đầu tiên khi có sự kiện. */
function play(s: GameSession, months: number): void {
  for (let i = 0; i < months && !s.state.gameOver; i++) {
    const r = s.tickMonth();
    if (r.minor) s.autoResolveMinor();
    if (r.decision) s.dispatch({ type: 'chooseOption', optionId: s.state.pending!.options[0].id });
  }
}

describe('GameSession', () => {
  it('cùng seed + cùng lựa chọn → cùng kết quả (tất định)', () => {
    const a = GameSession.create(content, { seed: 'det' });
    const b = GameSession.create(content, { seed: 'det' });
    play(a, 240);
    play(b, 240);
    expect(a.serialize()).toBe(b.serialize());
  });

  it('lưu giữa chừng rồi tải lại chơi tiếp ra đúng kết quả như chơi liền mạch', () => {
    const a = GameSession.create(content, { seed: 'save' });
    play(a, 60);
    const b = GameSession.load(content, a.serialize());
    play(a, 60);
    play(b, 60);
    expect(b.serialize()).toBe(a.serialize());
  });

  it('có sự kiện thì tự dừng: không tick được cho tới khi chọn', () => {
    const s = GameSession.create(content, { seed: 'pause' });
    let guard = 0;
    while (!s.state.pending && !s.state.gameOver && guard++ < 600) s.tickMonth();
    if (!s.state.pending) return; // hiếm: chết trước khi gặp sự kiện
    const month = s.state.clock.monthIndex;
    s.tickMonth();
    expect(s.state.clock.monthIndex).toBe(month);
    expect(s.dispatch({ type: 'setLivingStandard', id: 'du_day' })).toEqual({ ok: false, error: 'event_pending' });
    expect(s.dispatch({ type: 'chooseOption', optionId: s.state.pending.options[0].id }).ok).toBe(true);
    expect(s.state.pending).toBeNull();
  });

  it('nhật ký, sổ sách, cảnh pixel đều được sinh sau một năm', () => {
    const s = GameSession.create(content, { seed: 'year', startAge: 16 });
    play(s, 12);
    const v = s.read(getHudView);
    expect(v.log.length).toBeGreaterThanOrEqual(1);
    expect(s.state.ledgerHistory.length).toBe(1);
    expect(s.state.ledgerHistory[0].entries.some((e) => e.category === 'thu_hoach')).toBe(true);
    const scene = s.sceneDescriptor();
    expect(scene.house).not.toBeNull();
    expect(scene.people.some((p) => p.isPlayer)).toBe(true);
  });

  it('bán thóc tăng tiền theo giá chợ, không bán quá số đang có (chỉ chủ hộ mới được)', () => {
    const s = GameSession.create(content, { seed: 'trade' });
    // Còn ở với cha mẹ: việc mua bán của nhà do chủ hộ lo
    expect(s.dispatch({ type: 'sellFood', amount: 5 })).toEqual({ ok: false, error: 'not_head' });
    makeHead(s);
    const before = s.read(getHudView).household;
    expect(s.dispatch({ type: 'sellFood', amount: 5 }).ok).toBe(true);
    const after = s.read(getHudView).household;
    expect(after.food).toBe(before.food - 5);
    expect(after.money).toBeCloseTo(before.money + 5 * s.read(getHudView).market.sellPrice);
    expect(s.dispatch({ type: 'sellFood', amount: 99999 })).toEqual({ ok: false, error: 'not_enough_food' });
  });

  it('GĐ1: kết hôn, sinh con, mắc/chữa bệnh, đổi tham vọng và xuất tổng kết đời 5 trục', () => {
    const s = GameSession.create(content, { seed: 'phase1-test', startAge: 18 });
    // Chưa có chí hướng lúc bắt đầu; chí hướng đến từ sự kiện (effect set_ambition)
    expect(s.read(getHudView).ambition.currentId).toBeNull();
    s.read((ctx) => applyEffects(ctx, [{ type: 'set_ambition', ambition: 'gia_dinh_am_em' }]));
    expect(s.read(getHudView).ambition.currentId).toBe('gia_dinh_am_em');

    // Kết hôn & kiểm tra mốc tham vọng đầu tiên ("thanh_gia")
    s.read((ctx) => {
      const spouse = marryPlayer(ctx);
      expect(spouse).not.toBeNull();
      // Mắc bệnh & chữa bệnh
      const me = player(ctx);
      expect(infectCharacter(ctx, me, 'cam_han')).toBe(true);
      expect(me.diseases.length).toBe(1);
      expect(cureCharacter(ctx, me, 'cam_han')).toBe(true);
      expect(me.diseases.length).toBe(0);
    });

    // Chạy đến khi đạt mốc kết hôn và kết thúc đời để kiểm tra 5 trục tổng kết
    play(s, 900);
    const v = s.read(getHudView);
    expect(v.ambition.achievedMilestones).toContain('thanh_gia');
    if (v.gameOver) {
      expect(v.gameOver.axes).toHaveLength(5);
      expect(v.gameOver.axes.map((a) => a.id)).toEqual([
        'man_nguyen',
        'di_san',
        'dau_an',
        'gia_dinh',
        'tham_vong',
      ]);
    }
  });

  it('GĐ1 (Gói 1B): khởi tạo đủ 3 xuất thân, hoạt động nghề nghiệp, chuyển nghề và thăng bậc', () => {
    const sNongDan = GameSession.create(content, { originId: 'nong_dan', seed: 'o1', startAge: 18 });
    const sThuongNhan = GameSession.create(content, { originId: 'thuong_nhan', seed: 'o2', startAge: 18 });
    const sQuyToc = GameSession.create(content, { originId: 'quy_toc_nho', seed: 'o3', startAge: 18 });

    // Nghề nhà theo xuất thân; nghề riêng lúc 18 tuổi: phụ việc nhà (nhà nho thì đi học — Nho sinh)
    expect(sNongDan.state.householdCareer).toBe('nong_dan');
    expect(sThuongNhan.state.householdCareer).toBe('thuong_nhan');
    expect(sQuyToc.state.householdCareer).toBe('si_tu');
    expect(sNongDan.state.career.id).toBe('phu_gia_dinh');
    expect(sThuongNhan.state.career.id).toBe('phu_gia_dinh');
    expect(sQuyToc.state.career.id).toBe('si_tu');
    // Phụ việc nhà chưa có hành động nghề; tự ra làm nghề nông thì có
    expect(sNongDan.dispatch({ type: 'doCareerAction', actionId: 'khan_hoang_bai_boi' }).ok).toBe(false);
    expect(sNongDan.dispatch({ type: 'joinCareer', careerId: 'nong_dan' }).ok).toBe(true);
    expect(sQuyToc.read(getHudView).household.properties.some((p) => p.id === 'phu_nho')).toBe(true);

    // Thực hiện hoạt động nghề nghiệp của Nông dân ("Khẩn hoang bãi bồi", tốn 2 thóc)
    const actionRes = sNongDan.dispatch({ type: 'doCareerAction', actionId: 'khan_hoang_bai_boi' });
    expect(actionRes.ok).toBe(true);
    expect(sNongDan.state.career.actionCooldowns['khan_hoang_bai_boi']).toBeGreaterThan(0);

    // Chuyển sang nghề Lính và kiểm tra thăng bậc khi tích lũy đủ công trạng
    expect(sNongDan.dispatch({ type: 'joinCareer', careerId: 'linh' }).ok).toBe(true);
    expect(sNongDan.state.career.id).toBe('linh');
    expect(sNongDan.state.career.rankIndex).toBe(0);

    // Cộng công trạng và kỹ năng Quân sự để thăng lên bậc Ngũ trưởng (min_merit: 25, quan_su >= 2)
    sNongDan.read((ctx) => {
      player(ctx).skills['quan_su'] = { level: 2, xp: 0 };
    });
    sNongDan.state.career.merit = 30;
    sNongDan.tickMonth();
    expect(sNongDan.state.career.rankIndex).toBeGreaterThanOrEqual(1);
  });

  it('GĐ1 (Gói 1C): Khuôn văn minh Nho giáo, Khoa cử, Cư tang 27 tháng và Cảnh 7 lớp', () => {
    const s = GameSession.create(content, { originId: 'quy_toc_nho', seed: 'civ-test', startAge: 18 });
    const civ = content.index.civilization.get('nho_giao')!;
    const origin = content.index.origin.get('quy_toc_nho')!;
    expect(s.state.civilization.id).toBe('nho_giao');
    expect(s.state.civilization.scholarlyPrestige).toBe(origin.start_status.scholarly_prestige);
    const filialStart = s.state.civilization.filialPiety;

    // Đỗ Hương cống (cần đủ Học vấn) → tăng Danh vọng sĩ phu và phát hoạt cảnh Vinh quy bái tổ
    s.read((ctx) => {
      player(ctx).skills['hoc_van'] = { level: 5, xp: 0 };
      setExamDegree(ctx, 'huong_cong');
      changeFilialPiety(ctx, 10);
    });
    const huongCong = civ.exam_degrees.find((d) => d.id === 'huong_cong')!;
    expect(s.state.civilization.examDegree).toBe('huong_cong');
    expect(s.state.civilization.scholarlyPrestige).toBe(origin.start_status.scholarly_prestige! + huongCong.prestige_gain);
    expect(s.state.civilization.filialPiety).toBe(filialStart + 10);
    expect(s.consumeCutscenes()).toEqual([civ.cutscenes.exam_passed]);
    expect(s.sceneDescriptor().examDegree).toBe('huong_cong');

    // Không bao giờ hạ học vị
    s.read((ctx) => setExamDegree(ctx, 'sinh_do'));
    expect(s.state.civilization.examDegree).toBe('huong_cong');

    // Cha mất → Cư tang, cảnh đổi sang 'cu_tang', hoạt cảnh tang lễ
    s.read((ctx) => {
      const me = player(ctx);
      const father = me.fatherId ? ctx.state.characters[me.fatherId] : undefined;
      expect(father).toBeDefined();
      kill(ctx, father!, 'benh');
    });
    expect(s.state.civilization.mourningMonthsLeft).toBe(civ.mourning_months);
    expect(s.consumeCutscenes()).toEqual([civ.cutscenes.mourning]);
    expect(s.sceneDescriptor().condition).toBe('cu_tang');
  });

  it('Khoa cử: Học vấn chưa đủ thì chỉ nhận học vị vừa sức; thi Hội mở năm sau thi Hương', () => {
    const s = GameSession.create(content, { originId: 'quy_toc_nho', seed: 'exam', startAge: 18 });
    s.read((ctx) => {
      player(ctx).skills['hoc_van'] = { level: 3, xp: 0 };
      setExamDegree(ctx, 'tien_si');
    });
    expect(s.state.civilization.examDegree).toBe('sinh_do');

    const civ = content.index.civilization.get('nho_giao')!;
    const start = content.balance.time.start_year;
    const stageAt = (offset: number) =>
      s.read((ctx) => {
        const saved = ctx.state.clock.year;
        ctx.state.clock.year = start + offset;
        const st = examStage(ctx);
        ctx.state.clock.year = saved;
        return st;
      });
    expect(stageAt(civ.exam_interval_years)).toBe('huong');
    expect(stageAt(civ.exam_interval_years + civ.metropolitan_exam_offset_years)).toBe('hoi');
    expect(stageAt(civ.exam_interval_years + civ.metropolitan_exam_offset_years + 1)).toBe('none');
  });

  it('Xuất thân khác nhau thì cách mưu sinh khác nhau (không phải ai cũng là nông dân)', () => {
    const categories = (originId: string) => {
      const s = GameSession.create(content, { originId, seed: `eco-${originId}`, startAge: 16 });
      for (let i = 0; i < 12 && !s.state.gameOver; i++) {
        const r = s.tickMonth();
        if (r.minor) s.autoResolveMinor();
        if (r.decision) s.dispatch({ type: 'chooseOption', optionId: s.state.pending!.options[0].id });
      }
      const hist = s.state.ledgerHistory.flatMap((y) => y.entries);
      const cur = s.read((ctx) => ctx.state.households[ctx.state.householdId].ledger);
      return { s, cats: new Set([...hist, ...cur].filter((e) => e.money !== 0 || e.food !== 0).map((e) => e.category)) };
    };
    const farmer = categories('nong_dan');
    expect(farmer.cats.has('thu_hoach')).toBe(true);
    expect(farmer.cats.has('thu_to')).toBe(false);
    expect(farmer.s.read(getHudView).household.selfFarm).toBe(true);

    const merchant = categories('thuong_nhan');
    expect(merchant.cats.has('thu_hoach')).toBe(false);
    expect(merchant.cats.has('thu_to')).toBe(true);
    expect(merchant.cats.has('buon_ban')).toBe(true);
    expect(merchant.s.read(getHudView).household.regularIncome).toBeGreaterThan(0);
    expect(merchant.s.sceneDescriptor().location).toBe('thi_tran_ben_song');

    const noble = categories('quy_toc_nho');
    expect(noble.cats.has('thu_hoach')).toBe(false);
    expect(noble.cats.has('thu_to')).toBe(true);
    expect(noble.cats.has('day_hoc')).toBe(true);
    expect(noble.s.sceneDescriptor().location).toBe('lang_nong');
  });

  it('Thang địa vị: đỗ đạt thì lên hàng sĩ phu, có ghi nhật ký và modifier của bậc', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'status', startAge: 18 });
    const civ = content.index.civilization.get('nho_giao')!;
    const before = civ.status_ranks.findIndex((r) => r.id === s.state.civilization.statusRank);
    s.read((ctx) => {
      player(ctx).skills['hoc_van'] = { level: 3, xp: 0 };
      setExamDegree(ctx, 'sinh_do');
    });
    s.tickMonth();
    expect(s.state.civilization.statusRank).toBe('si_phu');
    expect(civ.status_ranks.findIndex((r) => r.id === 'si_phu')).toBeGreaterThan(before);
    expect(s.state.log.flatMap((y) => y.entries).some((e) => e.sourceId === 'sys.dia_vi_len')).toBe(true);
    expect(s.read(getHudView).player.statusRank.id).toBe('si_phu');
  });

  it('Save cũ thiếu trường mới vẫn tải được, giá trị bù lấy từ data', () => {
    const s = GameSession.create(content, { originId: 'thuong_nhan', seed: 'old-save' });
    const raw = JSON.parse(serialize(s.state));
    delete raw.civilization;
    delete raw.cutscenes;
    delete raw.world.settlementType;
    raw.lastCutsceneId = null;
    const loaded = GameSession.load(content, JSON.stringify(raw));
    const civ = content.civilizations[0];
    expect(loaded.state.civilization.filialPiety).toBe(civ.start.filial_piety);
    expect(loaded.state.world.settlementType).toBe('thi_tran_ben_song');
    expect(loaded.state.cutscenes).toEqual([]);
    expect('lastCutsceneId' in loaded.state).toBe(false);
    expect(deserialize(serialize(loaded.state)).cutscenes).toEqual([]);
    play(loaded, 12);
  });

  it('Biên niên vương triều: biến cố ghi nhật ký, đổi niên hiệu, khóa động tĩnh quân sự', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'chronicle' });
    expect(s.state.world.reignName).toBe(content.chronicle.startReign);
    play(s, 12 * 40);
    const fired = Object.keys(s.state.chronicle);
    expect(fired.length).toBeGreaterThan(0);
    // Mỗi biến cố đã xảy ra có ít nhất một dòng nhật ký (biến cố lặp lại có thể nhiều dòng)
    const logged = new Set(s.state.log.flatMap((y) => y.entries).filter((e) => e.sourceId.startsWith('chronicle.')).map((e) => e.sourceId.slice('chronicle.'.length)));
    expect([...logged].sort()).toEqual([...fired].sort());
    // Niên hiệu hiện tại là niên hiệu của lần đổi vua gần nhất (hoặc niên hiệu khởi đầu)
    const reigns = fired.map((id) => content.index.chronicle.get(id)!).filter((e) => e.reign);
    const latest = reigns.sort((a, b) => s.state.chronicle[b.id] - s.state.chronicle[a.id])[0];
    expect(s.state.world.reignName).toBe(latest?.reign ?? content.chronicle.startReign);
    // Biến cố có khóa quân sự thì năm đó động tĩnh đúng như khóa
    const lock = s.state.world.alertLock;
    if (lock && s.state.clock.year <= lock.untilYear) expect(s.state.world.militaryAlert).toBe(lock.id);
  });

  it('Bản đồ cuộc đời: mỗi năm đã sống một ô, có tuổi thọ kỳ vọng', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'lifemap', startAge: 16 });
    play(s, 12 * 3);
    const hud = s.read(getHudView);
    expect(hud.lifeMap.cells.length).toBe(3);
    expect(hud.lifeMap.cells.map((c) => c.age)).toEqual([16, 17, 18]);
    expect(hud.lifeMap.expectedLifespan).toBeGreaterThan(20);
    expect(hud.lifeMap.expectedLifespan).toBeLessThan(80);
  });

  it('Hộ không tự cày đong thóc dự trữ khi có tiền; nghề nhà đổi trọng số sự kiện', () => {
    const s = GameSession.create(content, { originId: 'thuong_nhan', seed: 'reserve', startAge: 16 });
    play(s, 6);
    const hud = s.read(getHudView);
    if (hud.household.money > 1) expect(hud.household.foodMonths).toBeGreaterThanOrEqual(content.balance.economy.tenancy.food_reserve_months - 0.5);
    const merchant = content.index.career.get('thuong_nhan')!;
    expect(merchant.event_weights.buon_ban).toBeGreaterThan(1);
    expect(merchant.event_weights.ruong_dong).toBeLessThan(1);
  });

  it('Trọng tâm theo giai đoạn đời: sơ sinh không có, lớn lên tự chọn theo giai đoạn và nghề nhà', () => {
    const s = GameSession.create(content, { originId: 'thuong_nhan', seed: 'focus-stage', startAge: 0 });
    expect(s.state.focus.primary).toBe('');
    expect(s.read(getHudView).focus.options).toEqual([]);
    play(s, 12 * 7);
    const kid = s.read(getHudView);
    expect(kid.focus.canChoose).toBe(true);
    // Con nhà buôn: có "Theo cha ra sạp", không có việc đồng
    const ids = kid.focus.options.map((o) => o.id);
    expect(ids).toContain('phu_sap');
    expect(ids).not.toContain('phu_viec_dong');
    expect(ids).toContain(s.state.focus.primary);
    expect(kid.focus.options.every((o) => o.hints.length > 0 || o.id === 'le_chua')).toBe(true);
    // Chọn trọng tâm không thuộc giai đoạn thì bị từ chối
    expect(s.dispatch({ type: 'setFocus', focusId: 'lam_an' })).toEqual({ ok: false, error: 'focus_unavailable' });
  });

  it('Chưa làm chủ hộ thì nhà tự lo: mức sống theo gia cảnh, không tự mua bán được', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'household', startAge: 16 });
    expect(s.read(getHudView).manage.isHead).toBe(false);
    expect(s.dispatch({ type: 'setLivingStandard', id: 'xa_hoa' })).toEqual({ ok: false, error: 'not_head' });
    play(s, 12);
    const level = s.read(getHudView).household.livingStandard;
    expect(content.balance.living_standards.levels.map((l) => l.id)).toContain(level);
    expect(content.balance.living_standards.auto_budget.manual_only).not.toContain(level);
    makeHead(s);
    expect(s.read(getHudView).manage.isHead).toBe(true);
    expect(s.dispatch({ type: 'setLivingStandard', id: 'du_day' }).ok).toBe(true);
    expect(s.state.autoManage.livingStandard).toBe(false);
  });

  it('Chí hướng không có lúc sinh, hình thành qua sự kiện trưởng thành', () => {
    const s = GameSession.create(content, { originId: 'quy_toc_nho', seed: 'ambition-event', startAge: 16 });
    expect(s.state.ambition.id).toBeNull();
    for (let m = 0; m < 12 * 6 && !s.state.ambition.id && !s.state.gameOver; m++) {
      const r = s.tickMonth();
      if (r.minor) s.autoResolveMinor();
      if (r.decision) s.dispatch({ type: 'chooseOption', optionId: s.state.pending!.options[0].id });
    }
    expect(s.state.ambition.id).not.toBeNull();
    expect(Object.keys(s.state.stats.eventsSeen).some((id) => id.startsWith('ch_truong_thanh'))).toBe(true);
  });

  it('Chuyện nhỏ dừng thời gian chờ chọn; tự quyết thì chọn phương án mặc định', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'minor', startAge: 16 });
    const ev = content.events.find((e) => e.minor && e.roles.length === 0)!;
    expect(ev).toBeDefined();
    s.read((ctx) => fireMinor(ctx, ev, {}));
    expect(s.state.minor?.eventId).toBe(ev.id);
    const month = s.state.clock.monthIndex;
    expect(s.tickMonth().minor).toBe(true);
    expect(s.state.clock.monthIndex).toBe(month);
    s.autoResolveMinor();
    expect(s.state.minor).toBeNull();
    expect(s.state.stats.minorDecisions).toBe(1);
    const def = ev.options.find((o) => o.default) ?? ev.options[0];
    expect(s.state.log.flatMap((y) => y.entries).some((e) => e.sourceId === ev.id)).toBe(true);
    expect(def).toBeDefined();
    s.tickMonth();
    expect(s.state.clock.monthIndex).toBe(month + 1);
  });

  it('Nghề riêng tách khỏi nghề nhà: phụ việc nhà tích kinh nghiệm, làm chủ hộ thì thừa kế nghề nhà', () => {
    const s = GameSession.create(content, { originId: 'thuong_nhan', seed: 'inherit', startAge: 16 });
    expect(s.state.career.id).toBe('phu_gia_dinh');
    expect(s.read(getHudView).career.kind).toBe('trang_thai');
    play(s, 6);
    expect(s.state.career.merit).toBeGreaterThan(0);
    // Đủ kinh nghiệm và tay nghề cho bậc "Chủ sạp" rồi mới làm chủ hộ
    s.read((ctx) => {
      player(ctx).skills['thuong_mai'] = { level: 3, xp: 0 };
      ctx.state.career.merit = 30;
    });
    makeHead(s);
    s.tickMonth();
    expect(s.state.career.id).toBe('thuong_nhan');
    expect(s.state.career.rankIndex).toBeGreaterThanOrEqual(1);
    expect(s.state.log.flatMap((y) => y.entries).some((e) => e.sourceId === 'sys.thua_ke_nghe')).toBe(true);
  });

  it('Nhà không có nghề để phụ thì đến tuổi là thất nghiệp; chủ hộ đổi nghề thì nghề nhà đổi theo', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'jobless', startAge: 6 });
    s.read((ctx) => {
      ctx.state.householdCareer = 'that_nghiep';
    });
    // Chơi tới đúng lúc bắt đầu tự lập; luôn chọn phương án không đổi nghề (sự kiện mời học nghề không thuộc phạm vi kiểm tra này)
    const noCareerOption = () => {
      const ev = content.index.event.get(s.state.pending!.eventId)!;
      const shown = s.state.pending!.options.map((o) => o.id);
      const safe = ev.options.find(
        (o) => shown.includes(o.id) && ![...o.effects, ...o.success, ...o.failure].some((e) => e.type === 'set_career'),
      );
      return safe?.id ?? shown[0];
    };
    for (let m = 0; m < 12 * 12 && !s.state.gameOver && !s.state.career.id; m++) {
      const r = s.tickMonth();
      if (r.minor) s.autoResolveMinor();
      if (r.decision) s.dispatch({ type: 'chooseOption', optionId: noCareerOption() });
    }
    if (s.state.gameOver) return;
    expect(s.state.career.id).toBe('that_nghiep');
    makeHead(s);
    expect(s.dispatch({ type: 'joinCareer', careerId: 'linh' }).ok || s.read(getHudView).career.availableCareers.every((c) => c.id !== 'linh' || !c.available)).toBe(true);
    if (s.state.career.id === 'linh') expect(s.state.householdCareer).toBe('linh');
  });

  it('Sự kiện nào hiện ra cũng có ít nhất 2 lựa chọn (kể cả chuyện nhỏ)', () => {
    for (const originId of ['nong_dan', 'thuong_nhan', 'quy_toc_nho']) {
      const s = GameSession.create(content, { originId, seed: `options-${originId}`, startAge: 6 });
      for (let m = 0; m < 12 * 40 && !s.state.gameOver; m++) {
        const r = s.tickMonth();
        if (r.minor) {
          expect(s.state.minor!.options.length).toBeGreaterThanOrEqual(2);
          s.autoResolveMinor();
        }
        if (r.decision) {
          expect(s.state.pending!.options.length).toBeGreaterThanOrEqual(2);
          s.dispatch({ type: 'chooseOption', optionId: s.state.pending!.options[0].id });
        }
      }
    }
  });

  it('Chạy chữa: chỉ chủ hộ được bỏ tiền; chữa xong thì khỏi, hoặc phải chờ mới chữa lại', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'treat', startAge: 20 });
    const meId = s.state.playerId;
    s.read((ctx) => infectCharacter(ctx, player(ctx), 'sot_ret', true));
    const cmd = { type: 'treatDisease', characterId: meId, diseaseId: 'sot_ret' } as const;
    expect(s.dispatch(cmd)).toEqual({ ok: false, error: 'not_head' });
    makeHead(s);
    s.read((ctx) => {
      playerHousehold(ctx).money = 50;
    });
    const sick = s.read(getHudView).household.sick.find((x) => x.diseaseId === 'sot_ret');
    expect(sick?.block).toBeNull();
    expect(s.dispatch(cmd).ok).toBe(true);
    const cost = content.index.disease.get('sot_ret')!.cure_cost;
    expect(s.read((ctx) => playerHousehold(ctx).money)).toBeCloseTo(50 - cost);
    const still = s.state.characters[meId].diseases.find((d) => d.id === 'sot_ret');
    if (still) expect(s.dispatch(cmd)).toEqual({ ok: false, error: 'treated_recently' });
  });

  it('Mốc cưới hỏi bảo đảm: quá tuổi chưa lập gia đình thì bà mối chắc chắn tìm đến', () => {
    for (const originId of ['nong_dan', 'thuong_nhan', 'quy_toc_nho']) {
      const s = GameSession.create(content, { originId, seed: `wed-${originId}`, startAge: 22 });
      let asked = false;
      for (let m = 0; m < 24 && !s.state.gameOver && !asked; m++) {
        const r = s.tickMonth();
        if (r.minor) s.autoResolveMinor();
        if (r.decision) {
          asked = s.state.pending!.eventId === 'gd_den_tuoi_lap_gia_that' || !!s.state.characters[s.state.playerId].spouseId;
          s.dispatch({ type: 'chooseOption', optionId: s.state.pending!.options[0].id });
        }
        if (s.state.characters[s.state.playerId].spouseId) asked = true;
      }
      if (!s.state.gameOver && s.state.civilization.mourningMonthsLeft === 0) expect(asked).toBe(true);
    }
  });

  it('[1.5] Cha mẹ già giao việc nhà cho người chơi đã lập gia đình', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'handover', startAge: 22 });
    s.read((ctx) => {
      marryPlayer(ctx);
    });
    // Cha mẹ còn sức: vẫn là chủ hộ
    expect(s.read(getHudView).manage.isHead).toBe(false);
    s.read((ctx) => {
      const me = player(ctx);
      const elder = ctx.content.balance.life.headship.elder_age;
      for (const id of [me.fatherId, me.motherId]) {
        const c = id ? ctx.state.characters[id] : undefined;
        if (c?.alive) c.birthYear = ctx.state.clock.year - elder - 1;
      }
    });
    expect(s.read(getHudView).manage.isHead).toBe(true);
  });

  it('[1.5] Tài sản ròng tính cả thóc; chốt sổ năm: các dòng cộng lại đúng bằng mức thay đổi', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'books', startAge: 16 });
    const base = content.balance.economy.price.base;
    const before = s.read(getHudView).household.netWorth;
    s.read((ctx) => {
      playerHousehold(ctx).food += 100;
    });
    expect(s.read(getHudView).household.netWorth).toBeCloseTo(before + 100 * base);
    play(s, 24);
    const hud = s.read(getHudView);
    const last = s.state.ledgerHistory[s.state.ledgerHistory.length - 1];
    const close = hud.household.yearClose!;
    expect(close.year).toBe(last.year);
    expect(close.delta).toBeCloseTo(last.netWorth - last.openNetWorth);
    expect(close.lines.length).toBeLessThanOrEqual(content.balance.display.wealth.year_lines + 1);
    expect(close.lines.reduce((sum, l) => sum + l.value, 0)).toBeCloseTo(close.delta, 0);
    expect(hud.household.incomeYear).toBeCloseTo(last.income);
    // Nhà nông có thu hoạch thì thu nhập năm không thể bằng 0
    expect(last.income).toBeGreaterThan(0);
  });

  it('[1.5] Hiệu ứng sell_food chỉ bán phần vượt mức dự trữ', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'sell-food', startAge: 16 });
    s.read((ctx) => {
      const h = playerHousehold(ctx);
      h.food = 100;
      const money = h.money;
      applyEffects(ctx, [{ type: 'sell_food', share: 1, keep_months: 1000, price_factor: 1 }], {});
      expect(h.food).toBe(100);
      applyEffects(ctx, [{ type: 'sell_food', share: 0.5, keep_months: 0, price_factor: 1 }], {});
      expect(h.food).toBe(50);
      expect(h.money).toBeGreaterThan(money);
    });
  });

  it('[1.5] Túi tiền riêng: trẻ con tài sản là 0; tiền mình làm ra vào túi, góp một phần cho nhà; làm chủ hộ thì gộp vào gia sản', () => {
    const kid = GameSession.create(content, { originId: 'nong_dan', seed: 'purse-kid', startAge: 6 });
    const k = kid.read(getHudView).personal;
    expect(k.active).toBe(true);
    expect(k.money).toBe(0);
    expect(k.young).toBe(true);

    const s = GameSession.create(content, { originId: 'thuong_nhan', seed: 'purse', startAge: 16 });
    const share = content.balance.economy.purse.contribute_share;
    s.read((ctx) => {
      const h = playerHousehold(ctx);
      const before = h.money;
      earnPersonal(ctx, 'tien_cong', 10);
      expect(ctx.state.purse.money).toBeCloseTo(10 * (1 - share));
      expect(h.money).toBeCloseTo(before + 10 * share);
      ownMoney(ctx, 'li_xi', 2);
      expect(ctx.state.purse.money).toBeCloseTo(10 * (1 - share) + 2);
    });
    const hud = s.read(getHudView);
    expect(hud.personal.active).toBe(true);
    expect(hud.personal.money).toBeCloseTo(10 * (1 - share) + 2);
    const purse = s.state.purse.money;
    const houseBefore = s.state.households[s.state.householdId].money;
    makeHead(s);
    play(s, 1);
    expect(s.read(getHudView).personal.active).toBe(false);
    expect(s.state.purse.money).toBe(0);
    const h = s.state.households[s.state.householdId];
    expect(h.ledger.find((e) => e.category === 'tien_rieng_gop')?.money).toBeCloseTo(purse);
    expect(h.money).toBeGreaterThan(houseBefore - 50);
  });

  it('[1.5] Nợ: có dư là trả ngay trong tháng, lãi tính theo tháng', () => {
    const s = GameSession.create(content, { originId: 'nong_dan', seed: 'debt-now', startAge: 16 });
    s.read((ctx) => {
      const h = playerHousehold(ctx);
      h.debt = 10;
      h.money = 200;
    });
    play(s, 1);
    const h = s.state.households[s.state.householdId];
    expect(h.debt).toBe(0);
    expect(h.ledger.some((e) => e.category === 'tra_no')).toBe(true);
    expect(h.ledger.find((e) => e.category === 'lai_no')?.money).toBeCloseTo((-10 * content.balance.economy.debt.annual_interest) / 12);
  });

  it('[World Lottery] Bốc thăm số phận toàn cầu qua các thời đại (8000 TCN → 2025 SCN)', () => {
    expect(content.bookmarks.length).toBeGreaterThanOrEqual(9);
    expect(content.polities.length).toBeGreaterThanOrEqual(30);

    // 1. Thời Nguyên Thủy (8000 TCN)
    const pre = GameSession.create(content, {
      lottery: true,
      bookmarkId: 'nguyen_thuy_8000bce',
      seed: 'neolithic-lottery',
    });
    expect(pre.state.bookmarkId).toBe('nguyen_thuy_8000bce');
    expect(pre.state.clock.year).toBe(-8000);
    const preCard = pre.read(getHudView).story.birthCard;
    expect(preCard.eraName).toBe(content.index.bookmark.get('nguyen_thuy_8000bce')!.era_name);
    expect(preCard.worldPopSharePct).toBeGreaterThan(0);

    // 2. Thế Giới Hiện Đại (2025 SCN)
    const mod = GameSession.create(content, {
      lottery: true,
      bookmarkId: 'hien_dai_2025ce',
      seed: 'modern-lottery',
    });
    expect(mod.state.bookmarkId).toBe('hien_dai_2025ce');
    expect(mod.state.clock.year).toBe(2025);
    const modCard = mod.read(getHudView).story.birthCard;
    expect(modCard.lifeExpectancy).toBeGreaterThanOrEqual(65);
    expect(modCard.childSurvivalPct).toBeGreaterThanOrEqual(90);

    // 3. Ngẫu nhiên mọi thời đại (random_all) tất định theo seed
    const r1 = GameSession.create(content, { lottery: true, bookmarkId: 'random_all', seed: 'global-seed-1' });
    const r2 = GameSession.create(content, { lottery: true, bookmarkId: 'random_all', seed: 'global-seed-1' });
    expect(r1.state.bookmarkId).toBe(r2.state.bookmarkId);
    expect(r1.state.polityId).toBe(r2.state.polityId);
    expect(r1.state.cultureId).toBe(r2.state.cultureId);
    expect(r1.state.civilization.id).toBe(r2.state.civilization.id);
  });
});

