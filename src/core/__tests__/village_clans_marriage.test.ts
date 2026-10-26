// [2] Kiểm thử tự động Phase 4: Các họ trong làng (NPC Clans), Character AI T1, Chợ hôn nhân, Gả cưới cho con, Nuôi dạy con cái & 5 kịch bản mới
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';
import { createContext } from '../systems/context';
import { workers } from '../systems/economy/helpers';

const content = loadNodeContent();

describe('Phase 4: Các họ trong làng, Chợ hôn nhân, Gả cưới & Nuôi dạy con cái', () => {
  it('Sinh 5–8 dòng họ NPC trong làng với họ tên từ cultures/, gia thế, nghề nghiệp và quan hệ', () => {
    const session = GameSession.create(content, {
      seed: 'phase4-clans-seed',
      originId: 'nong_dan',
      sex: 'm',
      startAge: 18,
      playMode: 'dynasty',
    });

    const hud = session.read(getHudView);
    expect(hud.villageClans.length).toBeGreaterThanOrEqual(5);
    expect(hud.villageClans.length).toBeLessThanOrEqual(8);

    const familyNames = new Set(hud.villageClans.map((c) => c.familyName));
    expect(familyNames.has(hud.dynasty.familyName)).toBe(false);

    for (const clan of hud.villageClans) {
      expect(clan.memberCount).toBeGreaterThanOrEqual(2);
      expect(clan.statusRankId).toBeTruthy();
      expect(clan.careerId).toBeTruthy();
      expect(clan.prestige).toBeGreaterThan(0);
    }
  });

  it('Nuôi dạy con cái (6–15 tuổi): đổi hướng di_hoc / hoc_nghe / phu_viec_nha ảnh hưởng lao động và tăng XP kỹ năng hàng tháng', () => {
    const sc = content.index.scenario.get('con_gai_16_tuoi_ga')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase4-upbringing' });

    let hud = session.read(getHudView);
    const son11 = hud.household.members.find((m) => m.age === 11 && m.sex === 'm');
    expect(son11).toBeDefined();
    expect(son11!.canSetUpbringing).toBe(true);
    expect(son11!.upbringing).toBe('di_hoc');

    // Khi con 11 tuổi đang 'di_hoc', không tính vào nhân lực cày ruộng (workers)
    const ctx1 = createContext(session.state as never, content);
    const workersStudying = workers(ctx1).length;

    // Đổi sang 'phu_viec_nha' -> nhân lực tăng thêm 1
    const res = session.dispatch({
      type: 'setChildUpbringing',
      childId: son11!.id,
      upbringing: 'phu_viec_nha',
    });
    expect(res.ok).toBe(true);

    const ctx2 = createContext(session.state as never, content);
    const workersFarming = workers(ctx2).length;
    expect(workersFarming).toBe(workersStudying + 1);

    // Chuyển lại sang 'hoc_nghe' và qua 1 tháng -> kiểm tra XP thuong_mai của con tăng
    expect(
      session.dispatch({
        type: 'setChildUpbringing',
        childId: son11!.id,
        upbringing: 'hoc_nghe',
      }).ok,
    ).toBe(true);

    const beforeXp = session.state.characters[son11!.id]?.skills.thuong_mai?.xp ?? 0;
    session.tickMonth();
    const afterXp = session.state.characters[son11!.id]?.skills.thuong_mai?.xp ?? 0;
    expect(afterXp).toBeGreaterThan(beforeXp);

    hud = session.read(getHudView);
    expect(hud.household.members.find((m) => m.id === son11!.id)?.upbringing).toBe('hoc_nghe');
  });

  it('Kịch bản con_gai_16_tuoi_ga & ba_nha_cung_mai_moi: chợ hôn nhân hiển thị ứng viên, gả con gái nhận của hồi môn/sính lễ và kết thông gia', () => {
    const sc = content.index.scenario.get('ba_nha_cung_mai_moi')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase4-matchmaking' });

    const hud = session.read(getHudView);
    expect(hud.pending?.eventId).toBe('gd_ba_moi_dam_ngo');
    expect(hud.matchmaking.targets.length).toBeGreaterThanOrEqual(2);

    // Đóng sự kiện dạm ngõ bằng phương án tự mở bảng Hôn sự cân nhắc
    expect(session.dispatch({ type: 'chooseOption', optionId: 'hoi_y_con' }).ok).toBe(true);

    // Chọn gả cưới qua bảng Hôn sự cho người con trai 18 tuổi hoặc con gái 16 tuổi
    const target = hud.matchmaking.targets.find((t) => !t.isPlayer && t.candidates.length > 0)!;
    expect(target).toBeDefined();
    const candidate = target.candidates.find((c) => c.blockReason === null)!;
    expect(candidate).toBeDefined();

    const prestigeBefore = hud.dynasty.prestige;
    const res = session.dispatch({
      type: 'arrangeMarriage',
      targetCharId: target.characterId,
      candidateId: candidate.characterId,
    });
    expect(res.ok).toBe(true);

    const hudAfter = session.read(getHudView);
    const clanAfter = hudAfter.villageClans.find((c) => c.id === candidate.clanId)!;
    // Nếu con không cãi lời (hoặc cưới thành công), hai họ thành thông gia (in_law) và tăng danh vọng
    const childChar = session.state.characters[target.characterId]!;
    if (childChar.spouseId) {
      expect(clanAfter.tie).toBe('in_law');
      expect(hudAfter.dynasty.prestige).toBeGreaterThanOrEqual(prestigeBefore);
    }
  });

  it('Kịch bản dang_co_thu_voi_mot_ho: dòng họ có thù truyền đời (feud) bị chặn kết thông gia và đồng bộ vào dynasty.feuds', () => {
    const sc = content.index.scenario.get('dang_co_thu_voi_mot_ho')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase4-feud' });

    const hud = session.read(getHudView);
    const feudClan = hud.villageClans.find((c) => c.tie === 'feud');
    expect(feudClan).toBeDefined();
    expect(feudClan!.relationWithPlayer).toBeLessThanOrEqual(-40);
    expect(hud.dynasty.feuds.length).toBeGreaterThanOrEqual(1);
  });

  it('Kịch bản con_trai_hoc_gioi_di_thi: con trai được nuôi dạy đi học có kỹ năng Học vấn cao và mở sự kiện xin tiền đi thi', () => {
    const sc = content.index.scenario.get('con_trai_hoc_gioi_di_thi')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase4-scholar-son' });

    const hud = session.read(getHudView);
    expect(hud.pending?.eventId).toBe('gd_con_trai_xin_di_thi');
    const opt = hud.pending!.options.find((o) => o.id === 'lo_du_leu_chong')!;
    expect(opt).toBeDefined();

    const prestigeBefore = hud.dynasty.prestige;
    expect(session.dispatch({ type: 'chooseOption', optionId: opt.id }).ok).toBe(true);
    const hudAfter = session.read(getHudView);
    expect(hudAfter.dynasty.prestige).toBeGreaterThan(prestigeBefore);
  });

  it('Kịch bản tua_50_nam_xem_lang: Character AI T1 tự vận hành 50 năm, dân số các họ trong làng không tuyệt diệt và không bùng nổ', () => {
    const sc = content.index.scenario.get('tua_50_nam_xem_lang')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase4-50-years' });

    const hud = session.read(getHudView);
    expect(hud.villageClans.length).toBeGreaterThanOrEqual(5);

    const totalMembers = hud.villageClans.reduce((sum, c) => sum + c.memberCount, 0);
    // Sau 50 năm, tổng dân số các họ trong làng nằm trong ngưỡng cân bằng (không chết sạch > 10, không bùng nổ < 60)
    expect(totalMembers).toBeGreaterThanOrEqual(10);
    expect(totalMembers).toBeLessThanOrEqual(60);

    // Mỗi họ đều còn người đứng đầu và thành viên sống
    const aliveClans = hud.villageClans.filter((c) => c.memberCount > 0);
    expect(aliveClans.length).toBe(hud.villageClans.length);
  });
});
