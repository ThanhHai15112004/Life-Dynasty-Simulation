# 01_Gameplay_va_Game_Loop.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 01 · Gameplay & Game Loop
Người chơi làm gì, theo nhịp nào, và vì sao muốn chơi tiếp

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Vòng lặp chơi, giai đoạn đời, Focus, tham vọng, hạnh phúc, cái chết, nhịp độ |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Trải nghiệm cốt lõi
2. Năm tầng vòng lặp
2.1 Một năm trong game (Meso loop)
2.2 Vòng lặp kinh tế phụ
3. Nhịp chơi và hệ thống thời gian
3.1 Mô hình lai (đề xuất)
3.2 Nhịp cảm xúc
4. Các giai đoạn đời
5. Trọng tâm (Focus)
6. Tham vọng cả đời
7. Mô hình Hạnh phúc tâm lý
7.1 Ba tầng cảm xúc
7.2 Các cơ chế tạo bất ngờ
7.3 Bản tổng kết đời — nhiều trục, không có điểm chung
8. Cái chết
8.1 Mô hình rủi ro tử vong theo tháng
8.2 Chết đột ngột nhưng không vô lý
8.3 Cái chết là câu chuyện
9. Chuyển giao thế hệ
10. Vì sao người chơi muốn chơi tiếp
10.1 Móc giữ chân lành mạnh
10.2 Những gì không làm
11. Trải nghiệm mẫu một ván chơi

## 1. Trải nghiệm cốt lõi
Người chơi điều khiển ý chí của một gia tộc, hiện thân qua một nhân vật tại một thời điểm. Họ không quản lý từng ngày, mà lái cuộc đời bằng ba công cụ chính:

| Công cụ lái | Tần suất | Ví dụ |
| --- | --- | --- |
| Trọng tâm (Focus) | Mỗi giai đoạn hoặc mỗi năm | Học tập, Kinh doanh, Quân sự, Chính trị, Gia đình |
| Phân bổ nguồn lực | Mỗi năm | Mức sống, đầu tư, học phí, chữa bệnh, quà cáp |
| Lựa chọn sự kiện | 0–3 lần mỗi năm | Trả nợ bằng ruộng, gả con, bỏ trốn, nổi dậy |

Bên dưới là thế giới tự vận hành: NPC sống đời của họ, giá cả dao động, triều đình biến động, thiên tai đến. Người chơi đọc thế giới và chọn thời điểm hành động.

## 2. Năm tầng vòng lặp
Game không có một vòng lặp duy nhất mà là các vòng lồng nhau. Mỗi tầng có phần thưởng riêng.

| Tầng | Thời lượng thực | Nội dung | Phần thưởng |
| --- | --- | --- | --- |
| 1. Micro — Quyết định | Vài giây | Sự kiện xuất hiện → đọc bối cảnh → chọn → thấy kết quả tức thì | Tò mò, cảm giác hậu quả |
| 2. Meso — Một năm | 1–3 phút | Chọn Focus → phân bổ → thời gian trôi → 1–3 sự kiện → tổng kết năm | Kỹ năng tăng, tài sản đổi, cảnh pixel biến đổi |
| 3. Macro — Một đời | 20–40 phút | Tuổi thơ → định hướng → lập nghiệp → gia đình → đỉnh cao → già → chết | Bản tổng kết, câu chuyện hoàn chỉnh |
| 4. Meta — Gia tộc | Vài giờ | Đời 1 → thừa kế → đời 2 mang thành quả và hậu quả → ... | Gia phả, mối thù, liên minh xuyên thế hệ |
| 5. Mega — Thời đại | Hàng chục giờ | Thế giới chuyển thời đại, thể chế đổi, gia tộc thích nghi hoặc suy tàn | Chứng kiến lịch sử do mình góp phần tạo ra |

Điểm then chốt: Tầng 2 phải vui ngay cả khi tầng 4–5 chưa tồn tại. Đây là lý do Giai đoạn 1 tập trung chứng minh một đời người đã đủ hấp dẫn.

### 2.1 Một năm trong game (Meso loop)
[ĐẦU NĂM]    Báo cáo: tuổi, sức khỏe, tài chính, việc đang làm
Chọn / giữ Trọng tâm
Quyết định chi tiêu: mức sống, đầu tư, học phí, chữa bệnh...
↓
[TRONG NĂM]  Mô phỏng chạy 12 tick tháng (ẩn)
→ kỹ năng tăng, thu chi, quan hệ thay đổi, NPC hành động
→ Event Director chọn 0–3 sự kiện → tự dừng khi cần quyết định
↓
[CUỐI NĂM]   Tổng kết: thu chi, thay đổi lớn, ký ức mới
Cảnh pixel cập nhật
Kiểm tra mốc đời (tuổi học nghề, tuổi kết hôn, tuổi thi...)

### 2.2 Vòng lặp kinh tế phụ
Kiếm tiền → Lựa chọn đầu tư → Cải thiện hoàn cảnh → Mở ra cơ hội hoặc rủi ro mới.
Đầu tư có bốn hướng: cho bản thân (học, chữa bệnh, giao lưu), tài sản (nhà, đất, cửa hàng, thuyền), quyền lực (quà, phe phái, cận vệ, gián điệp), lãnh địa (thủy lợi, chợ, kho lương, thành lũy). Không khoản đầu tư nào bảo đảm sinh lời.

## 3. Nhịp chơi và hệ thống thời gian

### 3.1 Thời gian tự chạy kèm Pause / Auto-pause (Đã chốt)

| Lớp | Thiết kế |
| --- | --- |
| Tick mô phỏng | Theo tháng (12 tick/năm). Đủ mịn cho bệnh, mùa vụ, chiến dịch; đủ thô để chạy mượt |
| Nhịp điều khiển | **Game tự chạy thời gian (Real-time tick) và có nút Pause (Tạm dừng)** bất cứ lúc nào |
| Tốc độ thời gian | Điều chỉnh linh hoạt các mức tốc độ (`1×, 2×, 4×, 8×, 12×`) trên thanh thời gian (`TimeBar`) |
| Auto-pause | Tự động tạm dừng khi có Sự kiện quyết định, mốc đời quan trọng hoặc biến cố nguy hiểm lớn |
| Nhật ký dòng đời | Sự kiện thường (3–8 dòng/năm) tự động chảy vào bảng Nhật ký năm trong lúc thời gian đang chạy |
| Cấu hình phiên chơi | Tốc độ tick và thời lượng mục tiêu cho 1 năm / 1 đời (mặc định 20–40 phút/đời) được đặt trong `data/balance/` để tinh chỉnh linh hoạt |

### 3.2 Nhịp cảm xúc
Event Director (Tài liệu 05) bảo đảm có khoảng yên bình sau khủng hoảng. Người chơi cần thời gian để học tập, xây dựng, nuôi con và tận hưởng thành quả. Không ép bấm liên tục.

## 4. Các giai đoạn đời

| Giai đoạn | Tuổi | Người chơi làm gì | Câu hỏi trung tâm |
| --- | --- | --- | --- |
| Ấu thơ | 0–5 | Gần như tự động, 1–2 sự kiện | Có sống sót không? |
| Thiếu thời | 6–15 | Lựa chọn nhỏ; cha mẹ (AI) quyết định giáo dục | Mình sẽ trở thành ai? |
| Thanh niên | 16–25 | Chọn nghề, học nghề, tình yêu đầu, rời nhà | Đi con đường nào? |
| Lập nghiệp | 26–40 | Kinh doanh, kết hôn, con cái, thăng tiến | Có xây được gì không? |
| Trung niên | 41–55 | Củng cố, đỉnh cao, chuẩn bị kế thừa | Giữ được không? |
| Tuổi già | 56+ | Bệnh tật, di chúc, chọn người kế vị, hòa giải | Để lại gì? |

Mỗi giai đoạn có Focus, kho sự kiện và cảnh pixel riêng, tạo nhịp “chương hồi” tự nhiên cho một đời.
Cho phép người chơi lâu năm bắt đầu ở tuổi 16 (bỏ qua tuổi thơ).
Tuổi thơ của con cái được tua nhanh, chỉ dừng ở các mốc quan trọng.

## 5. Trọng tâm (Focus)
Focus là cách lái cuộc đời mà không quản lý vi mô. Mỗi Focus tác động đồng thời ba thứ:

| Tác động | Ví dụ Focus “Chính trị” |
| --- | --- |
| Tăng XP | Ngoại giao, Mưu lược |
| Bộ lọc sự kiện | Tăng xác suất gặp sự kiện triều đình, quý tộc, phe phái |
| Thay đổi mức phơi nhiễm (exposure) | Tăng cơ hội được bảo trợ, đồng thời tăng rủi ro bị kéo vào tranh chấp |


| Focus | Lợi ích và khả năng mở ra |
| --- | --- |
| Học tập | Tăng kiến thức, mở cơ hội nghề nghiệp, khoa cử |
| Rèn luyện | Thể chất, quân sự |
| Sức khỏe | Chăm sóc bản thân, giảm một số rủi ro |
| Gia đình | Gắn bó, nuôi dạy con |
| Giao lưu | Kết bạn, mạng lưới quan hệ |
| Kinh doanh | Học nghề buôn, tìm cơ hội thu nhập |
| Chính trị | Ảnh hưởng, tiếp cận quyền lực |
| Quân sự | Được trọng dụng, cơ hội chỉ huy |
| Quản trị | Quản lý lãnh địa, tổ chức |
| Nghỉ ngơi | Giảm stress, phục hồi |

Focus khả dụng thay đổi theo giai đoạn đời, địa vị và nghề. Trẻ 8 tuổi không chọn “Chính trị”; nông dân không có “Quản trị lãnh địa”.
Khi trưởng thành có thể có 1 Focus chính + 1 Focus phụ.
Focus không bảo đảm phần thưởng cố định.

## 6. Tham vọng cả đời
Mỗi nhân vật có thể đặt một tham vọng: giàu có, gia đình hạnh phúc, danh tướng, giành tước vị, lập vương quốc, thống nhất thế giới, phục hưng gia tộc, học giả/nhà phát minh, đỗ trạng nguyên, chúa biển...
Mỗi tham vọng có 3–5 mốc phụ. Ví dụ “Danh tướng”: nhập ngũ → chỉ huy đội nhỏ → thắng trận lớn → được phong tướng.
Đạt mốc: tinh thần tăng, câu chuyện ghi vào biên niên sử.
Có thể đổi tham vọng khi hoàn cảnh đổi (mất chân trong chiến tranh → “Gia đình hạnh phúc”).
Tham vọng là la bàn mềm giúp người chơi mới không lạc lối trong sandbox.

## 7. Mô hình Hạnh phúc tâm lý
Hạnh phúc không phải tổng điểm các lựa chọn tốt. Đây là cơ chế đặc trưng giúp hiện thực ý tưởng “chọn điều hạnh phúc nhất nhưng đời có thể không hạnh phúc”.

### 7.1 Ba tầng cảm xúc

| Tầng | Thời gian | Nguồn |
| --- | --- | --- |
| Cảm xúc tức thời | Ngày, tuần | Sự kiện vừa xảy ra (cưới, mất bò) |
| Tâm trạng | Tháng, năm | Stress, sức khỏe, quan hệ gần |
| Mãn nguyện đời | Cả đời | Giá trị sống có được thỏa mãn không |


### 7.2 Các cơ chế tạo bất ngờ
Thích nghi (hedonic adaptation): lên nhà gỗ vui lớn năm đầu, sau ~3 năm thành bình thường.
Kỳ vọng và so sánh: Mãn nguyện = Thực tế – Kỳ vọng. Con nông dân có ruộng riêng rất vui; con quý tộc mất một lâu đài thì đau khổ dù vẫn giàu. So sánh với anh em, hàng xóm, bạn cũ.
Giá trị theo tính cách: người Tham vọng sống bình yên thì bứt rứt; người Coi trọng gia đình làm vua xa con thì bất hạnh.
Hậu quả không ai muốn: cưới vì yêu → 10 năm sau nghèo, cãi nhau vì tiền; tha kẻ thù → hắn quay lại báo thù con.
Mất mát không thể tránh: sống càng lâu, càng chứng kiến nhiều cái chết; cô đơn tuổi già là yếu tố thật.

### 7.3 Bản tổng kết đời — nhiều trục, không có điểm chung

| Trục | Câu hỏi |
| --- | --- |
| Mãn nguyện | Nhân vật tự thấy đời mình thế nào? |
| Di sản | Để lại gì cho con cháu? |
| Dấu ấn | Thế giới nhớ đến bạn thế nào? |
| Gia đình | Quan hệ với người thân ra sao? |
| Tham vọng | Đạt được bao nhiêu? |

Một vị vua có thể Dấu ấn rất cao, Mãn nguyện rất thấp. Một nông dân có thể Mãn nguyện cao, Dấu ấn bằng không, và đó vẫn là một đời đẹp.

## 8. Cái chết

### 8.1 Mô hình rủi ro tử vong theo tháng
Rủi ro tháng = Tuổi tác + Bệnh tật + Nghề nghiệp + Chiến tranh + Dịch bệnh
+ Bạo lực (kẻ thù) + Tai nạn + Mức sống + Mùa (đông, đói) + Sinh nở
Lính: rủi ro cao. Thợ mỏ: tai nạn. Thương nhân đường dài: cướp, bệnh lạ. Quý tộc: ám sát, chiến tranh. Nông dân: đói, dịch.
Lựa chọn giảm được rủi ro (không đi lính, ăn tốt, thuê cận vệ, tránh vùng dịch) nhưng không bao giờ về 0.

### 8.2 Chết đột ngột nhưng không vô lý
Cái chết luôn có nguyên nhân ghi lại: “Chết vì sốt rét trong chiến dịch phía nam năm 1067”.
Có lúc có điềm báo (ho kéo dài, người hầu bị mua chuộc), có lúc không (ngã ngựa).
Ở mức mặc định, cái chết hoàn toàn bất ngờ (không dấu hiệu, không do lựa chọn) là hiếm; phần lớn đến từ rủi ro người chơi đã chấp nhận.

### 8.3 Cái chết là câu chuyện
Người thừa kế nhận việc dang dở: nợ chưa trả, cuộc nổi dậy chưa xong, lời hứa chưa giữ.
Di chúc: người già viết trước. Chết đột ngột không di chúc → luật mặc định → dễ tranh chấp.
Chết sai thời điểm cũng là một dạng “sai thời điểm”.

## 9. Chuyển giao thế hệ
Người chơi là ý chí của gia tộc. Khi nhân vật chết, chọn người kế tiếp trong số người hợp lệ theo luật (chủ hộ, người thừa kế tước vị, thủ lĩnh tổ chức).
Chọn người không thừa kế tài sản chính → chơi tiếp với hoàn cảnh nghèo hơn. Đây là một lựa chọn hợp lệ.
Người thừa kế đã có quá khứ, tính cách, quan hệ riêng; không nhận kỹ năng của người trước.
Game over khi không còn thành viên dòng họ hợp lệ. Lối thoát: con nuôi, họ hàng xa.
Cần chốt: mức độ điều khiển người thừa kế có tính cách mạnh (ví dụ Nóng nảy) — đề xuất: người chơi điều khiển đầy đủ, nhưng hành động trái tính cách gây stress.

## 10. Vì sao người chơi muốn chơi tiếp

### 10.1 Móc giữ chân lành mạnh
Luôn có 2–3 việc dang dở với thời điểm kết thúc khác nhau (mưu sự 70%, con sắp trưởng thành, vợ mang thai, chư hầu bất mãn).
Nhiều thang mục tiêu chồng nhau: vài tháng, vài năm, cả đời, nhiều đời.
Nỗi lo người thừa kế: “đứa con này có ổn không?”, đầu tư vào tương lai từ khi con còn nhỏ.
Tin đồn và điềm báo về chuyện sắp đến.
Câu chuyện đáng kể lại: vô lý nhưng truy được nguyên nhân.
Thất bại không phải game over mà là chương mới.
Thế hệ sau có khởi điểm khác, tạo “ván mới mà không mất gì”.

### 10.2 Những gì không làm

| Lành mạnh (làm) | Thao túng (không làm) |
| --- | --- |
| Tò mò “chuyện gì tiếp theo?” | Phần thưởng đăng nhập hằng ngày |
| Vòng lặp chưa đóng trong game | Đếm ngược sự kiện giới hạn thời gian |
| Gắn bó cảm xúc với nhân vật | Gacha, loot box |
| Muốn thử chiến lược khác | Năng lượng hồi theo giờ thực |
| Câu chuyện đáng kể lại | Bán lợi thế bằng tiền |
| Thất bại mở chương mới | Phạt người chơi khi nghỉ |


## 11. Trải nghiệm mẫu một ván chơi

| Năm | Diễn biến | Hệ thống tham gia |
| --- | --- | --- |
| 1042 | Sinh ra trong gia đình nông dân nghèo | Sinh nhân vật, xuất thân |
| 1054 | Cha mất vì bệnh, phải bỏ học làm ruộng | Rủi ro tử vong, kinh tế hộ |
| 1060 | Chiến tranh, gia nhập quân đội | Áp lực thế giới, chuyển nghề |
| 1068 | Lập công, được thưởng tiền và đất | Thang bậc quân đội, tài sản |
| 1072 | Kết hôn | Chợ hôn nhân |
| 1081 | Lụt lớn phá nhà, vay tiền khôi phục | Thiên tai, nợ |
| 1094 | Con trưởng mất, con thứ được chọn kế thừa | Thừa kế |
| 1105 | Qua đời ở tuổi 63 | Tổng kết đời |
| Đời II | Con thứ, thương nhân 37 tuổi, buôn lương thực, gả con gái vào nhà quan | Nghề thương nhân, liên hôn |
| Đời III | Cháu phục vụ triều đình, khủng hoảng kế vị mở cơ hội, được phong tước | Thời cơ, thang địa vị |
| Đời IV | Hậu duệ thành công tước, nổi loạn, lập vương quốc | Quyền lực, nổi dậy, Dự nghiệp |
| Về sau | Chia cắt, phục hưng, quân chủ chấm dứt, gia tộc chuyển sang kinh doanh | Thời đại, thể chế |

Mọi diễn biến trên phải phát sinh từ mô phỏng, không phải kịch bản viết sẵn cho mọi người chơi.