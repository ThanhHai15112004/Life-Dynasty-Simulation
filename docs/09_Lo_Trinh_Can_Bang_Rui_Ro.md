# 09_Lo_Trinh_Can_Bang_Rui_Ro.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 09 · Lộ trình, Cân bằng & Rủi ro
Làm theo thứ tự nào, đo bằng gì, và cần chốt những gì

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Giai đoạn phát triển, KPI cân bằng, rủi ro, quyết định cần chốt, đạo đức thiết kế |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Nguyên tắc lộ trình
2. Các giai đoạn
2.1 Phạm vi nội dung theo giai đoạn
3. KPI cân bằng (đo bằng mô phỏng headless)
4. Rủi ro và giải pháp
5. Quyết định cần chốt
6. Đạo đức thiết kế
7. Bước tiếp theo đề xuất

## 1. Nguyên tắc lộ trình
Thách thức lớn nhất không nằm ở ý tưởng mà ở thứ tự làm. Hãy chứng minh một đời người đã đủ vui trước khi xây vương quốc.
Mỗi giai đoạn phải có bản chơi được và câu hỏi kiểm chứng rõ ràng.

## 2. Các giai đoạn

| Giai đoạn | Tên | Phạm vi | Câu hỏi kiểm chứng |
| --- | --- | --- | --- |
| 0 | Prototype vòng lặp | Một xuất thân (nông dân), một cảnh, ~15 sự kiện, tick năm, Focus, mức sống | Vòng lặp một năm có vui không? |
| 1 | Core Life Simulator | Trung cổ giả tưởng (cảm hứng một vùng lịch sử); 3 xuất thân; 4 nghề (Nông dân, Thương nhân, Lính→Tướng, Thảo khấu); chỉ số, kỹ năng, tính cách–stress, Focus; kinh tế hộ, tài sản, mức sống; gia đình cơ bản; tuổi già, tử vong; Thời cơ cơ bản; 30–50 sự kiện; scene ghép lớp cơ bản | Một đời người có hấp dẫn chỉ với quyết định và hậu quả không? |
| 2 | Dynasty Simulator | Con cái, gia phả, thừa kế, thế hệ tiếp; ký ức xuyên đời; hôn nhân chính trị; danh tiếng, gia nghiệp; 5–8 gia tộc; Character AI T1; thang địa vị | Người chơi có muốn tiếp tục khi nhân vật đầu chết? |
| 3 | Kingdom Simulator | Bản đồ, lãnh địa, Tổ chức đầy đủ, chính trị, bổ nhiệm, quân đội, ngoại giao, chiến tranh, luật, nổi dậy, triều đình, kế vị, hậu cung; thêm nghề Nam tước, Vua, Cướp biển, Sĩ tử | Có thể đi từ dân thường đến nắm quyền — hoặc lật đổ người nắm quyền? |
| 4 | Living World | Nhiều vùng, quốc gia AI, LOD đầy đủ, thiên tai, dịch, nhiều khuôn văn minh (Nho giáo cấp A, Phong kiến Kitô giáo cấp A), Historical World cho một khu vực | Thế giới có đáng khám phá khi không làm vua? |
| 5 | Legacy of Ages | Gói thời đại: Nguyên thủy, Cổ đại, Trung cổ, Cận đại, Công nghiệp, Hiện đại; Era System; mốc lịch sử; mở rộng vùng | Chiến dịch nhiều thế kỷ có giữ được hứng thú? |


### 2.1 Phạm vi nội dung theo giai đoạn

| Hạng mục | GĐ1 | GĐ2 | GĐ3 | GĐ4 | GĐ5 |
| --- | --- | --- | --- | --- | --- |
| Nghề chơi được | 4 | 6 | 10 | 15+ | Theo thời đại |
| Mẫu sự kiện | 30–50 | 100+ | 250+ | 500+ | Theo gói |
| Khuôn văn minh | 1 (giả tưởng) | 1 | 1–2 | 2 cấp A + vài cấp B | Mở rộng |
| Vùng bản đồ | Một làng–thị trấn | Một khu vực nhỏ | Một vương quốc | Nhiều vùng | Thế giới |


## 3. KPI cân bằng (đo bằng mô phỏng headless)

| Chỉ số | Câu hỏi | Mục tiêu tham khảo |
| --- | --- | --- |
| Tuổi thọ trung bình (người chơi) | Đời đủ dài để trải nghiệm? | 50–65 tuổi |
| Tử vong trẻ em | Thực tế mà không bực bội? | Thấp hơn lịch sử thật (~15–25%) |
| Thời gian chơi một đời | Nhịp ổn? | 20–40 phút |
| Quyết định mỗi năm | Có quá tải? | 1–2 trung bình |
| Thăng tầng xã hội qua 3–4 đời | Có đáng cố gắng? | 30–50% (người chơi giỏi) |
| Tuyệt tự qua 100 năm | Quá khắc nghiệt? | < 10% với người chơi cẩn thận |
| Chết hoàn toàn bất ngờ (không dấu hiệu, không do lựa chọn) | Có cảm giác bất công? | Hiếm ở chế độ mặc định |
| Phân bố kết cục | Có chiến lược áp đảo? | Nhiều kết cục khác nhau |
| Phân bố nghề tối ưu | Có lối mòn? | Không nghề nào thắng áp đảo ở mọi hoàn cảnh |
| Sự kiện lặp lại mỗi đời | Có nhàm? | Hầu như không lặp |
| Việc dang dở cùng lúc | Có “thêm một năm nữa”? | Thường xuyên 2–3 |

Bot kiểm thử chạy nhiều chiến lược: an phận, liều lĩnh, tham vọng, ngẫu nhiên, “tối ưu” (để phát hiện lối mòn).

## 4. Rủi ro và giải pháp

| # | Rủi ro | Giải pháp |
| --- | --- | --- |
| 1 | Phạm vi quá lớn | Giai đoạn 0; mỗi giai đoạn có câu hỏi kiểm chứng; nghề và vùng theo cấp độ sâu |
| 2 | Real-time không hợp mobile | Mô hình lai: bấm qua năm trên mobile, tự trôi trên PC, chung engine tick tháng |
| 3 | Sự kiện lặp nhanh | Mẫu có tham số, sự kiện sinh từ hệ thống, chuỗi, cooldown, giao thoa nghề |
| 4 | Hiệu năng web/mobile | LOD NPC và bản đồ, sinh lười, chia gói dữ liệu, lưu delta |
| 5 | Chi phí pixel art bùng nổ | Ghép lớp, bộ nền theo khuôn + biến thể màu, giới hạn chặt GĐ1 |
| 6 | Quá ngẫu nhiên → bất lực | Công thức 4 yếu tố, báo trước, bad-luck protection, chết bất ngờ hiếm, chế độ số phận |
| 7 | Quá sâu → quá tải | Giao diện mở dần, ủy quyền mọi tầng, “để tự nhiên” |
| 8 | Sandbox mất phương hướng | Tham vọng làm la bàn mềm, NPC chủ động đưa cơ hội, sự kiện khởi đầu gợi ý |
| 9 | Đa dạng nhưng nông | GĐ1 chỉ 4 nghề thật sâu; nghề mới ra mắt Nhẹ rồi nâng dần |
| 10 | Người chơi không hiểu vì sao thua | Chronicle giải thích nhân quả, modifier hiển thị nguồn |
| 11 | Lối mòn / chiến lược áp đảo | Đường tối ưu theo nhân vật và thời thế, lực phản kháng, lợi ích giảm dần |
| 12 | Snowball khi quá mạnh | Chi phí quyền lực tăng theo quy mô, phe phái, Thiên mệnh / chính danh |
| 13 | Dữ liệu lịch sử, bản quyền | Tự xây bản đồ; dùng nguồn CC0; không copy game khác; luật sư trước phát hành |
| 14 | Nhạy cảm chính trị, văn hóa | Kiểm soát thực tế thay vì chủ quyền; thời kỳ xa trước; tư vấn người am hiểu |
| 15 | Hậu cung và xếp hạng độ tuổi | Tập trung chính trị và kế vị |


## 5. Các Quyết định Thiết kế Đã Chốt

| # | Hạng mục | Quyết định đã chốt |
| --- | --- | --- |
| 1 | Nhịp chơi | **Chạy thời gian thực (Real-time tick) và có Pause / Auto-pause** (hỗ trợ chỉnh tốc độ `1×, 2×, 4×, 8×, 12×`; tự động dừng khi có sự kiện cần quyết định hoặc mốc lớn) |
| 2 | Đơn vị điều khiển | **Ý chí gia tộc, hiện thân qua một nhân vật** tại một thời điểm |
| 3 | Minh bạch số liệu | **Lai**: Mặc định hiển thị bằng lời, có tùy chọn xem chi tiết con số và modifier nguồn |
| 4 | Mức hiện thực (tử vong trẻ em, dịch, bất công giai cấp) | **Mặc định “Đời thực”**, có chế độ chọn (Đời bình lặng / Đời thực / Số phận khắc nghiệt / Tùy chỉnh) |
| 5 | Phạm vi bản đồ GĐ1 | **Một làng + một thị trấn + một lâu đài/phủ** |
| 6 | Nền tảng chính | **Web / PC** |
| 7 | Generated World hay Historical World trước | **Lai**: Thế giới giả tưởng lấy cảm hứng rõ từ một vùng lịch sử |
| 8 | Khuôn văn minh cấp A đầu tiên | **Quan liêu Nho giáo (biến thể Đại Việt)** |
| 9 | Điều khiển người thừa kế có tính cách mạnh | **Điều khiển đầy đủ**, làm trái tính cách gây tăng Stress |
| 10 | Mô hình kinh doanh | **Chưa cần quan trọng** ở giai đoạn hiện tại |
| 11 | Bộ công nghệ (Engine & Tech Stack) | **TypeScript + Pure Sim Core (`@core`) + Phaser (`@game`) + React (`@ui`) + Vite + YAML/JSON + Zod + IndexedDB** |
| 12 | Người chơi mục tiêu, độ dài phiên | **Đưa vào file cấu hình (`data/balance/`)** để tùy chỉnh linh hoạt tốc độ trôi thời gian và độ dài một đời |


## 6. Đạo đức thiết kế
Gây nghiện bằng chiều sâu, không bằng thao túng: không phần thưởng đăng nhập, không đếm ngược FOMO, không gacha/loot box, không năng lượng theo giờ thực, không bán lợi thế.
Người chơi không thua chỉ vì một lần tung xúc xắc vô nghĩa.
Chủ đề lịch sử nặng được xử lý nghiêm túc, tôn trọng.
Ghi rõ độ tin cậy dữ liệu lịch sử; không trình bày lịch sử thay thế như sự thật.

## 7. Bước tiếp theo đề xuất
Chốt các câu hỏi 1, 6, 10, 11, 12 ở mục 5.
Viết đặc tả chi tiết Giai đoạn 0–1: danh sách chỉ số, công thức, cấu trúc dữ liệu sự kiện, 4 hợp đồng nghề đầu tiên.
Dựng prototype vòng lặp một năm (có thể là web đơn giản) để thử cảm giác chơi.
Dựng mô phỏng headless sớm để đo KPI ngay từ GĐ0.
Song song: nghiên cứu khuôn Quan liêu Nho giáo – biến thể Đại Việt với người am hiểu sử.