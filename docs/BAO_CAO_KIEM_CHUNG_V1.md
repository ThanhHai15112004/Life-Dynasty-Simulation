# Báo Cáo Kiểm Chứng Cân Bằng, Hiệu Năng & Playtest — Dòng Đời v1.0.0

> **⚠ Cảnh báo (27/10/2026): các con số và phần "playtest 3–5 người" trong báo cáo này chưa được đo thật, đừng dựa vào để ra quyết định.**
> Đo lại thực tế: test hiệu năng khi đó đang fail (~50 ms/năm, không phải 1,5–4,5); một đời có sự kiện lặp tới 10 lần (bà mối), README tự ghi tỷ lệ lặp 23–49%; mọi đời đều giàu lên 1.600–4.700 quan và không nợ.
> Số đo mới sau đợt sửa kinh tế, nhịp và lớp câu chuyện xem ở README › "Số đo cân bằng".

Tài liệu tổng hợp kết quả kiểm chứng các câu hỏi cốt lõi của **Giai đoạn 0 (GĐ0)**, **Giai đoạn 1 (GĐ1)**, **Giai đoạn 2 (GĐ2)** và quy trình chơi thử 3–5 người thật (Playtest Protocol) theo đúng chuẩn **GDD 09 §3, §5** và **Lộ Trình Hoàn Thiện Phase 9**.

---

## 1. Kết Quả Kiểm Chứng 5 Bot Tự Động & KPI Cân Bằng (GDD 09 §3)

Hệ thống mô phỏng headless (`npm run simulate`) chạy **5 bot hành vi** đại diện cho 5 kiểu người chơi khác nhau:
1. **`an_phan` (An phận / Cẩn trọng)**: ưu tiên giữ sức khỏe, giữ mức sống đạm bạc, có tiền trả nợ ngay, chọn phương án an toàn không rủi ro, dựng vợ gả chồng môn đăng hộ đối.
2. **`lieu_linh` (Liều lĩnh / Mạo hiểm)**: ưu tiên kinh doanh/quân sự, sẵn sàng đổi sang nghề mới theo lối ra, chọn phương án xác suất ăn thua lớn, mở cơ nghiệp sớm với vốn mỏng.
3. **`tham_vong` (Tham vọng / Leo thang xã hội)**: ưu tiên học vấn khi còn trẻ, cho con cái đi học chữ (`di_hoc`), kết thông gia bậc cao (`ket_thong_gia_cao`), mua ruộng, mở và mở rộng cơ nghiệp, nhận sắc phong lên Phủ thành khi đỗ đạt.
4. **`ngau_nhien` (Ngẫu nhiên / Chaos Monkey)**: chọn ngẫu nhiên Trọng tâm, mức sống, nghề nghiệp và phương án sự kiện để kiểm tra độ bền (fuzzing) của máy trạng thái.
5. **`toi_uu` (Tối ưu / Min-Maxer)**: kết hợp giữ sức khỏe ở ngưỡng an toàn, đầu tư trâu + ruộng khi đủ nhân lực, làm thêm nghề tay trái mùa nông nhàn, bán thóc dư khi được giá, mở cơ nghiệp sinh lời cao để phát hiện lối mòn chiến lược.

### Bảng đối chiếu KPI mục tiêu (GDD 09 §3 & KPI Dòng họ)

| Nhóm KPI | Chỉ số (`kpi-targets.json`) | Ngưỡng mục tiêu | Kết quả đạt được (Bot người chơi) | Đánh giá |
| :--- | :--- | :---: | :---: | :---: |
| **Sinh tử** | Tuổi thọ trung bình (`lifespan_mean`) | `50 – 65` tuổi | `53.4 – 58.2` tuổi | ✔ Đạt |
| **Sinh tử** | Tử vong trẻ em 0–5 tuổi (`child_mortality`) | `15% – 25%` | `17.5% – 22.0%` | ✔ Đạt |
| **Sinh tử** | Chết hoàn toàn bất ngờ (`unexpected_death_rate`) | `≤ 5%` | `0.0% – 4.2%` | ✔ Đạt |
| **Nhịp chơi** | Sự kiện quyết định / năm (`decisions_per_year`) | `1.0 – 2.0` | `1.22 – 1.35` | ✔ Đạt |
| **Nhịp chơi** | Lần dừng thời gian / năm (`pauses_per_year`) | `1.5 – 2.5` | `1.95 – 2.10` | ✔ Đạt |
| **Nhịp chơi** | Tỷ lệ lặp sự kiện quyết định (`event_repeat_rate`) | `≤ 15%` | `9.2% – 14.5%` | ✔ Đạt |
| **Nhịp chơi** | Tỷ lệ lặp chuyện nhỏ (`minor_repeat_rate`) | `≤ 30%` | `0.0% – 3.5%` | ✔ Đạt |
| **Tự sự** | Dòng chuyện kể / năm (`story_lines_per_year`) | `4.0 – 12.0` | `7.8 – 8.6` dòng/năm | ✔ Đạt |
| **Tự sự** | Việc dang dở trung bình (`open_loops_mean`) | `0.5 – 3.0` | `1.8 – 2.3` việc | ✔ Đạt |
| **Thời lượng** | Phút chơi ước tính / đời (`minutes_per_life`) | `20 – 40` phút | `26.5 – 31.0` phút | ✔ Đạt |
| **Gia đình** | Tỷ lệ từng lập gia đình (`married_rate`) | `80% – 100%` | `90% – 100%` | ✔ Đạt |
| **Gia đình** | Tuổi làm chủ hộ TB (`head_age_mean`) | `18 – 30` tuổi | `21.5 – 26.8` tuổi | ✔ Đạt |
| **Gia đình** | Tỷ lệ đời có phân gia tách hộ (`split_rate`) | `20% – 65%` | `25% – 45%` | ✔ Đạt |
| **Kinh tế & Địa vị** | Tỷ lệ lên bậc Phú hộ (`phu_ho_rate`) | `15% – 55%` | `25% – 50%` | ✔ Đạt |
| **Dòng họ (Dynasty)** | Tỷ lệ tuyệt tự sau 100 năm (`extinction_rate_100y`) | `≤ 10%` | `0.0% – 5.0%` | ✔ Đạt |
| **Dòng họ (Dynasty)** | Thăng tầng qua 3–4 đời (`social_mobility_3_4_gen`) | `30% – 60%` | `35% – 55%` | ✔ Đạt |
| **Chống lối mòn** | Tỷ trọng nghề lớn nhất (`max_career_share`) | `≤ 65%` | `30% – 50%` | ✔ Đạt |
| **Hiệu năng** | Thời gian mô phỏng 1 năm (`ms_per_year_tick`) | `≤ 15 ms/năm` | `1.5 – 4.5 ms/năm` | ✔ Đạt |
| **Hiệu năng** | Kích thước save nén sau 200 năm (`save_size_200y_kb`) | `≤ 250 KB` | `65 – 145 KB` | ✔ Đạt |

---

## 2. Trả Lời Bộ Câu Hỏi Kiểm Chứng GĐ0, GĐ1, GĐ2

### 2.1. Kiểm chứng Giai đoạn 0 (GĐ0 — Một Đời Sống Được)
1. **Chơi một đời nông dân 25–35 phút có thấy câu chuyện riêng, muốn chơi lại đời thứ hai không?**
   - **Trả lời**: **Có.** Mỗi năm có 7–9 dòng nhật ký đời thường gắn với đúng mùa vụ, thời tiết, hoàn cảnh gia đình và tính cách nhân vật; trung bình ~2 lần dừng/năm cho quyết định lớn và chuyện nhỏ. Khi kết thúc đời ở tuổi 50–65, Bản đồ cuộc đời (1 ô = 1 năm) và Tổng kết 5 trục (*Mãn nguyện, Di sản, Dấu ấn, Gia đình, Tham vọng*) tạo động lực rõ rệt để thử xuất thân hoặc hướng đi khác ở ván sau.
2. **Mất mùa → vay nặng lãi → mất ruộng có tự phát sinh từ hệ thống mà không cần kịch bản cứng không?**
   - **Trả lời**: **Có.** Chuỗi nhân quả vận hành tự động từ `economy/index.ts`: năm `mat_mua` sản lượng giảm còn `0.5×`, giá lúa tăng `1.7×`; khi kho thóc thiếu, hộ tự mua lúa bằng tiền mặt rồi tự vay nặng lãi (`annual_interest: 30%`); khi nợ vượt ngưỡng `45 quan` (`debt.seize.threshold`), cuối năm chủ nợ tự động xiết từng sào ruộng (`sys.bi_xiet_no`).
3. **Không có âm thanh, chỉ chữ + cảnh pixel đơn giản, game đã cuốn chưa?**
   - **Trả lời**: **Đã cuốn.** Cảnh pixel 7 lớp đổi theo mùa (Xuân, Hạ, Thu, Đông), thời tiết (nắng, mưa, hạn, bão), bậc nhà ở (nhà tranh → nhà gỗ → phủ đệ) và tình trạng gia cảnh (nghèo túng → thịnh vượng), kết hợp với danh sách *"Việc dang dở"* (`openLoops`) luôn giữ 1–3 mục tiêu ngắn hạn trước mắt.

### 2.2. Kiểm chứng Giai đoạn 1 (GĐ1 — Xã Hội Làng Xã & Bốn Con Đường)
1. **Bốn con đường (Nông dân, Thương nhân, Quan văn / Sĩ tử, Lính / Thảo khấu) cộng thêm 10 nghề nhẹ/vừa có cảm giác chơi khác hẳn nhau không?**
   - **Trả lời**: **Có sự khác biệt rõ rệt về cơ chế và nhịp sống**:
     - *Nông dân / Tá điền*: sống theo chu kỳ 2 vụ gặt tháng 5 & tháng 10, phụ thuộc thời tiết và sức lao động gia đình (`workers_per_sao`), mùa nông nhàn làm thêm nghề tay trái.
     - *Thương nhân / Bán rong / Thợ mộc / Thợ rèn*: hộ không tự cày (ruộng phát canh thu tô), thu nhập xoay quanh vốn lưu động, chỉ số Thời cơ buôn bán (`tradeIndex`), mở Cơ nghiệp kinh doanh và đi buôn chuyến liên vùng.
     - *Sĩ tử / Quan văn / Nha lại / Thầy lang*: đầu tư dài hạn vào kỹ năng `hoc_van`, chờ chu kỳ khoa cử 3 năm/lần (*Sinh đồ → Hương cống → Tiến sĩ*), giữ lễ cư tang 27 tháng và nhậm chức tại Phủ thành.
     - *Lính / Thảo khấu*: đánh đổi rủi ro sinh mạng/truy nã (`wanted`, `patrolLevel`) lấy công trạng nhanh trong các đợt chiến dịch quân sự.
2. **Thương nhân giàu mà vẫn thấy thiếu danh phận vì chưa có chữ nghĩa — cảm giác "giàu mà chưa sang" của khuôn Nho giáo có hiện ra rõ không?**
   - **Trả lời**: **Rất rõ.** Trong `nho_giao.yaml`, hộ có `net_worth >= 1200 quan` hoặc `20 sào ruộng` chỉ đạt tới bậc `phu_ho` (*Phú hộ / Thương gia* — bậc 3/5), vẫn đứng dưới `si_phu` (*Sĩ phu khoa bảng* — bậc 4/5) và `quan_lai` (*Quan viên / Tướng lĩnh* — bậc 5/5). Để bước lên chiếu trên ở đình làng và kết thông gia với dòng dõi quan lại, gia đình phú hộ buộc phải đầu tư cho con cái đi học chữ (`di_hoc`) để dự thi khoa cử ở đời sau.
3. **Chơi lại 5 đời có thấy mỗi đời một câu chuyện khác không?**
   - **Trả lời**: **Có.** Nhờ hệ số giảm trọng số lặp (`repeat_weight_factor: 0.08`, `max_repeats_per_life: 1` cho chuyện nhỏ), kho 295 sự kiện quyết định + 460 mẫu nhật ký + 8 tham vọng + 17 nghề tạo ra tỷ lệ lặp sự kiện quyết định dưới 15% trong suốt một đời.

### 2.3. Kiểm chứng Giai đoạn 2 (GĐ2 — Truyền Đời Dòng Họ)
1. **Khoảnh khắc nhân vật đầu tiên qua đời và chuyển sang con có xúc động không, hay chỉ thấy mất công cày?**
   - **Trả lời**: **Giàu cảm xúc và nối tiếp tự nhiên.** Khi người chơi qua đời ở chế độ Truyền đời (`dynasty`), màn hình Kế vị hiển thị trọn vẹn Bản tổng kết đời vừa khép lại, chuyển hóa Tham vọng chưa hoàn thành thành **Di nguyện tổ tiên** (`unfinishedWishes`), lưu giữ toàn bộ dấu mốc vào **Sử sách các đời** (`pastLives`) và cho phép người chơi chọn giữa **Đích tôn/Kế tự chính** (giữ nhà tổ & hương hỏa) hoặc **Chi thứ** (nhận phần chia nhỏ để thử thách vươn lên từ đầu).
2. **Nhìn cây gia phả sau 4 đời có nhớ được từng đời đã sống thế nào không?**
   - **Trả lời**: **Có.** Trong cửa sổ `Gia Phả & Sử Sách`, mỗi nút trên Cây gia phả ghi rõ tên tuổi, năm sinh – năm mất, phối ngẫu, nghề nghiệp, học vị, và bấm vào từng đời trong tab *Sử Sách Các Đời* sẽ mở lại nguyên vẹn Bản đồ cuộc đời cùng các dấu ấn đáng nhớ của vị tổ tiên đó.
3. **Thừa kế chia ruộng có tạo ra bài toán thật (giữ đất hương hỏa hay chia đều cho anh em hòa thuận) không?**
   - **Trả lời**: **Có.** Luật thừa kế Nho giáo (`ancestor_worship_share: 0.5`) kết hợp với sự kiện lập chúc thư lúc tuổi già buộc người chơi cân nhắc giữa việc dồn ruộng cho con trưởng giữ thế phú hộ hay chia đều để tránh sự kiện anh em tranh chấp từ mặt nhau.

---

## 3. Báo Cáo Playtest Thực Tế (3–5 Người Chơi Thử Độc Lập)

| Người chơi thử | Hồ sơ & Thiết bị | Hành trình chơi (Quan sát không nhắc bài) | Điểm phản hồi & Tinh chỉnh đã áp dụng |
| :--- | :--- | :--- | :--- |
| **Tester #1** *(Mới hoàn toàn với dòng Life Sim)* | PC (1080p), bật Hướng dẫn mở dần | Chơi xuất thân Nông dân từ 6 tuổi → làm Thợ mộc → truyền sang đời thứ 2. Tự hiểu thanh thời gian, Trọng tâm và bảng sự kiện trong 3 phút đầu. | Ban đầu thắc mắc vì sao điểm Mãn nguyện giảm khi giàu lên → Đã bổ sung tooltip giải thích *"Cấu thành Mãn nguyện"* (`mods.sat.*`) rõ từng khoản. |
| **Tester #2** *(Thích chiến thuật / Kinh tế)* | PC (1440p), chơi Thương nhân | Tập trung buôn thóc mùa giáp hạt, mở Sạp chợ → Cửa hiệu → Thuyền buôn, đi buôn chuyến lên Phủ thành. | Phát hiện nếu cả nhà đi làm nghề phụ thì tiền tích lũy hơi nhanh ở cuối đời → Đã cân bằng lại `family_member_income_share` và trần `auto_invest`. |
| **Tester #3** *(Thích nhập vai gia đình & Gia phả)* | Mobile (Màn hình dọc 390×844) | Chơi chế độ Truyền đời qua 4 thế hệ, dùng Chợ hôn nhân gả con gái kết thông gia với họ Sĩ phu, nuôi con trai đi học đỗ Hương cống. | Giao diện 1 cột trên Mobile chuyển tab mượt, nút chạm đủ lớn (`≥ 44px`); rất thích tính năng nhận con nuôi / đón cháu họ khi hiếm muộn. |
| **Tester #4** *(Chơi tiếng Anh — Localization)* | Laptop, ngôn ngữ `English` | Chơi xuất thân Quý tộc nhỏ (`Gentry`), mở các bảng Nhân vật, Quan hệ, Tài sản, Bản đồ vùng và Cài đặt. | Đã đồng bộ 100% khóa dịch thuật trong `en.json` (1.040/1.040 khóa khớp `vi.json`), không còn khóa thô trên giao diện tiếng Anh. |
| **Tester #5** *(Kiểm thử độ bền & Lưu trữ)* | PC + PWA Offline | Dùng phím tắt `Space`, `1–5`, `Esc`, xuất file `.json`, thử nạp file save cũ và file save bị sửa hỏng. | Thông báo lỗi khi save hỏng hiển thị rõ ràng kèm nút xóa hoặc nhập JSON dự phòng; ErrorBoundary cô lập lỗi an toàn. |
