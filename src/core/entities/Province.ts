// [3] Thực thể: Tỉnh / Lộ (Phase 11 — GDD 06 §3)
export interface ProvinceState {
  id: string;
  name: string;
  /** Dân số vĩ mô LOD T3. */
  population: number;
  /** Chỉ số thịnh vượng kinh tế của tỉnh (0..100). */
  prosperity: number;
  /** Mức bất mãn của dân chúng trong tỉnh (0..100). */
  grievance: number;
  /** Lực lượng đồn trú của triều đình tại tỉnh. */
  garrison: number;
  /** Thuế suất thực tế của tỉnh (hệ số 0.5..2.0). */
  taxRate: number;
  /** Trạng thái an ninh tỉnh: 'binh_yen' | 'bat_on' | 'khoi_nghia'. */
  unrestStatus: 'binh_yen' | 'bat_on' | 'khoi_nghia';
}
