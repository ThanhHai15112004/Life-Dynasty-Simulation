// [0] Thời gian: tick tháng, tổng kết năm. Lõi không có đồng hồ thực — @bridge gọi tickMonth() theo tốc độ người chơi chọn.

export interface ClockState {
  year: number;
  month: number;
  monthIndex: number;
}

export interface MonthPhases {
  /** Chạy mỗi tháng (T0–T1: sức khỏe, kinh tế, XP, sự kiện). */
  monthly(): void;
  /** Chạy ở tháng cuối năm, sau monthly (tổng kết năm, NPC thưa T2). */
  yearEnd(): void;
  /** Chạy khi bước sang năm mới (định được/mất mùa, nhịp nhật ký). */
  yearStart(): void;
  /** Dừng giữa chừng (người chơi chết...) thì bỏ qua phần còn lại. */
  halted(): boolean;
}

export interface TickInfo {
  yearEnded: boolean;
}

export function tickMonth(clock: ClockState, monthsPerYear: number, phases: MonthPhases): TickInfo {
  phases.monthly();
  if (phases.halted()) return { yearEnded: false };
  const yearEnded = clock.month >= monthsPerYear;
  if (yearEnded) {
    phases.yearEnd();
    if (phases.halted()) return { yearEnded: true };
    clock.year += 1;
    clock.month = 1;
  } else {
    clock.month += 1;
  }
  clock.monthIndex += 1;
  if (yearEnded) phases.yearStart();
  return { yearEnded };
}

/** Can Chi của năm (chỉ số 0-based; tên hiển thị nằm trong data/lang). */
export function canChi(year: number): { can: number; chi: number } {
  const mod = (a: number, n: number) => ((a % n) + n) % n;
  return { can: mod(year - 4, 10), chi: mod(year - 4, 12) };
}
