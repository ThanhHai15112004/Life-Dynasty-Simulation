// [1] Hệ thống Thời cơ nghề nghiệp (GDD 03 §9): các biến trạng thái thế giới dao động theo mùa/năm
// giúp cùng một hành động nghề làm đúng lúc thì thắng lớn, sai lúc thì trả giá.
import { clamp } from '@shared/curve';
import { RngStream, type SimContext } from '../context';

/** Đầu năm: định hình khí hậu quân sự / biên ải và mức tuần tra cơ sở của năm. */
export function yearlyOpportunity(ctx: SimContext): void {
  const { state } = ctx;
  const rng = ctx.rng.get(RngStream.World);
  const alerts: { id: string; weight: number }[] = [
    { id: 'binh_yen', weight: 55 },
    { id: 'tuan_tra', weight: 30 },
    { id: 'chien_dich', weight: 15 },
  ];
  const picked = rng.weighted(alerts, (a) => a.weight);
  if (picked) state.world.militaryAlert = picked.id;
}

/** Mỗi tháng: cập nhật chỉ số giá buôn hàng hóa đường dài (tradeIndex) và mức tuần tra quan phủ (patrolLevel). */
export function monthlyOpportunity(ctx: SimContext): void {
  const { state } = ctx;
  const rng = ctx.rng.get(RngStream.World);
  const m = state.clock.month;

  // Giá hàng buôn lên cao vào các tháng giáp Tết (11, 12, 1) hoặc khi mất mùa
  const seasonalTrade = m === 11 || m === 12 || m === 1 ? 1.22 : m === 5 || m === 10 ? 0.88 : 1.02;
  const harvestBump = state.world.harvestQuality === 'mat_mua' ? 0.18 : state.world.harvestQuality === 'kem' ? 0.08 : 0;
  const noise = (rng.next() * 2 - 1) * 0.12;
  state.world.tradeIndex = Math.round(clamp(seasonalTrade + harvestBump + noise, 0.7, 1.55) * 100) / 100;

  // Mức tuần tra quan phủ phụ thuộc động tĩnh quân sự và mức truy nã hiện tại
  const alertBase = state.world.militaryAlert === 'chien_dich' ? 50 : state.world.militaryAlert === 'tuan_tra' ? 35 : 18;
  const wantedBump = state.career.wanted * 0.35;
  state.world.patrolLevel = Math.round(clamp(alertBase + wantedBump + rng.int(-5, 5), 5, 95));
}

