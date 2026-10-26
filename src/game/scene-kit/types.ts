// [1] Kiểu dữ liệu bộ cảnh lắp ghép (public/assets/common/scene-kit.json): bộ phận pixel + bảng màu theo văn hóa và mùa.
// Thêm văn hóa mới = thêm một mục trong `cultures` (màu, kiểu nhà, cây, trang phục), không vẽ lại cả cảnh.

/** Một bộ phận vẽ bằng lưới ký tự: mỗi ký tự là một ô pixel, '.' là trong suốt. */
export interface KitPart {
  /** Các hàng pixel từ trên xuống. */
  rows: string[];
  /** Ký tự → tên ô màu (tra ở bảng màu văn hóa/mùa/người) hoặc mã màu '#rrggbb'. */
  key: Record<string, string>;
}

/** Bảng màu theo mùa: trời, đồi, cỏ, đất, tán lá... */
export type SeasonColors = Record<string, string>;

export interface KitCulture {
  /** Màu cố định của văn hóa (mái, tường, gỗ, vải...). */
  colors: Record<string, string>;
  /** Màu theo mùa (ghi đè `colors`). */
  seasons: Record<string, SeasonColors>;
  /** Sprite nhà / tài sản trong SceneDescriptor → id bộ phận. */
  parts: Record<string, string>;
  /** Bộ phận người theo nhóm tuổi_giới ('nguoi_lon_m', 'tre_nho_f'...). */
  people: Record<string, string>;
  /** Mũ/nón đội khi ra ngoài (bộ phận, vẽ chồng lên đầu người lớn), bỏ trống thì không đội. */
  hat?: { part: string; ageGroups: string[]; chance: number };
  /** Các loại mũ/khăn theo thân phận, nghề nghiệp, cư tang. */
  hats?: Record<string, { part: string; offsetY?: number }>;
  /** Bảng màu chọn cho từng người (theo id người, cố định suốt đời). */
  palettes: Record<string, string[]>;
  /** Bảng màu trang phục theo tầng lớp / nghề nghiệp / cư tang. */
  outfitPalettes?: Record<string, Record<string, string[]>>;
  /** Cây trang trí theo thứ tự xuất hiện trong cảnh. */
  trees: string[];
  fence: string;
}

/** Bộ phận đặt cố định trong một địa điểm. */
export interface KitPlacement {
  part: string;
  x: number;
  /** Mép dưới bộ phận (tính từ trên xuống); mặc định là mặt đất. */
  bottom?: number;
  /** Lặp ngang đến hết khung. */
  repeatX?: number;
}

export interface KitLocation {
  /** Lớp xa: dải đồi núi (cao độ dạng sóng). */
  hills: { color: string; base: number; amp: number; freq: number; phase: number }[];
  /** Mặt nước / ruộng / sân trải ngang (y, cao, màu). */
  bands: { y: number; h: number; color: string }[];
  /** Bộ phận đặt cố định (ruộng, thuyền, sạp chợ...). */
  placements: KitPlacement[];
  /** Vị trí cây (x), loại cây lấy lần lượt từ văn hóa. */
  treeXs: number[];
  /** Hàng rào: từ x đến x. */
  fence: [number, number] | null;
}

export interface SceneKit {
  $comment?: string;
  width: number;
  height: number;
  /** Mặt đất (mép dưới của nhà, người). */
  groundY: number;
  /** Số dải màu của bầu trời (pixel art chia dải thay vì chuyển màu mượt). */
  skyBands: number;
  clouds: { part: string; y: number; speed: number; x: number }[];
  cultures: Record<string, KitCulture>;
  locations: Record<string, KitLocation>;
  slots: {
    house: { x: number };
    props: Record<string, { x: number; bottom?: number }[]>;
    people: { x: number; spacing: number };
  };
  /** Lớp phủ theo tình trạng cảnh (nghèo đói, thịnh vượng, cư tang, ngập lụt...). */
  conditions: Record<string, { tint?: string; alpha?: number; flood?: string }>;
  /** Lớp phủ theo thời tiết (mưa thì trời tối hơn...). */
  weather: Record<string, { tint: string; alpha: number }>;
  /** Hiệu ứng hạt (khói bếp, lá rơi, đom đóm, mưa). */
  particles: Record<string, { color: string; count: number; speed: number }>;
  parts: Record<string, KitPart>;
}

/** Một khối màu cần vẽ (đơn vị pixel của khung gốc). */
export interface KitRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alpha?: number;
}
