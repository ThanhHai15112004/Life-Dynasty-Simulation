// [9] Kiểm thử tự động cho Phase 9:
// - Đủ 5 bot (an_phan, lieu_linh, tham_vong, ngau_nhien, toi_uu) chạy hoàn chỉnh
// - Hiệu năng tick 1 năm và nén/giải nén SaveSystem (compressSave / decompressSave / saveSizeKb) + cắt tỉa dữ liệu sau 200 năm
// - Kiểm tra độ dày nội dung (content_density warnings) và đồng bộ 100% khóa ngôn ngữ vi.json <-> en.json
import { describe, expect, it } from 'vitest';
import {
  COMPRESSED_SAVE_PREFIX,
  compressSave,
  decompressSave,
  deserialize,
  GameSession,
  saveSizeKb,
  serialize,
} from '../index';
import { loadNodeAssetIds, loadNodeContent } from '../../../tools/shared/nodeContent';
import { BOT_NAMES, makeBot } from '../../../tools/simulate/bots';
import { runDynasty, runLife } from '../../../tools/simulate/run';
import { validateContent } from '../../../tools/validate-content/checks';

const content = loadNodeContent();
// Ngưỡng ms/năm khi chạy chung với các file test khác (tranh CPU song song); chạy riêng đo được ~27–40 ms/năm.
// Đủ rộng để không chập chờn, vẫn bắt được hồi quy chậm gấp nhiều lần.
const MAX_MS_PER_YEAR = 120;

describe('Phase 9: 5 Bots, Save Compression, 200-Year Performance & Content Density', () => {
  it('runs all 5 bots (an_phan, lieu_linh, tham_vong, ngau_nhien, toi_uu) through full lives and dynasties deterministically', () => {
    expect(BOT_NAMES).toEqual(['an_phan', 'lieu_linh', 'tham_vong', 'ngau_nhien', 'toi_uu']);

    for (const botName of BOT_NAMES) {
      const bot = makeBot(botName, `phase9-${botName}`);
      const res = runLife(content, bot, `phase9-life-${botName}`, 16, 60, 'nong_dan');
      expect(res.bot).toBe(botName);
      expect(res.years).toBeGreaterThan(0);
      expect(res.msPerYearTick).toBeLessThan(MAX_MS_PER_YEAR);
    }
  });

  it('compresses and decompresses saves losslessly and keeps 200-year Dynasty save compact (< 250 KB)', () => {
    const dynRes = runDynasty(content, makeBot('tham_vong', 'dyn-200y'), 'dyn-200y-seed', 'nong_dan', 200, 5);
    expect(dynRes.years).toBeGreaterThan(30);
    expect(dynRes.saveSizeKb).toBeGreaterThan(1);
    expect(dynRes.saveSizeKb).toBeLessThan(250);
    expect(dynRes.msPerYearTick).toBeLessThan(MAX_MS_PER_YEAR);

    const session = GameSession.create(content, { originId: 'thuong_nhan', startAge: 16, seed: 'compress-test' });
    for (let m = 0; m < 36; m++) {
      if (session.state.pending) {
        session.dispatch({ type: 'chooseOption', optionId: session.state.pending.options[0].id });
      }
      if (session.state.minor) session.autoResolveMinor();
      session.tickMonth();
    }

    const rawJson = serialize(session.state);
    const compressed = compressSave(rawJson);
    expect(compressed.startsWith(COMPRESSED_SAVE_PREFIX)).toBe(true);
    expect(compressed.length).toBeLessThan(rawJson.length);
    expect(decompressSave(compressed)).toBe(rawJson);

    const restoredFromCompressed = deserialize(compressed);
    expect(restoredFromCompressed.clock.year).toBe(session.state.clock.year);
    expect(restoredFromCompressed.playerId).toBe(session.state.playerId);
    expect(saveSizeKb(session.state)).toBeLessThan(150);
  });

  it('validates 100% language key parity (vi.json <-> en.json) and emits content density backlog warnings', () => {
    const viKeys = Object.keys(content.lang.vi ?? {}).sort();
    const enKeys = Object.keys(content.lang.en ?? {}).sort();
    expect(enKeys).toEqual(viKeys);

    const report = validateContent(content, loadNodeAssetIds());
    expect(report.errors).toEqual([]);
    expect(report.warnings.some((w) => w.startsWith('[Độ dày nội dung]'))).toBe(true);
  });
});
