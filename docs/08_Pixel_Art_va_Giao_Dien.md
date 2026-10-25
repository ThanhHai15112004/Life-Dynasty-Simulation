# 08_Pixel_Art_va_Giao_Dien.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 08 · Pixel Art & Giao diện
Thế giới phản ánh cuộc sống, giao diện mở dần theo địa vị

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Scene ghép lớp, bộ asset theo khuôn, micro-cutscene, bản đồ pixel, màn hình và UX |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Nguyên tắc hình ảnh
1.1 Cảnh thay đổi theo đời sống
2. Scene ghép lớp
3. Bộ asset theo khuôn văn minh
3.1 Kiểm soát khối lượng
4. Micro-cutscene
5. Bản đồ pixel
6. Giao diện
6.1 Màn hình chính
6.2 Màn hình bổ sung
6.3 Giao diện mở dần (progressive disclosure)
6.4 Minh bạch số liệu
6.5 Onboarding
7. Âm thanh (định hướng)

## 1. Nguyên tắc hình ảnh
Hình ảnh phản ánh những gì đang diễn ra, không chỉ đổi con số.
Pixel Art 2D độ chi tiết vừa phải, dễ đọc ở kích thước nhỏ (mobile).
Animation đơn giản nhưng có sức sống; ưu tiên thời tiết, ánh sáng, người và vật chuyển động.
Mỗi thời đại và khuôn văn minh có kiến trúc, trang phục, bảng màu riêng.
Không dựng video riêng cho mọi lựa chọn.

### 1.1 Cảnh thay đổi theo đời sống

| Hoàn cảnh | Cảnh |
| --- | --- |
| Nông dân nghèo | Túp lều cũ, ruộng nhỏ, ít nông cụ |
| Làm ăn khá giả | Nhà gỗ lớn hơn, gia súc, kho lúa, hàng rào |
| Thành thương nhân | Chuyển lên thị trấn, nhà phố, cửa hàng |
| Được phong tước | Dinh thự hoặc lâu đài |
| Lên ngôi | Triều đình, ngai vàng, cận vệ, cung điện |
| Thảo khấu | Hang ổ trong rừng, lửa trại, đồ cướp được |
| Cướp biển | Boong tàu, đảo hoang, cảng chợ đen |
| Chiến tranh tàn phá | Cảnh xuống cấp, nhà cháy, ruộng bỏ hoang |


## 2. Scene ghép lớp
Không vẽ một ảnh cho mọi tình huống. Mỗi cảnh ghép từ các lớp:

| Lớp | Nội dung | Nguồn dữ liệu (Scene Descriptor) |
| --- | --- | --- |
| 1. Địa hình, địa điểm | Đồng lúa, đồng lúa mì, sa mạc, rừng, thảo nguyên, ven biển | Lớp địa lý của tỉnh, loại khu định cư |
| 2. Công trình | Nhà, xưởng, cửa hàng, lâu đài theo cấp | Tài sản chính của hộ, khuôn văn minh |
| 3. Thời tiết, mùa, giờ | Mưa, tuyết, nắng; xuân hạ thu đông; ngày đêm | Thời gian mô phỏng, khí hậu |
| 4. Nhân vật, trang phục | Người chơi, gia đình, người hầu, khách | Hộ gia đình, tầng lớp, văn hóa |
| 5. Đồ vật, tài sản | Trâu, kho lúa, xe hàng, thuyền, cờ | Danh sách tài sản |
| 6. Tình trạng | Thịnh vượng, nghèo đói, ngập lụt, đang cháy, bị chiếm đóng | Trạng thái kinh tế, thiên tai, chiến tranh |
| 7. Hiệu ứng | Khói bếp, lá rơi, nước chảy, ánh lửa | Mùa, giờ, tình trạng |

Cùng một ngôi làng có thể hiển thị thịnh vượng, nghèo đói, ngập lụt, đang cháy hoặc bị quân chiếm đóng chỉ bằng thay lớp.

## 3. Bộ asset theo khuôn văn minh
Mỗi khuôn văn minh có một bộ nền: nhà cửa, trang phục, đồ vật, công trình.
Văn hóa trong khuôn chỉ đổi màu và vài chi tiết (mái nhà, hoa văn, mũ, cờ).
Địa hình và khí hậu quyết định nền cảnh.
10–15 bộ nền × biến thể màu đủ phủ gần cả thế giới ở mức chấp nhận được; vùng cấp A vẽ thêm chi tiết riêng.

| Khuôn | Bảng màu gợi ý | Công trình đặc trưng |
| --- | --- | --- |
| Quan liêu Nho giáo | Nâu đất, xanh lúa, vàng rơm, đỏ son, đen mực | Nhà gỗ ba gian, đình, chùa, văn miếu, hoàng thành |
| Phong kiến Kitô giáo | Đá xám, xanh rêu, đỏ huy hiệu | Lâu đài đá, nhà thờ, tu viện, cối xay |
| Vương triều Hồi giáo | Cát, lam ngọc, trắng vôi | Thánh đường, chợ có mái vòm, dinh thự sân trong |
| Thảo nguyên du mục | Xanh cỏ, nâu da, trắng nỉ | Lều nỉ, đàn ngựa, trại di chuyển |


### 3.1 Kiểm soát khối lượng
Số asset = thời đại × văn hóa × địa vị × trạng thái × mùa → bùng nổ nếu vẽ riêng. Ghép lớp giải quyết một phần; Giai đoạn 1 giới hạn chặt: một khuôn, một thời đại, khoảng 5 cấp nhà, 4 mùa, 4 tình trạng.

## 4. Micro-cutscene
Hoạt cảnh 3–8 giây cho sự kiện đáng nhớ, luôn phản ánh đúng kết quả mô phỏng. Công thành thất bại thì không phát cảnh chiến thắng.

| Sự kiện | Hoạt cảnh |
| --- | --- |
| Thu hoạch | Gặt lúa, xe chở lương thực |
| Lũ lụt | Mưa lớn, nước ngập, dân sơ tán |
| Mất mùa | Ruộng khô, kho trống |
| Sinh con | Gia đình đón đứa trẻ |
| Kết hôn | Hôn lễ theo phong tục thời đại |
| Đỗ đạt (Nho giáo) | Vinh quy bái tổ: tân khoa cưỡi ngựa, cờ lọng, dân làng đón |
| Phong tước (phong kiến) | Người cai trị trao biểu tượng quyền lực |
| Công thành | Quân tiến, giao tranh, cờ đổi chủ (hoặc không) |
| Chiến thắng | Quân trở về, dân chào đón |
| Khởi nghĩa | Đuốc, nông cụ, kho lương bị phá |
| Lên ngôi | Bước lên ngai, nghi lễ |
| Qua đời | Tang lễ, chuyển sang người thừa kế |
| Cách mạng (hiện đại) | Biểu tình, thay đổi chính quyền |

Mỗi loại cutscene tái sử dụng với nhân vật, cờ, trang phục, công trình, bối cảnh khác nhau (tham số hóa như sự kiện).

## 5. Bản đồ pixel
Bản đồ cách điệu: tỉnh là mảng pixel hình dạng gần đúng, không chính xác kiểu GIS.
Biên giới mờ thời tiền hiện đại, rõ dần ở thời hiện đại (bản thân điều này kể chuyện lịch sử).
Mức phóng: xa thấy quốc gia; gần thấy tỉnh, đô thị, đường sá, ruộng đồng.
Bản đồ theo góc nhìn nhân vật: nông dân chỉ thấy rõ vùng mình sống; phần xa là sương mù hoặc tên mơ hồ. Vừa là cơ chế thông tin, vừa tiết kiệm nội dung.
Tên địa danh luôn đúng năm hiện tại, tùy chọn chú thích tên hiện đại.

## 6. Giao diện
Giao diện đơn giản như 1in8b nhưng giàu thông tin khi cần.

### 6.1 Màn hình chính
┌────────────────────────────────────────────────┐
│  [Thanh thời gian: niên hiệu · năm CN · ▶ ⏸ ×] │
├────────────────────────────────────────────────┤
│                                                │
│            CẢNH PIXEL HIỆN TẠI                 │
│      (nhà, công việc, nơi sinh sống)           │
│                                                │
├───────────────────────┬────────────────────────┤
│ Hồ sơ: tên, tuổi,     │ Trọng tâm hiện tại     │
│ địa vị, sức khỏe,     │ Việc dang dở (2–3)     │
│ tâm trạng, tài chính  │ Tin đồn mới            │
├───────────────────────┴────────────────────────┤
│ [Học] [Làm việc] [Đầu tư] [Giao lưu] [Nghề...] │
├────────────────────────────────────────────────┤
│ SỰ KIỆN: mô tả · phương án · khoảng xác suất   │
└────────────────────────────────────────────────┘

| Thành phần | Nội dung |
| --- | --- |
| Cảnh pixel | Ngôi nhà, công việc hoặc nơi đang sống |
| Hồ sơ nhân vật | Tên (theo cách người khác gọi), tuổi, địa vị, sức khỏe, tâm trạng |
| Thanh thời gian | Lịch bản địa + năm CN, tốc độ, tạm dừng |
| Trọng tâm | Focus chính và phụ |
| Hành động | Theo nghề và địa vị |
| Sự kiện | Bối cảnh, phương án, hậu quả có thể biết trước, khoảng xác suất |


### 6.2 Màn hình bổ sung
Nhân vật · Gia đình và gia phả · Tài sản và đầu tư · Nghề nghiệp · Quan hệ · Tổ chức / Lãnh địa · Bản đồ · Biên niên sử.

### 6.3 Giao diện mở dần (progressive disclosure)
Chức năng nâng cao chỉ xuất hiện khi phù hợp với địa vị, nghề, thể chế, thời đại.
Nông dân không thấy hàng chục tab điều hành đế chế.
Mỗi nghề “Sâu” mở UI riêng (ví dụ bảng hạm đội cho cướp biển, bảng phẩm hàm và phe cánh cho quan văn).

### 6.4 Minh bạch số liệu
Cần chốt. Đề xuất lai: mặc định mô tả bằng lời (“Sức khỏe: Khá, đang ho”), có tùy chọn xem chi tiết dạng số và danh sách modifier giải thích nguyên nhân (Tài liệu 02).

### 6.5 Onboarding
Ván đầu gợi ý xuất thân và tham vọng.
Hệ thống mở dần theo giai đoạn đời: tuổi thơ học Focus; thanh niên học nghề và quan hệ; lập nghiệp học đầu tư và gia đình.
Tooltip giải thích “vì sao” ở mọi con số.

## 7. Âm thanh (định hướng)
Nhạc nền theo khuôn văn minh và thời đại; biến tấu theo tâm trạng (yên bình, căng thẳng, tang tóc).
Âm thanh môi trường theo lớp scene: mưa, gà gáy, chợ, sóng biển, tiếng binh khí.
Âm báo riêng cho sự kiện quan trọng để người chơi đang tua nhanh nhận biết.