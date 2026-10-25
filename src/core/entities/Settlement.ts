// [1] Thực thể: Khu định cư (GDD 02 §2.1 & GDD 06) — làng nông, thị trấn bến sông, huyện lỵ, kinh thành
export interface Settlement {
  id: string;
  name: string;
  typeId: string;
  civilizationId: string;
}
