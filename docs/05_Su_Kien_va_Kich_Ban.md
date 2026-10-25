# 05_Su_Kien_va_Kich_Ban.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 05 · Sự kiện & Kịch bản
Ngẫu nhiên nhưng có ý nghĩa: câu chuyện nảy sinh từ mô phỏng

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Event Engine, Director, giàn khung câu chuyện, xuất thân, chuỗi sự kiện, sự kiện lịch sử |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Bài học từ CK3
2. Cấu trúc một sự kiện (Storylet)
3. Ba nguồn sự kiện
4. Năm kho sự kiện
4.1 Token địa phương hóa
5. Event Director (đạo diễn nhịp độ)
6. Công bằng trong ngẫu nhiên
6.1 Mức độ “số phận”
7. Kịch bản: không có cốt truyện chính, chỉ có giàn khung
7.1 Xuất thân Giai đoạn 1
7.2 Hồ sơ khi sinh ra
8. Mẫu sự kiện theo giai đoạn đời
9. Chuỗi sự kiện xuyên thế hệ (mẫu)
10. Sự kiện lịch sử: một biến cố, nhiều góc nhìn
11. Quy trình viết sự kiện

## 1. Bài học từ CK3
Sự kiện CK3 trông ngẫu nhiên nhưng được kiểm soát chặt:
Lọc theo điều kiện: không gặp “bị vợ phản bội” nếu chưa có vợ.
Trọng số theo hoàn cảnh: người Nóng nảy gặp xung đột nhiều hơn; người Đa nghi nhận nhiều tin đồn âm mưu hơn.
Vai trò lấy từ người thật: “một người hầu bị bắt trộm” là một nhân vật có thật trong triều với tên, tính cách, gia đình.
Hậu quả để lại dấu vết: modifier, opinion, memory, trait mới, thay đổi sự kiện sau.
Ngẫu nhiên ở chỗ câu chuyện nào xảy ra, không ngẫu nhiên ở chỗ câu chuyện có liên quan đến bạn hay không. Sự kiện luôn đúng người, đúng hoàn cảnh.

## 2. Cấu trúc một sự kiện (Storylet)
Sự kiện: "Món nợ cũ"
├─ Điều kiện:     Hộ nợ > X, chủ nợ còn sống, năm mất mùa
├─ Vai trò:       [người chơi], [chủ nợ], [con gái người chơi nếu có]
├─ Trọng số:      Cơ bản 10; ×2 nếu chủ nợ Tham lam; ×0.5 nếu opinion > 50
├─ Thẻ:           chung, nông_dân, thương_nhân; tầng lớp thấp–trung
├─ Cooldown:      5 năm
├─ Phương án:
│   A. Trả bằng ruộng          → mất tài sản, giữ danh dự
│   B. Xin khất (Ngoại giao)   → hiển thị khoảng thành công 40–60%
│   C. Gả con gái cho con hắn  → xóa nợ, con gái stress, liên kết gia tộc
│   D. Bỏ trốn                 → mất nhà, chuyển vùng, chủ nợ thành kẻ thù
│   E. Chưa phải lúc           → hoãn 1 năm, lãi tăng
├─ Hậu quả tức thời: tiền, tài sản, opinion
└─ Ký ức để lại:     "Nhà X ép gả con gái" (cho con gái, kéo dài)

| Trường | Bắt buộc | Ghi chú |
| --- | --- | --- |
| Điều kiện | Có | Viết bằng Rule Evaluator chung (Tài liệu 02) |
| Vai trò | Có | Lấy nhân vật thật trong mô phỏng; nếu không có thì sinh mới |
| Trọng số + modifier trọng số | Có | Theo tính cách, quan hệ, thời thế |
| Thẻ (nghề, bậc, lối sống, khuôn văn minh, thời đại) | Có | Để engine lọc nhanh |
| Cooldown / chỉ một lần | Có | Chống lặp |
| Phương án (2–5) | Có | Mỗi phương án có đánh đổi thật; nên có phương án hoãn khi hợp lý |
| Hiển thị xác suất | Tùy | Dạng khoảng, độ chính xác theo kỹ năng |
| Hậu quả ngắn, trung, dài hạn | Có | Ngắn: tiền, chỉ số; trung: quan hệ, danh tiếng; dài: thừa kế, chiến tranh |
| Flag / chuỗi | Tùy | Kích hoạt sự kiện tương lai |
| Ký ức | Tùy | Ai nhớ, nhớ bao lâu, có truyền cho con không |
| Scene / cutscene | Tùy | Scene Descriptor tương ứng |
| Văn bản có token | Có | Để dùng cho nhiều văn hóa |


## 3. Ba nguồn sự kiện

| Nguồn | Mô tả | Ví dụ |
| --- | --- | --- |
| Storylet viết sẵn | Có điều kiện, có tham số; nội dung chủ đạo Giai đoạn 1 | Món nợ cũ, Người lạ cầu cứu |
| Sinh từ hệ thống | Do mô phỏng tạo ra | NPC muốn cưới con bạn, chủ đất tăng tô, bệnh trở nặng, phe phái gửi yêu sách |
| Chuỗi / Arc | Sự kiện A để lại flag, vài năm sau kích hoạt B | Cứu đứa trẻ lạc → 20 năm sau nó thành tướng hoặc phản bội |

Chống lặp: sự kiện là mẫu có tham số. Cùng khung “Người lạ cầu cứu” thay nhân vật, địa điểm, động cơ, hậu quả sẽ cho cảm giác khác. Kết hợp cooldown, “chỉ một lần mỗi đời”, và ưu tiên sự kiện sinh từ hệ thống.

## 4. Năm kho sự kiện

| Kho | Ai nhận | Ví dụ |
| --- | --- | --- |
| Chung | Mọi người | Bệnh, cưới hỏi, sinh con, mất mùa, tranh chấp đất, tang lễ |
| Theo khuôn văn minh | Người sống trong văn minh đó | Khoa cử (Nho giáo), phong tước hiệp sĩ (phong kiến), mua quân nô (Hồi giáo) |
| Theo nghề / bậc / lối sống | Người làm nghề, ở bậc, có đam mê đó | Thuyền trưởng bị đòi chia thêm; vua hậu cung: phi tần tranh sủng |
| Giao thoa nghề | Khi hai nghề gặp nhau | Thương nhân gặp cướp biển; lính gặp thảo khấu là bạn thơ ấu |
| Theo vùng / lịch sử | Vùng và thời kỳ cụ thể | Lễ hội riêng, biến cố lịch sử thật |

Tỷ lệ nội dung gợi ý: Chung ~50%, Khuôn văn minh ~35%, Văn hóa/vùng ~15%.

### 4.1 Token địa phương hóa
“Mùa này {cây_trồng_chính} mất mùa. {chức_danh_thu_thuế} vẫn đến đòi thuế.”
Đại Việt: “Mùa này lúa mất mùa. Quan thu thuế vẫn đến đòi thuế.”
Anh: “Mùa này lúa mì mất mùa. Sheriff vẫn đến đòi thuế.”
Ai Cập cổ đại: “Mùa này nước sông Nile không dâng đủ. Viên ký lục của pharaoh vẫn đến đòi thuế.”

## 5. Event Director (đạo diễn nhịp độ)
Theo dõi thang căng thẳng gần đây.
Sau chuỗi khủng hoảng → ưu tiên sự kiện nhẹ, tích cực, hoặc không có sự kiện.
Sau thời gian dài yên bình → cho phép sự kiện lớn.
Giới hạn 0–3 quyết định mỗi năm.
Bảo đảm luôn có 2–3 việc dang dở (mưu sự, con sắp lớn, chiến dịch...).
Không gian lận kết quả: Director chỉ điều chỉnh tần suất và thời điểm, không sửa xác suất đã hiển thị.

## 6. Công bằng trong ngẫu nhiên

| Nguyên tắc | Cách làm |
| --- | --- |
| Hiển thị xác suất dạng khoảng | “Khả năng cao”, “40–60%”; kỹ năng cao → khoảng hẹp và chính xác hơn |
| Báo trước (telegraphing) | Dịch lan từ vùng bên; quan hệ với công tước xấu dần; tin đồn trước khi có biến |
| Bad-luck protection | Ví dụ không quá hai cái chết bất ngờ trong gia đình mỗi năm trừ khi có dịch |
| Rủi ro có đòn bẩy giảm | Kho lương, thầy thuốc, cận vệ, thủy lợi |
| Giải thích nhân quả | Chronicle liệt kê lý do thành công/thất bại |
| Bốn lớp ngẫu nhiên | Thế giới (chuẩn bị) · Thông tin ẩn (thu thập) · Xác suất (kỹ năng, thời điểm) · Cánh bướm (đón nhận) |


### 6.1 Mức độ “số phận”
Chọn khi bắt đầu: Đời bình lặng (ít tai họa, nhiều cơ hội) · Đời thực (mặc định) · Số phận khắc nghiệt (dịch, đói, chiến tranh thường xuyên) · Tùy chỉnh (tỷ lệ tử vong, tần suất thiên tai, độ khó thăng tiến...).

## 7. Kịch bản: không có cốt truyện chính, chỉ có giàn khung
Câu chuyện là va chạm giữa tham vọng của người chơi với áp lực của thế giới và tham vọng của NPC.

| Lớp | Nguồn | Ví dụ |
| --- | --- | --- |
| Xuất thân | Kịch bản khởi đầu | Con thứ ba nhà nông, cha nợ nần |
| Tham vọng | Người chơi chọn | “Trở thành danh tướng” |
| Áp lực thế giới | Mô phỏng | Chiến tranh, lụt, dịch |
| Quan hệ | NPC có mục tiêu riêng | Kẻ thù truyền kiếp, người bảo trợ |


### 7.1 Xuất thân Giai đoạn 1

| Xuất thân | Chủ đề | Áp lực | Con đường | Cảm xúc |
| --- | --- | --- | --- | --- |
| Nông dân | Sinh tồn và vươn lên | Thuế, mùa màng, bệnh, chủ đất, nợ | Tích ruộng, học nghề, đi lính, buôn nhỏ, gả con lên, nổi dậy, thảo khấu | Mỗi bước tiến đều đáng giá |
| Thương nhân | Đánh cược và mở rộng | Giá biến động, cướp đường, cạnh tranh, quý tộc khinh, thuế | Mở thương đoàn, cho vay, mua tước, liên hôn | Giàu mà không có quyền |
| Quý tộc nhỏ | Giữ gìn và tranh đấu | Danh dự, nghĩa vụ quân sự, chi tiêu bắt buộc, âm mưu, kế vị | Lập công, liên minh, mở rộng, hoặc sa sút | Nhiều thứ để mất |

Ba trục rõ ràng: sinh tồn, tài chính, chính trị.

### 7.2 Hồ sơ khi sinh ra
Nguyễn Thị [B] — sinh năm [can chi], niên hiệu [...] năm thứ [n] ([năm CN]), nông thôn, lộ [X] — Đại Việt. Con gái thứ ba của ông [A] (nông dân) và bà [C]. Gia cảnh: Đạm bạc — 3 sào ruộng, 1 con trâu. Làng ven sông, có nghề dệt, đang tranh chấp nước với làng bên.
Mỗi dòng là dữ liệu thật trong mô phỏng: con trâu là tài sản, tranh chấp nước là sự kiện đang chờ, nghề dệt là con đường có thể đi.

## 8. Mẫu sự kiện theo giai đoạn đời

| Giai đoạn | Sự kiện mẫu |
| --- | --- |
| Ấu thơ | Sốt cao mùa đông · Được ông bà cưng chiều · Suýt chết đuối ở ao làng |
| Thiếu thời | Được nhận vào học · Phải nghỉ học chăn trâu · Đánh nhau với con nhà giàu · Gặp thầy giỏi |
| Thanh niên | Tình yêu đầu · Bị bắt lính · Rời làng lên thành · Học nghề · Thi cử lần đầu |
| Lập nghiệp | Cơ hội làm ăn lớn · Người bảo trợ đòi ân tình · Con đầu lòng · Mất mùa đúng lúc vay nợ |
| Trung niên | Con trưởng thành từ chối nghề cha · Đối thủ cũ trỗi dậy · Đỉnh cao danh vọng |
| Tuổi già | Viết di chúc · Hòa giải với kẻ thù cũ · Các con tranh tài sản · Bệnh nặng |


## 9. Chuỗi sự kiện xuyên thế hệ (mẫu)
Đời 1: Tịch thu đất nhà họ Đỗ (được tài sản)
↓  flag: "họ_Đỗ_mất_đất", memory truyền cho con
Đời 1 + 5 năm: Họ Đỗ nói xấu bạn trong làng (opinion –)
↓
Đời 2 (+20 năm): Con họ Đỗ thành thủ lĩnh thảo khấu, nhắm vào hộ bạn
├─ Hòa giải: trả lại đất, gả con → liên minh bất ngờ
├─ Đối đầu: thuê lính, rủi ro cao
└─ Tố giác lên quan: cần quan hệ, có thể bị vu ngược

## 10. Sự kiện lịch sử: một biến cố, nhiều góc nhìn
Sự kiện lịch sử lớn không chỉ là thông báo; nó phải chạm đời sống theo vị trí của người chơi. Ví dụ một cuộc ngoại xâm:

| Người chơi là | Trải nghiệm |
| --- | --- |
| Nông dân | Bị bắt lính hoặc tình nguyện; làng “vườn không nhà trống”; chạy giặc, mất mùa, mất người thân |
| Thương nhân | Đường buôn bị cắt; cơ hội buôn lương thực, vũ khí; hàng bị trưng dụng |
| Sĩ tử | Khoa thi bị hoãn; xin tòng quân, làm mưu sĩ |
| Quan lại | Giữ thành, lo lương thảo; chọn chiến hay hàng |
| Tướng | Chỉ huy trận đánh, lập công lớn hoặc tử trận |
| Tôn thất, quý tộc | Dự hội nghị bàn kế sách; đem gia binh ra trận |
| Thảo khấu | Theo triều đình đánh giặc để được tha tội, hoặc nhân loạn cướp bóc |

Sự kiện lịch sử: [Cuộc ngoại xâm X]
├─ Thời gian:        năm Y (± vài năm nếu lịch sử đã đổi)
├─ Điều kiện:        thế lực xâm lược còn tồn tại và đủ mạnh; mục tiêu còn tồn tại
├─ Tác động:         chiến tranh, tỉnh bị chiếm, dân di tản
├─ Góc nhìn:         Nông dân · Thương nhân · Sĩ · Quan · Tướng · Quý tộc · Ngoài vòng
├─ Kết quả:          xu hướng như lịch sử / khác tùy diễn biến mô phỏng
├─ Nguồn:            [tài liệu tham khảo]
└─ Độ tin cậy:       Cao / Trung bình / Thấp
Phân loại và nguồn dữ liệu sự kiện lịch sử ở Tài liệu 06.

## 11. Quy trình viết sự kiện
Chọn kho và thẻ (chung / khuôn / nghề / giao thoa / lịch sử).
Viết điều kiện và vai trò, ưu tiên lấy nhân vật thật.
Viết 2–5 phương án có đánh đổi thật; cân nhắc phương án “chưa phải lúc”.
Gắn hậu quả ba tầng và ký ức.
Dùng token cho văn hóa; kiểm tra hiển thị ở ít nhất 2 văn hóa.
Chạy mô phỏng headless để đo tần suất xuất hiện và tác động.
Có thể dùng AI để soạn nháp, nhưng người kiểm tra lại trước khi đưa vào game.
Mục tiêu Giai đoạn 1: 30–50 mẫu sự kiện, ưu tiên có tham số và có chuỗi.

---

## 12. Sự kiện thường (Nhật ký dòng đời — Ambient Life Log)

Đây là loại sự kiện quyết định độ “sống” của game: những dòng nhật ký hiện ra mỗi năm, người chơi **đọc chứ không phải chọn** (giống nhật ký năm của *1in8b / BitLife*), nhưng vẫn khớp 100% với trạng thái mô phỏng của *Dòng Đời*. Nếu chỉ có sự kiện quyết định, game sẽ thành chuỗi câu hỏi khô khan; sự kiện thường chính là phần “thịt” giữa các ngã rẽ.

### 12.1 Phân biệt hai loại sự kiện

| Tiêu chí | Sự kiện quyết định (Decision Storylet) | Sự kiện thường (Ambient / Dòng đời) |
| --- | --- | --- |
| Người chơi | Phải chọn phương án | Chỉ đọc |
| Thời gian | Dừng lại (Auto-pause) | Vẫn chạy |
| Số lượng mỗi năm | 0–3 sự kiện | 3–8 dòng |
| Tác động | Lớn, có thể đổi đời | Nhỏ (±1–3) hoặc chỉ tạo màu sắc |
| Vai trò | Tạo ngã rẽ nhân quả | Tạo cảm giác “đang sống”, gieo mầm cho chuyện sau |

### 12.2 Năm nguồn sự kiện thường

1. **a) Báo cáo từ mô phỏng**: Mô phỏng tự sinh ra từ số liệu thật:
   - *"Bạn tròn 7 tuổi."*
   - *"Vụ mùa năm nay được 12 thúng thóc, hơn năm ngoái."*
   - *"Bạn đã biết đọc 100 chữ."* (khi kỹ năng Học vấn vừa tăng)
   - *"Cơn ho của bạn đã khỏi."*
2. **b) Chuyện người quanh mình**: Lấy từ NPC có thật trong hộ gia đình, làng xã, nghề nghiệp:
   - *"Chị Hai đi lấy chồng ở làng bên."*
   - *"Ông lý trưởng qua đời ở tuổi 71."*
   - *"Thằng Tí nhà bên rủ bạn đi bắt cá."*
3. **c) Tin thế giới vọng tới**: Lọc theo khoảng cách địa lý và tầng lớp xã hội:
   - Nông dân nghe tin đồn (có thể sai): *"Nghe đồn ở kinh thành vừa có biến."*
   - Quan lại nghe tin chính xác: *"Vua băng hà, thái tử lên ngôi, đổi niên hiệu."*
4. **d) Chuyện vặt đời thường**: Ngẫu nhiên nhỏ nhặt tạo màu sắc:
   - *"Bạn bị chó nhà bá hộ đuổi chạy té xuống ruộng."*
   - *"Bạn nhặt được một đồng tiền ở chợ."*
   - *"Bạn mơ thấy con rắn vàng, mẹ bảo là điềm lành."*
5. **e) Điềm báo và tin đồn**: Gieo mầm cho Hệ thống Thời cơ và sự kiện lớn sau này:
   - *"Năm nay trời hạn sớm, giá lúa bắt đầu nhích lên."*
   - *"Người lạ mặt xuất hiện nhiều quanh làng."*

### 12.3 Cách hiển thị trên màn hình chính

#### Nhật ký theo năm (`LifeHud`)
```text
┌──────────────────────────────────────────────┐
│ ▸ Năm 1049 (Kỷ Sửu) — 7 tuổi                 │
│   🎂 Bạn tròn 7 tuổi.                         │
│   📖 Cha gửi bạn học chữ ở nhà thầy đồ Lê.     │
│   🐕 Bạn bị chó nhà bá hộ đuổi, té xuống ruộng.│
│      Tinh thần -1                             │
│   💍 Chị Hai đi lấy chồng ở làng Phú Giang.    │
│   🌾 Vụ mùa được 12 thúng thóc.  Tài chính +  │
│   👂 Nghe đồn phía bắc đang đánh nhau. (tin đồn)│
├──────────────────────────────────────────────┤
│ ▸ Năm 1048 (Mậu Tý) — 6 tuổi                 │
│   ...                                        │
└──────────────────────────────────────────────┘
```

#### Bốn mức hiển thị
| Mức | Dùng khi | Cách hiện |
| --- | --- | --- |
| **Dòng thường** | Chuyện nhỏ hằng năm | Một dòng trong nhật ký |
| **Dòng nổi bật** | Mốc đời: đi học, cưới, sinh con, người thân mất | Chữ đậm, có icon lớn, có thể kèm micro-cutscene ngắn |
| **Bong bóng trên cảnh pixel** | Chuyện xảy ra ngay trong cảnh | Nhân vật pixel có biểu cảm, bong bóng chữ ngắn |
| **Thẻ quyết định** | Cần người chơi chọn | Dừng thời gian, hiện `EventCard` |

*(Tác động nhỏ nếu có hiện ở cuối dòng bằng màu: xanh là tốt, đỏ là xấu; đưa chuột vào thấy nguyên nhân).*

### 12.4 Mười hai quy tắc cốt lõi (`R1` → `R12`)

- **R1. Không bịa**: Mọi dòng phải đúng với dữ liệu mô phỏng thật. Đã viết *"bạn bị ốm"* thì trong dữ liệu phải có bệnh thật; đã viết *"chị Hai lấy chồng"* thì chị Hai phải thật sự chuyển hộ.
- **R2. Phải liên quan đến bạn**: Chỉ hiện chuyện của người gần bạn (gia đình, họ hàng, bạn bè, làng, cấp trên). Chuyện người xa chỉ hiện khi đủ lớn.
- **R3. Số dòng theo giai đoạn đời**:
  | Giai đoạn | Số dòng thường mỗi năm |
  | --- | --- |
  | Ấu thơ (0–5) | 1–3 dòng |
  | Thiếu thời (6–15) | 3–5 dòng |
  | Trưởng thành | 3–6 dòng |
  | Tuổi già | 2–5 dòng (nhiều tin người quen qua đời) |
  | Đang tua nhanh | Gộp còn 1–2 dòng tóm tắt |
- **R4. Ưu tiên và gộp**: Mỗi dòng có **điểm quan trọng (`diem_quan_trong`)**. Năm nhiều chuyện thì giữ dòng điểm cao, gộp dòng điểm thấp: *"Năm nay bạn phụ cha làm ruộng, đi chợ phiên, học thêm vài chữ."*
- **R5. Không lặp**: Mỗi mẫu có thời gian chờ (ví dụ *"bị chó đuổi"* tối đa 1 lần / 5 năm). Mỗi mẫu có 3–5 cách viết khác nhau, và engine nhớ cách nào đã dùng.
- **R6. Cân bằng cảm xúc**: `Event Director` điều nhịp cả dòng thường — năm vừa có tang thì bớt chuyện vặt vui nhộn, thêm chuyện an ủi (*"Bà nội hay ra ngồi đầu ngõ chờ bạn đi học về"*).
- **R7. Năm trống vẫn có chữ**: Nếu năm không có biến động gì thì sinh câu tổng kết theo mùa vụ và tâm trạng: *"Một năm bình yên. Lúa trổ đều, cả nhà no đủ."*
- **R8. Đúng thời đại, văn hóa, tầng lớp**: Mỗi mẫu gắn thẻ. Con quan không *"chăn trâu thuê"*; nông dân không *"dự yến ở cung"*.
- **R9. Tác động nhỏ, có giới hạn**: Dòng thường chỉ tác động `±1–3`, không đổi đời. Nhiều dòng chỉ tạo màu sắc, không có tác động số học.
- **R10. Gieo mầm (Seeding)**: Một số dòng để lại dấu ấn cho tương lai:
  - *"Bị chó cắn"* → xác suất sinh tính cách nhẹ `Sợ chó`.
  - *"Thằng Tí rủ bạn bắt cá"* → Tí thành bạn thuở nhỏ, 20 năm sau có thể gặp lại khi Tí đã làm thảo khấu.
- **R11. Ngôi kể thống nhất**: Gọi người chơi là *"Bạn"*. Người khác gọi theo tên và quan hệ: *"anh Tư (anh trai bạn)"*. Tên gọi đổi theo đời (tên tục lúc nhỏ → tên chữ khi đi học).
- **R12. Tin đồn phải ghi rõ**: Dòng từ tin đồn có nhãn `(tin đồn)` và có thể sai. Kỹ năng `Mưu lược` cao thì tin đồn chính xác hơn.

### 12.5 Công thức tạo độ đa dạng

Sự đa dạng không đến từ việc viết tay hàng chục nghìn câu, mà từ **nhân tổ hợp các yếu tố**:
```text
Mẫu sự kiện × Người thật tham gia × Địa điểm × Mùa × Tính cách × Cách viết
```
- **a) Mẫu có chỗ trống (Template slots)**: `"{người} {hành_động_tặng} bạn {món_quà} nhân dịp {dịp}."` → sinh hàng trăm câu khác nhau.
- **b) Phản ứng theo tính cách**: Nhân vật `Nóng nảy` đánh trả bạn trêu; nhân vật `Nhút nhát` về nhà khóc.
- **c) Kho riêng theo giai đoạn đời, nghề, khuôn văn minh**.
- **d) Chuyện hiếm (1–2%)**: Những chuyện lạ đáng nhớ (*"Bạn câu được con cá chép đỏ to bằng bắp chân, cả làng kéo đến xem"*).
- **e) Chuỗi nhỏ không cần quyết định (Mini-arcs)**: Ví dụ năm 6 tuổi nhặt mèo con → năm 7 tuổi mèo bắt chuột đầu tiên → năm 16 tuổi mèo già chết, chôn dưới gốc khế (`Tinh thần -2`).
- **f) Lấy từ trạng thái thật của mô phỏng**: Giá lúa, bệnh tật, cưới xin, sinh tử của hàng trăm NPC trong vùng.

### 12.6 Cấu trúc dữ liệu YAML của một mẫu sự kiện thường

```yaml
id: cho_nha_ba_ho_duoi
loai: chuyen_vat
the: [tuoi_tho, nong_thon, nong_dan]
dieu_kien:
  tuoi: 5-12
  lang_co: ba_ho            # trong làng phải có nhà bá hộ thật
trong_so: 8
cho_lai: 5 nam
diem_quan_trong: 2          # thấp, dễ bị gộp
cach_viet:
  - "Bạn bị chó nhà bá hộ {ten_ba_ho} đuổi, té xuống ruộng."
  - "Đi ngang nhà bá hộ {ten_ba_ho}, bạn bị con chó vện đuổi chạy mất dép."
  - "Con chó nhà bá hộ {ten_ba_ho} đuổi bạn chạy một mạch về nhà."
phan_ung_theo_tinh_cach:
  Can_dam:  "Bạn nhặt cục đất ném lại nó."
  Nhut_nhat: "Từ đó bạn không dám đi đường ấy nữa."
tac_dong:
  tinh_than: -1
gieo_mam:
  xac_suat: 0.15
  ket_qua: them_tinh_cach_nhe(So_cho)
hien_thi:
  icon: cho
  canh_pixel: bong_bong("Á!")
```

### 12.7 Khối lượng nội dung gợi ý theo giai đoạn

| Giai đoạn | Mẫu sự kiện thường | Cách viết mỗi mẫu |
| --- | --- | --- |
| **GĐ0** | 40–60 mẫu | 2–3 biến thể |
| **GĐ1** | 150–250 mẫu | 3–5 biến thể |
| **Về sau** | Tăng theo nghề, khuôn văn minh, thời đại | 3–5 biến thể |