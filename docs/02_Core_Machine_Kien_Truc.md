# 02_Core_Machine_Kien_Truc.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 02 · Core Machine & Kiến trúc
Lõi mô phỏng, mô hình dữ liệu và phân lớp module

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Kiến trúc kỹ thuật ở mức thiết kế, chưa chọn engine cụ thể |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Nguyên tắc kiến trúc
2. Mô hình dữ liệu cốt lõi
2.1 Thuộc tính chính của Character
3. Hệ thống thời gian
4. Các module nền tảng then chốt
4.1 Modifier System
4.2 Rule / Condition Evaluator
4.3 Seeded RNG
4.4 Scene Descriptor
4.5 Chronicle Engine
5. Mô phỏng NPC theo tầng (LOD)
6. Phân lớp module
6.1 Bảng module theo giai đoạn
7. Lưu trữ, seed và hiệu năng
8. Kiểm thử headless và cân bằng
9. Công cụ nội bộ cần có
10. Quyết định kỹ thuật cần chốt

## 1. Nguyên tắc kiến trúc
Lõi mô phỏng tách biệt giao diện. Mô phỏng chạy được headless (không cần màn hình) để kiểm thử và cân bằng.
Data-driven. Nghề, văn hóa, sự kiện, luật lệ là dữ liệu (JSON/YAML), không phải code. Người viết nội dung không cần lập trình viên.
Lắp ghép thay vì kế thừa. Hệ thống nghề và khuôn văn minh dựng từ thành phần tái sử dụng (Tài liệu 04, 07).
Tất định (deterministic). Mọi ngẫu nhiên đi qua RNG có seed; cùng seed + cùng lựa chọn → cùng kết quả.
Mức chi tiết theo khoảng cách (LOD). Chỉ mô phỏng đầy đủ những gì gần người chơi.
Sinh khi cần (lazy generation). Không sinh trước cả thế giới; lưu thay đổi so với bản sinh gốc.
Không dùng LLM cho từng NPC. AI dựa trên luật, mục tiêu và đánh giá lợi ích (Utility AI).

## 2. Mô hình dữ liệu cốt lõi
World
├── Region / Province    địa hình, khí hậu, tài nguyên, dân số, thịnh vượng
├── Settlement           kinh thành, lỵ sở, cảng, làng nghề, làng nông, bản...
├── Polity               nhà nước / lãnh địa: chủ, luật, thuế, quân, cấp trên
├── Organization         tổ chức: băng cướp, thương hội, quân đội, triều đình, làng
├── Dynasty / Clan       dòng họ: danh tiếng, gia nghiệp, thành viên, kẻ thù
├── Household            hộ gia đình: nhà, ngân sách, mức sống, người sống chung
├── Character            con người: chỉ số, kỹ năng, tính cách, ký ức, quan hệ, nghề
└── Asset                tài sản: nhà, ruộng, cửa hàng, thuyền, tước vị...
Household là đơn vị kinh tế, không phải Character. Tiền, nhà, ruộng thuộc về hộ. Cách này giải quyết tự nhiên việc thừa kế, góa bụa, con ra ở riêng.

### 2.1 Thuộc tính chính của Character

| Nhóm | Nội dung |
| --- | --- |
| Định danh | Họ, tên (tên tục, tên chữ, pháp danh, tước hiệu theo đời), giới tính, ngày sinh, quê quán, nơi ở, văn hóa, tôn giáo |
| Trạng thái | Sức khỏe tổng + danh sách bệnh, stress, tâm trạng, mãn nguyện |
| Năng lực | Kỹ năng + XP, cây chuyên môn |
| Bản ngã | Tính cách, giá trị sống, tham vọng |
| Xã hội | Thân phận, vai trò (nghề + bậc), lối sống, dự nghiệp, danh tiếng theo nhóm |
| Quan hệ | Danh sách quan hệ (loại + opinion modifier), ân tình, nắm thóp |
| Tri thức | Những gì nhân vật biết (bí mật, tin đồn, độ tin cậy) |
| Ký ức | Memory có điểm quan trọng và thời hạn |
| Mô phỏng | Tầng LOD (T0–T3), seed cá nhân |


## 3. Hệ thống thời gian

| Thành phần | Thiết kế |
| --- | --- |
| Tick | Tháng. Mỗi tick: cập nhật sức khỏe, kinh tế hộ, XP, quan hệ, AI T0–T1, rủi ro tử vong |
| Tick năm | AI T2, dân số thống kê T3, cập nhật thế giới, tổng kết năm |
| Hàng đợi sự kiện | Event Director chọn sự kiện theo tick; sự kiện cần quyết định → auto-pause |
| Lịch | Hiển thị theo lịch văn hóa (niên hiệu, can chi, Hijri...) kèm năm Công nguyên |
| Tăng tốc dài hạn | Chế độ Legacy of Ages: tóm lược thập kỷ, chỉ dừng ở biến cố lớn |


## 4. Các module nền tảng then chốt

### 4.1 Modifier System
Mọi thứ (tính cách, tài sản, chính sách, mùa, bệnh, thể chế) đều phát ra modifier. Một hệ thống modifier thống nhất giúp các hệ thống liên kết tự nhiên và giải thích được:
Sức khỏe năm nay: -6
-4  Mức sống Đạm bạc
-3  Mùa đông khắc nghiệt
+2  Tính cách Khỏe mạnh
-1  Tuổi 52
Modifier có: nguồn, mục tiêu, giá trị, kiểu cộng/nhân, thời hạn, độ suy giảm theo thời gian.

### 4.2 Rule / Condition Evaluator
Ngôn ngữ điều kiện dùng chung cho sự kiện, AI, cổng địa vị, luật thừa kế, chuyển nghề. Ví dụ:
condition:
all:
- household.debt > 50
- creditor.alive
- world.season == "giáp_hạt"
- not: character.has_trait("Liều_lĩnh")

### 4.3 Seeded RNG
Seed thế giới → seed vùng → seed khu định cư → seed hộ → seed nhân vật.
Dùng để tái hiện bug, chạy kiểm thử, chia sẻ seed thế giới, và sinh lười nhất quán (vào lại làng vẫn gặp đúng người cũ).

### 4.4 Scene Descriptor
Lớp trung gian chuyển trạng thái game thành mô tả cảnh. Renderer chỉ đọc descriptor:
{ location: "làng_nông", culture_set: "dong_a_nho_giao", era: "trung_co",
house: "nha_go_3_gian", season: "dong", condition: "lut",
assets: ["trau", "kho_lua"], people: [...], wealth: "dam_bac" }
Nhờ vậy mô phỏng chạy headless được và cutscene luôn khớp kết quả (thua trận thì không phát cảnh chiến thắng).

### 4.5 Chronicle Engine
Mỗi sự kiện ghi lại có điểm quan trọng.
Điểm cao: giữ lâu, hiển thị trong biên niên sử gia tộc, thế giới.
Điểm thấp: gộp thành tóm tắt (“Thập niên 1080: ba mùa mất mùa, gia đình nghèo đi”).
Chronicle cũng giải thích nhân quả khi thất bại (“Cuộc nổi dậy thất bại vì: quân lãnh chúa vừa trở về, Lão Tư mật báo, làng bên không hưởng ứng”).

## 5. Mô phỏng NPC theo tầng (LOD)

| Tầng | Ai | Mức chi tiết | Số lượng gợi ý |
| --- | --- | --- | --- |
| T0 | Hộ của người chơi | Đầy đủ, tick tháng | 5–15 |
| T1 | Người có quan hệ trực tiếp, gia tộc lớn, người nắm quyền | Đầy đủ, AI ra quyết định | 100–300 |
| T2 | Dân cư trong vùng | Nhân vật nhẹ: tuổi, nghề, gia đình; tick năm | 1.000–5.000 |
| T3 | Dân số vùng xa | Chỉ thống kê: dân số, thịnh vượng, bất ổn | Không giới hạn |

Thăng tầng khi trở nên liên quan (kết bạn với người T2 → lên T1), hạ tầng khi không còn liên quan.
Utility AI cho T1: định kỳ chấm điểm hành động khả thi theo mục tiêu × tính cách × nguồn lực, chọn tốt nhất kèm chút ngẫu nhiên.
Bản đồ cũng có LOD tương ứng (Tài liệu 06).

## 6. Phân lớp module
┌─────────────────────────────────────────────────────────┐
│ PRESENTATION    UI · Scene Renderer · Cutscene · Audio  │
│                 Input · Localization                    │
├─────────────────────────────────────────────────────────┤
│ BRIDGE          View Models · Scene Descriptor          │
│                 Notification Queue                      │
├─────────────────────────────────────────────────────────┤
│ CONTENT PACKS   Gói Nghề · Khuôn Văn minh · Văn hóa     │
│                 Kho Sự kiện · Dữ liệu Lịch sử (data)    │
├─────────────────────────────────────────────────────────┤
│ GAMEPLAY        Life · Skills · Traits · Focus          │
│ SYSTEMS         Economy · Assets · Social · Family      │
│                 Succession · Status · Career Components │
│                 Organization · Politics · Military      │
│                 Rebellion · Event Engine · Director     │
├─────────────────────────────────────────────────────────┤
│ WORLD SIM       Time · Character AI · LOD · Map         │
│                 Polity AI · Climate/Disaster · Chronicle│
│                 Population & Settlement Generator       │
├─────────────────────────────────────────────────────────┤
│ CORE            Data Store/ECS · Seeded RNG · Save/Load │
│                 Content Loader · Modifier · Rules       │
└─────────────────────────────────────────────────────────┘

### 6.1 Bảng module theo giai đoạn

| Module | GĐ1 | GĐ2 | GĐ3 | GĐ4 | GĐ5 |
| --- | --- | --- | --- | --- | --- |
| Core (RNG, Data, Save, Modifier, Rules) | Ra mắt |  |  |  |  |
| Time, Life, Skills, Traits, Focus | Ra mắt |  |  |  |  |
| Economy, Assets, Living Standard | Ra mắt |  |  |  |  |
| Career Components + 4 nghề đầu | Ra mắt | Mở rộng | Mở rộng | Mở rộng | Mở rộng |
| Organization | Cơ bản | Mở rộng | Đầy đủ |  |  |
| Social, Family | Cơ bản | Mở rộng |  |  |  |
| Event Engine + Director | Ra mắt | Mở rộng | Mở rộng | Mở rộng |  |
| Scene Renderer | Cơ bản | Mở rộng | Mở rộng | Mở rộng | Mở rộng |
| Succession, Dynasty, Memory xuyên đời |  | Ra mắt |  |  |  |
| Character AI (T1), Social Ladder |  | Ra mắt | Mở rộng |  |  |
| Map, Polity, Politics, Military, Diplomacy, Rebellion |  |  | Ra mắt | Mở rộng |  |
| LOD đầy đủ, Polity AI, Disaster, nhiều Khuôn văn minh |  |  |  | Ra mắt |  |
| Era System, Tech, Institution Change, Historical Data |  |  |  |  | Ra mắt |


## 7. Lưu trữ, seed và hiệu năng

| Kỹ thuật | Mô tả |
| --- | --- |
| Lưu delta | File lưu chỉ ghi những gì khác bản sinh gốc từ seed (ai chết, ai chuyển đi, ai mới sinh) |
| Tổng hợp lịch sử cũ | Sự kiện điểm thấp được nén thành tóm tắt; nhân vật xa đã chết lâu chỉ giữ hồ sơ rút gọn trong gia phả |
| Chia gói dữ liệu theo vùng | Chỉ tải gói vùng người chơi và vùng lân cận (quan trọng cho web/mobile) |
| Sinh lười | Khu định cư chỉ có vài con số cho đến khi người chơi cần chi tiết |
| Ước lượng dữ liệu | ~2.000 tỉnh × ~12 mốc lịch sử + thực thể chính trị + vua chúa ≈ vài chục MB |


## 8. Kiểm thử headless và cân bằng
Lõi mô phỏng phải chạy tự động hàng nghìn đời và hàng trăm năm không cần giao diện, với bot người chơi theo nhiều chiến lược (an phận, liều lĩnh, tham vọng, ngẫu nhiên). Đầu ra là báo cáo KPI (Tài liệu 09): tuổi thọ, tử vong trẻ em, tỷ lệ thăng tầng, tỷ lệ tuyệt tự, phân bố kết cục, tần suất lặp sự kiện, số quyết định mỗi năm.

## 9. Công cụ nội bộ cần có
Event Editor: viết sự kiện, điều kiện, vai trò, phương án, xem trước với nhân vật giả lập.
Career / Template Editor: điền “hợp đồng nghề” và khuôn văn minh.
Map & History Editor: vẽ lưới tỉnh, gán chủ sở hữu theo khoảng thời gian, nhập triều đại, kiểm tra lỗi (vùng không chủ, thời gian chồng lấn).
Simulation Inspector: xem modifier, quyết định AI, lý do Director chọn sự kiện.
Có thể mở các công cụ này cho cộng đồng mod về sau.

## 10. Quyết định kỹ thuật cần chốt
Engine và ngôn ngữ (ví dụ TypeScript cho web-first, Godot/Unity cho đa nền tảng).
Mô hình lưu trữ trong runtime (ECS hay object graph).
Định dạng dữ liệu nội dung và cách hot-reload khi viết sự kiện.
Ngân sách hiệu năng cho mobile: số NPC T1 tối đa, thời gian một tick năm.