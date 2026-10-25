# Danh sách Art cần chuẩn bị — Dòng Đời

> **Cập nhật 25/10/2026 — đổi hướng:** cảnh chính không còn dùng tranh pixel vẽ kín khung (chỉ hợp làng quê Việt, không tháo rời được). Cảnh giờ **vẽ bằng code từ bộ phận lắp ghép** trong [`public/assets/common/scene-kit.json`](../public/assets/common/scene-kit.json), theo phong cách tối giản như 1in8b:
> - Mỗi bộ phận (nhà, cây, rào, thuyền, sạp, trâu, người theo tuổi/giới, nón lá…) là một **lưới ký tự**: mỗi ký tự một ô pixel, `key` ánh xạ ký tự → **tên ô màu** (`thatch`, `skin`, `top_m`…) hoặc mã `#rrggbb`.
> - `cultures.<culture_set>` giữ bảng màu cố định, màu theo mùa, kiểu nhà/cây/rào, bảng màu trang phục để mỗi người một vẻ, và mũ/nón. **Thêm khuôn văn minh mới = thêm một mục `cultures`** (mái ngói đỏ kiểu Âu, cây ô-liu, áo choàng…), không vẽ lại cả cảnh.
> - `locations.<id>` là bố cục theo loại khu định cư (đồi, dải nước/ruộng, bộ phận cố định, vị trí cây, hàng rào); `slots` là chỗ đặt nhà, tài sản, người.
> - Chân dung trong thẻ hồ sơ và danh sách gia đình dùng **chính bộ phận người** của cảnh.
> - Icon giao diện (`public/assets/common/ui/icons`, `sprites.json`) vẫn dùng ảnh như cũ. Các ảnh cảnh cũ trong `public/assets/common/terrain`, `civilizations/nho_giao` không còn được nạp; giữ lại làm tư liệu.
>
> Phần dưới là danh sách cũ cho hướng tranh vẽ, chỉ còn giá trị tham khảo bảng màu và tỷ lệ.

Tài liệu liệt kê **mọi hình ảnh game đang cần**, theo thứ tự ưu tiên. Mỗi asset có **id cố định**, vì code và dữ liệu gọi asset theo id (`src/data/`, `public/assets/common/placeholder/scene-art.json`). Đặt tên file đúng id thì lắp vào là chạy.

## Hiện trạng (đã xử lý bằng `npm run process-art`)

Ảnh nguồn nằm ở `art-source/` (chỉ trên máy, không commit). Công cụ `tools/process-art/` cắt, tách nền, thu về lưới 320×180 rồi ghi vào `public/assets/` cùng `sprites.json`. Vùng cắt và kích thước khai báo trong `tools/process-art/manifest.json`.

| Nhóm | Trạng thái |
| :--- | :--- |
| Lớp 1 địa hình 4 mùa, ruộng mất mùa, đường đất | ✔ Đã dùng trong cảnh |
| Lớp 2 nhà tranh, nhà gỗ ba gian | ✔ Đã dùng (khói vẽ sẵn đã xóa, khói bếp do lớp hạt vẽ) |
| Lớp 3 thời tiết (6 lớp phủ) | ✔ Đã dùng |
| Lớp 4 người: 4 tuổi × nam/nữ × đứng/đi/cuốc (trẻ nhỏ: chơi), dấu người chơi | ✔ Đã dùng |
| Lớp 5 trâu, đàn gà, ao cá, kho lúa | ✔ Đã dùng |
| Lớp 6 nước lũ, đèn lồng | ✔ Đã dùng |
| Lớp 6 `phu_ngheo_doi`, `phu_thinh_vuong` | ✖ Ảnh nhận được là cảnh hoàn chỉnh, không phải lớp phủ trong suốt; tạm dùng phủ màu |
| Lớp 7 hạt (khói, lá, đom đóm, mưa) | ✖ Chưa có ảnh; đang vẽ bằng khối pixel |
| Icon P1 (48 icon) | ✔ Đã dùng ở nhật ký, thẻ sự kiện, Focus |
| Icon thanh thời gian, khung 9-slice, nút, thanh chỉ số | Đã có trong ảnh nguồn, chưa cắt (giao diện vẫn dùng CSS) |
| Cutscene, nhân vật theo tầng lớp, NPC làng, nhà bậc cao, cảnh mới | Đã có trong ảnh nguồn, để GĐ1 |
| Font | ✖ Chưa có |

---

## 0. Quy chuẩn chung (áp dụng cho mọi asset)

| Hạng mục | Quy chuẩn |
| :--- | :--- |
| Phong cách | Pixel art 2D thủ công, pixel vuông sắc nét, góc nhìn ngang (side-view). Xem prompt mẫu ở [prompt tạo art.md](prompt%20tạo%20art.md) |
| Bối cảnh | Làng quê đồng bằng kiểu **Đại Việt thế kỷ 11** (giả tưởng lấy cảm hứng lịch sử): lũy tre, ruộng lúa nước, nhà tranh, đình làng |
| Độ phân giải gốc của cảnh | **320 × 180 px** (16:9). Game phóng nguyên lần ×4 (1280×720) hoặc ×6 (1920×1080) |
| Định dạng | PNG nền trong suốt (trừ ảnh nền). Không khử răng cưa (anti-aliasing), không làm mờ |
| Mật độ pixel | Mọi asset cùng thang 1 pixel = 1 pixel ở khung 320×180. Không trộn asset vẽ ở độ phân giải khác |
| Bảng màu khuôn Nho giáo | Nâu đất, xanh lúa, vàng rơm, đỏ son, đen mực (GDD 08 §3). Ánh lửa vàng cam tương phản bóng xanh tím đậm |
| Hoạt ảnh | Sprite sheet ngang, các khung cùng kích thước, ghi rõ số khung và kích thước một khung trong tên file, ví dụ `trau_idle_24x12_4f.png` |
| Nơi đặt | Thư mục ghi trong từng bảng, tính từ `public/assets/` |

> Kích thước dưới đây là **gợi ý** theo khung 320×180, lấy từ bố cục cảnh tạm hiện tại (lưới 160×90, nhân đôi). Lệch vài pixel không sao, miễn giữ đúng tỷ lệ người / nhà / trâu.

---

## P0 — Cảnh chính GĐ0 (thay hình tạm, ưu tiên cao nhất)

Cảnh được ghép từ **7 lớp** (GDD 08 §2). Mỗi lớp dưới đây là một nhóm file.

### Lớp 1 — Địa hình (nền) · `common/terrain/`

Một cảnh làng nông, vẽ đủ **4 mùa**. Nên tách thành các dải nền (parallax) để ghép:

| id file | Nội dung | Kích thước | Biến thể |
| :--- | :--- | :--- | :--- |
| `bau_troi_{mua}` | Bầu trời (có thể kèm mây) | 320×100 | `xuan`, `ha`, `thu`, `dong` |
| `doi_xa_{mua}` | Dải đồi, rặng cây xa ở đường chân trời | 320×40 | 4 mùa |
| `luy_tre_{mua}` | Khóm lũy tre hai bên cảnh (trái, phải) | ~48×56 mỗi khóm | 4 mùa |
| `ruong_lua_{mua}` | Mặt ruộng phía trước, có bờ ruộng, luống lúa | 320×52 | `xuan` mạ non · `ha` lúa xanh · `thu` lúa chín vàng · `dong` gốc rạ |
| `ruong_mat_mua` | Ruộng mất mùa: khô nứt, lúa lép | 320×52 | 1 |
| `duong_dat` | Con đường đất nối nhà ra ruộng | 260×4, lặp ngang được | 1 |

### Lớp 2 — Công trình · `civilizations/nho_giao/buildings/`

| id | Nội dung | Kích thước | Ghi chú |
| :--- | :--- | :--- | :--- |
| `nha_tranh` | Nhà tranh vách đất, mái rạ, 1 gian, cửa liếp | ~52×38 | Nhà khởi đầu của nông dân. Cần chỗ để khói bếp bốc lên |
| `nha_go` | Nhà gỗ ba gian, mái ngói, nền cao | ~72×44 | Nâng cấp lớn (90 quan). Nhìn vào phải thấy "nhà đã khá" |

### Lớp 3 — Thời tiết, ánh sáng · `common/effects/`

Lớp phủ toàn cảnh 320×180, nền trong suốt hoặc bán trong suốt:

| id | Nội dung |
| :--- | :--- |
| `thoi_tiet_mua` | Trời mưa: ám xanh xám |
| `thoi_tiet_mua_phun` | Mưa phùn: mờ nhẹ |
| `thoi_tiet_han` | Nắng hạn: ám vàng cam, hơi chói |
| `thoi_tiet_suong_mu` | Sương mù: trắng mờ ở tầng thấp |
| `thoi_tiet_gio_bac` | Gió bấc: lạnh, xanh nhạt |
| `thoi_tiet_nang` | Nắng ráo: ấm nhẹ (có thể bỏ trống) |

### Lớp 4 — Người trong hộ · `civilizations/nho_giao/characters/`

Người nông dân thời Lý–Trần: áo nâu, quần thâm, khăn mỏ quạ hoặc chít khăn, nón lá, chân đất. Nhìn ngang, nhỏ, đọc được dáng người.

| id | Nhóm tuổi | Cao | Biến thể giới tính |
| :--- | :--- | :--- | :--- |
| `nguoi_tre_nho_{m,f}` | 0–5 tuổi | ~8 px | nam, nữ |
| `nguoi_thieu_nien_{m,f}` | 6–15 tuổi | ~12 px | nam, nữ |
| `nguoi_lon_{m,f}` | 16–55 tuổi | ~16 px | nam, nữ |
| `nguoi_gia_{m,f}` | 56+ tuổi | ~14 px (lưng còng, tóc bạc) | nam, nữ |

Mỗi nhân vật cần tối thiểu: **đứng yên (2 khung, thở nhẹ)**. Nếu được thì thêm: **cuốc ruộng (4 khung)** và **đi bộ (4 khung)**.

Thêm một dấu nhỏ `dau_nguoi_choi` (~3×3, ví dụ chấm vàng hoặc mũi tên) đặt trên đầu nhân vật người chơi.

### Lớp 5 — Tài sản, đồ vật · `civilizations/nho_giao/props/`

| id | Nội dung | Kích thước | Hoạt ảnh gợi ý |
| :--- | :--- | :--- | :--- |
| `trau` | Trâu cày (có thể vẽ 2 con) | ~24×12 | Đứng nhai cỏ, vẫy đuôi (4 khung) |
| `dan_ga` | Đàn 3–4 con gà, một con trống mào đỏ | ~20×6 | Mổ thóc (2–4 khung) |
| `ao_ca` | Ao cá nhỏ trước nhà | ~40×8 | Gợn nước (3 khung) |
| `kho_lua` | Kho thóc nhỏ, mái rơm, sàn kê cao | ~18×20 | — |

### Lớp 6 — Tình trạng · `common/effects/`

| id | Nội dung | Kích thước |
| :--- | :--- | :--- |
| `lu_nuoc_ngap` | Nước lũ dâng ngập ruộng, gợn sóng | 320×18, lặp ngang được, 3 khung gợn |
| `phu_ngheo_doi` | Lớp phủ tối, ảm đạm cho nhà nghèo đói | 320×180 bán trong suốt |
| `phu_thinh_vuong` | Lớp phủ ấm, sung túc | 320×180 bán trong suốt |
| `den_long` | Đèn lồng đỏ treo hiên nhà khá giả | ~4×6, 2 khung lay |

(Tình trạng `mat_mua` dùng `ruong_mat_mua` ở lớp 1; `binh_yen` không cần thêm gì.)

### Lớp 7 — Hiệu ứng hạt · `common/effects/particles/`

Các hạt rất nhỏ, game tự nhân bản và cho bay:

| id | Nội dung | Kích thước |
| :--- | :--- | :--- |
| `khoi_bep` | Cụm khói bếp | 4×4, 3–4 khung tan dần |
| `la_roi` | Chiếc lá vàng nâu | 2×2, 2 khung lật |
| `dom_dom` | Đom đóm | 1×1 hoặc 2×2 phát sáng |
| `mua_roi` | Hạt mưa | 1×4 |

---

## P1 — Icon giao diện (nhật ký, sự kiện, Focus) · `common/ui/icons/`

Kích thước **16×16** (vẽ thêm bản 32×32 nếu muốn chi tiết), nền trong suốt, cùng phong cách pixel. Dữ liệu đã gắn sẵn các id này; **UI chưa hiển thị icon**, khi có hình chỉ cần thêm phần hiển thị.

**Nhật ký & sự kiện** (số trong ngoặc là số mẫu đang dùng, càng nhiều càng nên vẽ trước):

| id | Hình | id | Hình |
| :--- | :--- | :--- | :--- |
| `tien` (6) | Xâu tiền đồng | `sach` (5) | Cuốn sách chữ Nho / nghiên bút |
| `lang` (5) | Mái đình làng | `gia_dinh` (5) | Mâm cơm gia đình |
| `om` (4) | Bát thuốc / khăn chườm | `lua` (4) | Bó lúa chín |
| `ca` (4) | Con cá | `tin_don` (3) | Tai nghe / người thì thầm |
| `no` (3) | Sổ nợ / ống tre ghi nợ | `meo` (3) | Mèo mướp |
| `mat_mua` (3) | Bông lúa lép, đất nứt | `ga` (3) | Con gà |
| `cuoi` (3) | Trầu cau / chữ Hỷ đỏ | `cay` (3) | Cái cày |
| `binh_yen` (3) | Mái nhà có khói bếp | `tre_em` (2) | Đứa trẻ |
| `trau` (2) | Đầu trâu | `thuoc` (2) | Thang thuốc bắc |
| `thue` (2) | Bao thóc nộp thuế | `tet` (2) | Bánh chưng |
| `tang` (2) | Khăn tang / nén hương | `ruong` (2) | Thửa ruộng, cọc mốc |
| `nha` (2) | Ngôi nhà | `nguoi_la` (2) | Người khách rách rưới, nón mê |
| `nang` (2) | Mặt trời gắt | `kiem` (2) | Gậy / kiếm tập võ |
| `cho` (2) | Con chó vện | `chen_tra` (2) | Chén trà, ấm tích |
| `trang` | Trăng rằm | `tong_hop` | Cuộn giấy tổng kết năm |
| `sinh_nhat` | Quả trứng đỏ / bánh | `sau` | Sâu rầy trên lá lúa |
| `phu` | Quang gánh đất đắp đê | `mua` | Mây mưa |
| `moc_doi` | Cột mốc / bậc thang | `lu` | Sóng nước lũ |
| `la` | Chiếc lá (nghỉ ngơi) | `ky_nang` | Ngôi sao / mũi tên lên |
| `khoi_dau` | Đứa trẻ trong nôi | `kho` | Kho thóc trống |
| `hoi` | Cờ hội / đu tiên | `giac_mo` | Mây mộng, rắn vàng |
| `dieu` | Con diều | `chuot` | Chuột đồng |
| `cay_lua` | Cây lúa (Focus Làm lụng) | `bac` | Cái bát xóc đĩa |
| `su_kien` | Biểu tượng chung cho sự kiện | `ky_uc` | Biểu tượng chung cho ký ức |

**Mặc định:** `dong` (dòng nhật ký không có icon riêng), `focus` (Focus không có icon riêng).

**Thanh thời gian (tùy chọn):** hiện đang dùng icon thư viện. Nếu muốn đồng bộ pixel thì vẽ: `play`, `pause`, `qua_thang`, `luu`, `ve_menu` (16×16).

**Khung giao diện (tùy chọn, đẹp hơn):** `common/ui/` gồm viền khung panel dạng 9-slice (giấy dó hoặc gỗ sơn son), nút bấm (thường, rê chuột, đang chọn, bị khóa), thanh chỉ số sức khỏe và tinh thần.

---

## P1 — Font · `fonts/`

| Cần | Yêu cầu |
| :--- | :--- |
| Font pixel cho tiêu đề, số liệu | **Hỗ trợ đầy đủ dấu tiếng Việt** (ă â ê ô ơ ư đ và 5 thanh). Kiểm tra kỹ chữ hoa có dấu: Ằ Ẫ Ỗ Ữ |
| Font đọc dài (nhật ký, sự kiện) | Dễ đọc ở cỡ 13–14 px, có tiếng Việt. Có thể dùng font không pixel nếu cần |

Ghi rõ **giấy phép** (OFL, CC0...) cho mọi font và asset tải về.

---

## P2 — Giai đoạn 1 (chưa cần ngay)

### Micro-cutscene 3–8 giây · `civilizations/nho_giao/` (GDD 08 §4)

| id | Hoạt cảnh |
| :--- | :--- |
| `cs_thu_hoach` | Gặt lúa, gánh thóc về sân phơi |
| `cs_lu_lut` | Mưa lớn, nước tràn, dân dọn đồ lên cao |
| `cs_mat_mua` | Ruộng khô, kho trống |
| `cs_cuoi` | Rước dâu, trầu cau, pháo |
| `cs_tang` | Đám tang theo phong tục |
| `cs_sinh_con` | Gia đình đón đứa trẻ |
| `cs_vinh_quy` | Vinh quy bái tổ: tân khoa cưỡi ngựa, cờ lọng, dân làng đón |

### Mở rộng bộ nhân vật và cảnh

- Trang phục theo **tầng lớp**: nông dân, thương nhân, lính, thảo khấu, quý tộc nhỏ, quan lại.
- NPC làng: **bá hộ, lý trưởng, thầy đồ, thầy lang, lái buôn, hàng xóm**. Đã có trong dữ liệu, sau này có thể xuất hiện trên cảnh.
- **Nhà bậc cao**: nhà ngói nhiều gian, nhà thờ họ, phủ đệ.
- **Cảnh mới**: thị trấn (chợ, phố), phủ/lâu đài, hang ổ thảo khấu trong rừng, trại lính.
- **Biểu tượng tài sản** cho bảng Chợ & Tài sản: `ruong`, `trau`, `dan_ga`, `ao_ca`, `kho_lua`, `nha_tranh`, `nha_go` (32×32).

### Âm thanh · `audio/` (không phải art, ghi để tiện tìm cùng lúc)

| Thư mục | Cần |
| :--- | :--- |
| `music/` | Nhạc nền làng quê (sáo trúc, đàn bầu, đàn nguyệt): yên bình · căng thẳng · tang tóc |
| `ambient/` | Gà gáy, mưa, ếch nhái đêm hè, gió bấc, chợ phiên |
| `sfx/` | Bấm nút, mở thẻ sự kiện, thu hoạch, tiếng tiền xu, chuông tang |

---

## Ghi chú cho người làm code khi có hình

1. Thêm file vào `src/game/asset-manifest.ts` (hiện chỉ tải `scene-art.json`).
2. Trong `src/game/scene-layers/layers.ts`, đổi từng hàm vẽ khối sang vẽ sprite, **giữ nguyên id**. Dữ liệu và luật chơi không đổi.
3. Kích thước và vị trí đặt sprite chỉnh trong `public/assets/common/placeholder/scene-art.json` (mục `layout`), không viết số vào code.
