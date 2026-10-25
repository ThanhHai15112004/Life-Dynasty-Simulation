// [1] Hệ thống Thời cơ nghề nghiệp (GDD 03 §9): các biến trạng thái thế giới dao động theo mùa/năm
// giúp cùng một hành động nghề làm đúng lúc thì thắng lớn, sai lúc thì trả giá. Con số ở data/balance/opportunity.yaml.
import { clamp } from '@shared/curve';
import { lockedAlert } from '../chronicle';
import { RngStream, type SimContext } from '../context';

/** Đầu năm: định hình khí hậu quân sự / biên ải của năm. */
export function yearlyOpportunity(ctx: SimContext): void {
  const locked = lockedAlert(ctx);
  if (locked) {
    ctx.state.world.militaryAlert = locked;
    return;
  }
  const picked = ctx.rng.get(RngStream.World).weighted(ctx.content.balance.opportunity.military_alerts, (a) => a.weight);
  if (picked) ctx.state.world.militaryAlert = picked.id;
}

/** Mỗi tháng: cập nhật chỉ số giá buôn hàng hóa đường dài (tradeIndex) và mức tuần tra quan phủ (patrolLevel). */
export function monthlyOpportunity(ctx: SimContext): void {
  const { state } = ctx;
  const cfg = ctx.content.balance.opportunity;
  const rng = ctx.rng.get(RngStream.World);

  // Giá hàng buôn theo mùa, cộng thêm khi mùa màng kém (hàng khan)
  const t = cfg.trade;
  const seasonal = t.monthly_factor[(state.clock.month - 1) % t.monthly_factor.length];
  const bump = t.harvest_bump[state.world.harvestQuality] ?? 0;
  const noise = (rng.next() * 2 - 1) * t.noise;
  state.world.tradeIndex = Math.round(clamp(seasonal + bump + noise, t.clamp[0], t.clamp[1]) * 100) / 100;

  // Mức tuần tra quan phủ phụ thuộc động tĩnh quân sự và mức truy nã hiện tại
  const p = cfg.patrol;
  const base = cfg.military_alerts.find((a) => a.id === state.world.militaryAlert)?.patrol_base ?? cfg.start_patrol_level;
  const level = base + state.career.wanted * p.wanted_factor + rng.int(-p.noise, p.noise);
  state.world.patrolLevel = Math.round(clamp(level, p.clamp[0], p.clamp[1]));
}
