// Kiểm thử phiên chơi với dữ liệu thật: tất định, lưu/tải, auto-pause, lệnh người chơi
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';
import { marryPlayer } from '../systems/family';
import { cureCharacter, infectCharacter, kill } from '../systems/life';
import { player } from '../systems/people';
import { changeFilialPiety, examStage, setExamDegree } from '../systems/status';
import { deserialize, serialize } from '../engine/SaveSystem';

const content = loadNodeContent();

/** Chơi n tháng, luôn chọn phương án đầu tiên khi có sự kiện. */
function play(s: GameSession, months: number): void {
  for (let i = 0; i < months && !s.state.gameOver; i++) {
    const r = s.tickMonth();
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
    const s = GameSession.create(content, { seed: 'year' });
    play(s, 12);
    const v = s.read(getHudView);
    expect(v.log.length).toBeGreaterThanOrEqual(1);
    expect(s.state.ledgerHistory.length).toBe(1);
    expect(s.state.ledgerHistory[0].entries.some((e) => e.category === 'thu_hoach')).toBe(true);
    const scene = s.sceneDescriptor();
    expect(scene.house).not.toBeNull();
    expect(scene.people.some((p) => p.isPlayer)).toBe(true);
  });

  it('bán thóc tăng tiền theo giá chợ, không bán quá số đang có', () => {
    const s = GameSession.create(content, { seed: 'trade' });
    const before = s.read(getHudView).household;
    expect(s.dispatch({ type: 'sellFood', amount: 5 }).ok).toBe(true);
    const after = s.read(getHudView).household;
    expect(after.food).toBe(before.food - 5);
    expect(after.money).toBeCloseTo(before.money + 5 * s.read(getHudView).market.sellPrice);
    expect(s.dispatch({ type: 'sellFood', amount: 99999 })).toEqual({ ok: false, error: 'not_enough_food' });
  });

  it('GĐ1: kết hôn, sinh con, mắc/chữa bệnh, đổi tham vọng và xuất tổng kết đời 5 trục', () => {
    const s = GameSession.create(content, { seed: 'phase1-test', startAge: 18 });
    // Đổi tham vọng cả đời
    expect(s.dispatch({ type: 'setAmbition', id: 'gia_dinh_am_em' }).ok).toBe(true);
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

    expect(sNongDan.state.career.id).toBe('nong_dan');
    expect(sThuongNhan.state.career.id).toBe('thuong_nhan');
    expect(sQuyToc.state.career.id).toBe('si_tu');
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
});

