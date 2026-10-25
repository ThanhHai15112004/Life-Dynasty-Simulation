# 00_Tong_Quan_GDD.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 00 · Tổng quan & Tầm nhìn
Bản sắc, trụ cột thiết kế, định vị và bản đồ bộ tài liệu

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Tầm nhìn sản phẩm, nguyên tắc thiết kế, danh mục tài liệu |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Giới thiệu dự án
1.1 Định vị so với thị trường
1.2 Điểm yếu của CK3 là cơ hội của Dòng Đời
2. Tầm nhìn: “Cuộc đời là hỗn loạn có nhân quả”
2.1 Bốn cảm giác cốt lõi (Core Fantasy)
2.2 Sáu nguyên tắc thiết kế (từ tài liệu ý tưởng gốc)
2.3 Trụ cột bổ sung (chốt qua quá trình phân tích)
3. Bốn cơ chế đặc trưng (Signature Mechanics)
4. Vòng lặp cốt lõi tóm tắt
5. Ba tầng trải nghiệm
6. Chế độ chơi
7. Danh mục bộ tài liệu
8. Điều kiện để game thành công
9. Quy ước trong bộ tài liệu

## 1. Giới thiệu dự án
Dòng Đời — Legacy of Ages (tên tạm) là game mô phỏng cuộc đời, gia tộc và lịch sử. Người chơi sinh ra trong một thế giới đang vận động, sống một đời người với những cơ hội và biến cố của nó, xây dựng tài sản, gia đình và vị thế, rồi truyền di sản cho thế hệ sau.

| Hạng mục | Nội dung |
| --- | --- |
| Thể loại | Life Simulator · Dynasty Simulator · Grand Strategy · Historical Sandbox · RPG Simulation |
| Nền tảng | Web / PC, Mobile |
| Đồ họa | Pixel Art 2D, cảnh ghép lớp phản ánh trạng thái, micro-cutscene 3–8 giây |
| Cảm hứng | Crusader Kings III (chiều sâu nhân vật, gia tộc, quyền lực mềm) và 1in8b/BitLife (đời sống thường ngày, nhịp nhanh, dễ chơi) |
| Thế giới | Generated World (sinh từ seed) và Historical World (dữ liệu lịch sử thật, cho phép lịch sử thay thế) |
| Chế độ chơi | One Life · Dynasty · Legacy of Ages |

Câu định vị: Không phải mọi cuộc đời đều vĩ đại. Nhưng mọi cuộc đời đều có thể để lại dấu vết trong lịch sử.

### 1.1 Định vị so với thị trường
Công thức ngắn gọn: CK3 + BitLife = Dòng Đời, cộng thêm những thứ chưa game nào kết hợp được.

| Lấy từ | Thành phần |
| --- | --- |
| Crusader Kings III | Nhân vật là trung tâm, tính cách điều khiển AI và sự kiện, gia tộc xuyên thế hệ, quyền lực mềm (bí mật, ân tình, mưu sự), stress khi làm trái bản chất |
| BitLife / 1in8b | Đời sống thường ngày, nhịp chơi nhanh theo năm, thao tác đơn giản, phù hợp mobile |
| Bản sắc riêng | Chơi được mọi tầng lớp (nông dân là trải nghiệm đầy đủ), hệ thống Thời cơ, mô hình Hạnh phúc tâm lý, nổi dậy từ dưới lên, quản lý fractal, pixel scene động, xuyên thời đại, chiều sâu văn minh Đông Á (khoa cử, làng xã, Thiên mệnh) |


### 1.2 Điểm yếu của CK3 là cơ hội của Dòng Đời

| Điểm yếu CK3 | Cách Dòng Đời vượt qua |
| --- | --- |
| Chủ yếu chơi giới cầm quyền | Mọi tầng lớp, mọi nghề đều là con đường đầy đủ |
| Dân thường chỉ là con số | Dân thường là con người có đời sống riêng |
| Kinh tế nông, chủ yếu thuế và quân | Kinh tế hộ gia đình, tài sản, đầu tư thật |
| Giữa game dễ nhàm khi đã quá mạnh | Quyền lực có chi phí, thế giới phản kháng |
| Sự kiện lặp sau vài chục giờ | Sự kiện mẫu có tham số + sự kiện sinh từ hệ thống |
| Chỉ một thời kỳ | Tiềm năng xuyên thời đại |
| Đông Á, Đông Nam Á yếu | Khuôn Quan liêu Nho giáo làm sâu từ đầu |


## 2. Tầm nhìn: “Cuộc đời là hỗn loạn có nhân quả”
Game không có con đường đúng, không có kết thúc định sẵn. Một đời nông dân cũng sâu và đáng chơi như một đời vua. Chọn điều tốt không bảo đảm kết quả tốt. Đúng việc nhưng sai thời điểm vẫn có thể thất bại. Cái chết có thể đến bất cứ lúc nào.
Nguyên tắc tối thượng của sự ngẫu nhiên: Không thể đoán trước, nhưng có thể hiểu được khi nhìn lại. Người chơi thua phải nghĩ “đáng lẽ mình nên đợi qua mùa đông”, không phải “game random vớ vẩn”.

### 2.1 Bốn cảm giác cốt lõi (Core Fantasy)

| Cảm giác | Người chơi nghĩ | Cơ chế chịu trách nhiệm |
| --- | --- | --- |
| Sống một đời người | “Nhân vật này là một con người” | Tính cách, ký ức, quan hệ, giai đoạn đời |
| Vươn lên | “Mình đang leo từng bậc” | Thang địa vị, tài sản, pixel scene thay đổi |
| Nhân quả | “Chuyện năm xưa giờ quay lại” | Memory, opinion, sự kiện có điều kiện |
| Di sản | “Con mình sẽ ra sao?” | Con cái phát triển, thừa kế, gia phả |

Mọi cơ chế phải trả lời được câu hỏi: nó phục vụ cảm giác nào? Không phục vụ cảm giác nào thì cắt.

### 2.2 Sáu nguyên tắc thiết kế (từ tài liệu ý tưởng gốc)
Đơn giản để chơi, nhưng có chiều sâu để khám phá.
Mỗi cuộc đời có những cơ hội, rủi ro và kết quả khác nhau.
Quyết định có hậu quả thực tế, có thể kéo dài nhiều thế hệ.
Thế giới tự vận hành, không chỉ phản ứng với người chơi.
Người chơi có quyền lựa chọn con đường, không bị ép trở thành vua.
Hình ảnh phản ánh những gì đang diễn ra, thay vì chỉ thay đổi con số.

### 2.3 Trụ cột bổ sung (chốt qua quá trình phân tích)
Đa dạng và chiều sâu ở mọi tầng: sống nông dân cả đời vẫn có quản lý ruộng, hộ gia đình, làng xã.
Không có lối mòn: con đường tối ưu khác nhau theo nhân vật và theo biến động thế giới.
Lựa chọn “hạnh phúc” không bảo đảm đời hạnh phúc: hạnh phúc là kết quả tâm lý, không phải tổng điểm.
Thời điểm quan trọng ngang quyết định: cùng một hành động, đúng lúc thì thành, sai lúc thì bại.
Có thể chết bất cứ lúc nào, nhưng cái chết luôn có nguyên nhân được ghi lại.
Nghề nghiệp là core mở rộng được: thêm nghề mới chủ yếu là thêm dữ liệu.
Gây nghiện lành mạnh: vòng lặp mở, tò mò, gắn bó cảm xúc. Không FOMO, không gacha, không năng lượng theo giờ thực.

## 3. Bốn cơ chế đặc trưng (Signature Mechanics)

| # | Cơ chế | Một câu mô tả | Chi tiết |
| --- | --- | --- | --- |
| 1 | Hệ thống Thời cơ | Thế giới có biến trạng thái dao động; thông tin là tài nguyên; “chờ thời” là một lựa chọn | Tài liệu 03 |
| 2 | Hạnh phúc tâm lý | Ba tầng cảm xúc, thích nghi, kỳ vọng, giá trị theo tính cách | Tài liệu 01 |
| 3 | Nổi dậy từ dưới lên | Bất mãn tích tụ, kết nối bí mật, lòng tin, kẻ chỉ điểm, chờ thời, hậu cách mạng | Tài liệu 03 |
| 4 | Quản lý fractal | Cùng 5 yếu tố quản lý từ hộ nông dân đến vương quốc, ủy quyền ở mọi tầng | Tài liệu 03 |

Ba bản sắc đi kèm: Core nghề nghiệp lắp ghép (Tài liệu 04), Khuôn văn minh cho phép sinh ra ở bất kỳ đâu trên thế giới (Tài liệu 07), Pixel scene phản ánh trạng thái (Tài liệu 08).

## 4. Vòng lặp cốt lõi tóm tắt
ĐẦU VÀO NGƯỜI CHƠI          XỬ LÝ                      ĐẦU RA
Trọng tâm (Focus)     →   Modifier System      →   Thay đổi trạng thái
Mức sống / Chi tiêu   →   Mô phỏng tick tháng  →   Ký ức, quan hệ
Lựa chọn sự kiện      →   AI nhân vật, thế giới →  Cảnh pixel, biên niên sử
↑                                                  │
└──────────── Event Director chọn tình huống mới ←─┘
Năm tầng thời gian lồng nhau: Quyết định (giây) → Một năm (1–3 phút) → Một đời (20–40 phút) → Gia tộc (vài giờ) → Thời đại (hàng chục giờ). Chi tiết ở Tài liệu 01.

## 5. Ba tầng trải nghiệm

| Tầng | Nội dung | Ghi chú |
| --- | --- | --- |
| 1. Sống một cuộc đời | Sinh ra, học, làm việc, yêu, cưới, sinh con, tài sản, bệnh tật, già, chết | Gameplay nền, áp dụng cho mọi địa vị |
| 2. Gia đình và dòng tộc | Nuôi dạy con, hôn nhân, thừa kế, danh tiếng, bí mật, phục hưng | Mở khi có gia đình |
| 3. Quyền lực và thế giới | Lãnh địa, tổ chức, kinh tế, quân sự, ngoại giao, luật pháp, cải cách | Mở theo vị thế: lãnh chúa, thủ lĩnh băng, chủ thương hội, vua... |

Ba tầng không thay thế nhau. Khi làm vua, người chơi vẫn phải sống cuộc đời cá nhân và chăm sóc gia đình.

## 6. Chế độ chơi

| Chế độ | Mô tả | Kết thúc |
| --- | --- | --- |
| One Life | Sống trọn một đời, phù hợp chơi nhanh | Bản tổng kết đời nhiều trục |
| Dynasty | Tiếp tục qua nhiều thế hệ, gia tộc là sợi dây xuyên suốt | Khi gia tộc tuyệt tự hoặc người chơi dừng |
| Legacy of Ages | Xuyên nhiều thời đại, hàng trăm đến hàng nghìn năm | Có tăng tốc và tóm lược lịch sử |

Cùng với đó, người chơi chọn loại thế giới (Generated / Historical), mức độ “số phận” (Đời bình lặng · Đời thực · Số phận khắc nghiệt · Tùy chỉnh) và mức bám sát lịch sử.

## 7. Danh mục bộ tài liệu

| Mã | Tài liệu | Nội dung chính |
| --- | --- | --- |
| 00 | Tổng quan & Tầm nhìn | Tài liệu này |
| 01 | Gameplay & Game Loop | Core fantasy, 5 tầng vòng lặp, một năm trong game, giai đoạn đời, Focus, tham vọng, hạnh phúc, cái chết, nhịp độ |
| 02 | Core Machine & Kiến trúc | Mô hình dữ liệu, thời gian, modifier, rule evaluator, RNG có seed, LOD, scene descriptor, chronicle, phân lớp module, lưu trữ, kiểm thử headless |
| 03 | Cơ chế & Hệ thống | Chỉ số, kỹ năng, tính cách–stress, kinh tế–tài sản, quan hệ, gia đình–thừa kế, thang địa vị, Thời cơ, thông tin–bí mật–ân tình, quyền lực, quân sự, nổi dậy, quản lý fractal |
| 04 | Hệ thống Nghề nghiệp & Con đường | 4 lớp con đường, kiến trúc lắp ghép, hợp đồng nghề, Tổ chức, thừa kế nghề, hệ sinh thái nghề, Dự nghiệp, bản đồ chuyển nghề, nghề mẫu |
| 05 | Sự kiện & Kịch bản | Storylet, 3 nguồn sự kiện, 5 kho sự kiện, Event Director, công bằng ngẫu nhiên, giàn khung câu chuyện, xuất thân, chuỗi sự kiện, sự kiện lịch sử đa góc nhìn |
| 06 | Thế giới, Bản đồ & Lịch sử | Bản đồ 5 lớp cấp tỉnh, dòng thời gian chính trị, bộ xương thật + phần thịt sinh, mốc lịch sử, lực hút lịch sử, sinh nhân vật toàn cầu, nguồn dữ liệu và giấy phép |
| 07 | Khuôn văn minh | Cấu trúc khuôn, 13 khuôn văn minh, khuôn Quan liêu Nho giáo đầy đủ, so sánh Phong kiến Kitô giáo, văn hóa, tên gọi, biến thể |
| 08 | Pixel Art & Giao diện | Scene ghép lớp, bộ asset theo khuôn, micro-cutscene, màn hình, giao diện mở dần |
| 09 | Lộ trình, Cân bằng & Rủi ro | Giai đoạn 0–5, KPI cân bằng, rủi ro và giải pháp, câu hỏi cần chốt, đạo đức thiết kế |


## 8. Điều kiện để game thành công
Người chơi cảm thấy nhân vật là một con người, không phải tập hợp chỉ số.
Lựa chọn về học tập, sức khỏe, tài sản và quan hệ thực sự thay đổi tương lai.
Nhân vật AI có cuộc sống và mục tiêu riêng.
Sự kiện từ nhiều năm trước còn ảnh hưởng hiện tại.
Ngẫu nhiên tạo bất ngờ nhưng không xóa bỏ ý nghĩa quyết định.
Khi nhân vật chết, người chơi tò mò về thế hệ kế tiếp.
Người chơi nhìn thấy cuộc sống thay đổi qua pixel art.
Có nhiều con đường đáng chơi ngoài việc làm vua.
Thất bại vẫn tạo ra câu chuyện thú vị.
Sau khi kết thúc, người chơi muốn thử một cuộc đời, gia tộc hoặc chiến lược khác.

## 9. Quy ước trong bộ tài liệu
Các con số (tỷ lệ, thời lượng, số lượng) là giá trị đề xuất ban đầu, sẽ được hiệu chỉnh bằng mô phỏng headless và playtest.
Mục đánh dấu “Cần chốt” là quyết định thiết kế chưa được thống nhất, tổng hợp lại ở Tài liệu 09.
Chi tiết lịch sử dùng để minh họa thiết kế. Khi đưa vào game cần người am hiểu sử kiểm tra lại từng thời kỳ.