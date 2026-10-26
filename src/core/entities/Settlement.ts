// [1] Thực thể: Khu định cư (GDD 02 §2.1 & GDD 06, Phase 7: Một vùng 3 điểm) — làng nông, thị trấn bến sông, phủ thành
export interface SettlementEpidemic {
  diseaseId: string;
  monthsLeft: number;
  sourceId?: string;
}

export interface Settlement {
  id: string;
  name: string;
  typeId: string;
  civilizationId: string;
  /** Dân số mô phỏng thưa (số hộ trong nơi ở). */
  population: number;
  /** Mùa vụ năm nay tại khu định cư này ('mat_mua' | 'binh_thuong' | 'duoc_mua'). */
  harvestQuality: string;
  /** Giá thóc cục bộ (quan/thúng). */
  foodPrice: number;
  /** Chỉ số Thời cơ / giá hàng buôn tại khu định cư (0.7..1.5). */
  tradeIndex: number;
  /** Mức tuần tra quan phủ tại khu định cư (0..100). */
  patrolLevel: number;
  /** Thiên tai trong năm ('none' | 'lut' | 'han'). */
  disaster: string;
  /** Dịch bệnh đang bùng phát tại khu định cư (nếu có). */
  epidemic: SettlementEpidemic | null;
}

export type TripKind = 'buon_chuyen' | 'ung_thi' | 'cong_vu';

export interface ActiveTrip {
  kind: TripKind;
  fromSettlementId: string;
  targetSettlementId: string;
  totalMonths: number;
  monthsLeft: number;
  cargoMoney: number;
  buyTradeIndex: number;
  buyFoodPrice: number;
  homeEmergencyFired: boolean;
}
