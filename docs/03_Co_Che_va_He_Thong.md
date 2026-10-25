# 03_Co_Che_va_He_Thong.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 03 · Cơ chế & Hệ thống
Các hệ thống gameplay, cách chúng vận hành và va chạm nhau

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Chỉ số, kỹ năng, tính cách, kinh tế, quan hệ, gia đình, địa vị, Thời cơ, quyền lực, nổi dậy |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Công thức kết quả
2. Chỉ số trạng thái
3. Kỹ năng
4. Tính cách và Stress
5. Kinh tế, Tài sản và Mức sống
5.1 Tài sản là object
5.2 Mức sống — một lựa chọn chạm năm hệ thống
5.3 Kinh tế hộ nông dân
6. Quan hệ xã hội
6.1 Quyền lực mềm
7. Gia đình, Hôn nhân và Thừa kế
8. Thang địa vị xã hội
9. Hệ thống Thời cơ (cơ chế đặc trưng)
9.1 Thế giới có biến trạng thái “trôi”
9.2 Cùng hành động, kết quả khác hoàn toàn
9.3 Đọc thời cơ
9.4 “Chưa phải lúc” là một lựa chọn
10. Quyền lực, Chính trị và Quân sự
10.1 Chính trị
10.2 Quân sự (trừu tượng hóa)
10.3 Ngoại giao
11. Hệ thống Nổi dậy từ dưới lên (cơ chế đặc trưng)
11.1 Bất mãn tích tụ (Grievance)
11.2 Tám giai đoạn
11.3 Bí mật và Lòng tin
11.4 Thắng lợi chưa phải là hết
12. Quản lý fractal và ủy quyền (cơ chế đặc trưng)
12.1 Cùng 5 yếu tố ở mọi tầng
12.2 Ủy quyền ở mọi tầng
13. Các hệ thống chiều sâu bổ sung
14. Chuỗi va chạm hệ thống (ví dụ)

## 1. Công thức kết quả
Mỗi kết quả trong game được tạo từ bốn yếu tố:
KẾT QUẢ = Quyết định × Thời điểm × Hoàn cảnh × Vận may

| Yếu tố | Người chơi kiểm soát? | Ví dụ |
| --- | --- | --- |
| Quyết định | Hoàn toàn | Nổi dậy, bán lúa, cưới vợ |
| Thời điểm | Một phần | Nổi dậy khi lãnh chúa đi đánh trận |
| Hoàn cảnh | Ít (chuẩn bị được) | Kỹ năng, quan hệ, tài sản, thế giới |
| Vận may | Không | Thời tiết, bệnh, tình cờ bị mật báo |

Tỷ trọng gợi ý: Quyết định + Thời điểm + Hoàn cảnh ≈ 70%, Vận may ≈ 30%. Điều chỉnh được theo chế độ “số phận”.

## 2. Chỉ số trạng thái
Không phải mọi thứ đều là thanh 0–100. Chia ba loại:

| Loại | Chỉ số | Mô tả |
| --- | --- | --- |
| Gauge (biến động nhanh) | Sức khỏe | 0–100 + danh sách bệnh riêng (mức nặng, tiến triển, cách chữa), thương tật vĩnh viễn, tâm bệnh |
|  | Tinh thần / Stress | Tăng khi làm trái tính cách, mất người thân, nghèo đói. Stress cao → suy sụp, bệnh, “phá vỡ” (nghiện, bỏ đi, nổi nóng) |
| Derived (tính toán) | Danh tiếng | Theo nhóm: dân làng, thương hội, quý tộc, giáo hội, sĩ phu, giang hồ |
|  | Ảnh hưởng | Từ chức vụ, quan hệ với người quyền lực, tài sản, danh tiếng |
|  | An toàn | Từ kẻ thù, nơi ở, chiến tranh, nghề, cận vệ |
| Ledger (sổ sách) | Tài chính | Bảng thu, chi, nợ, tài sản của hộ |


## 3. Kỹ năng

| Kỹ năng | Phạm vi |
| --- | --- |
| Quân sự | Chỉ huy, chiến thuật, hậu cần, võ nghệ |
| Ngoại giao | Thương lượng, thuyết phục |
| Quản trị | Quản lý tài nguyên, tổ chức |
| Mưu lược | Tình báo, điều tra, âm mưu |
| Thương mại | Kinh doanh, tài chính, đọc giá |
| Học vấn | Đọc viết, khoa học, văn tài |
| Sinh tồn / Nghề | Trồng trọt, săn bắt, hàng hải, thủ công |

Cơ chế tăng trưởng:
XP từ Focus, công việc, sự kiện, thầy dạy.
Đường cong theo tuổi: học nhanh 8–25 tuổi, chậm dần sau 40.
Lợi ích giảm dần: 0→5 nhanh, 15→20 rất chậm.
Thầy dạy và môi trường: con quý tộc có gia sư, con nông dân học từ cha. Nguồn bất bình đẳng xuất phát tự nhiên.
Tiền chỉ mua cơ hội học, không mua kỹ năng trực tiếp.
Kỹ năng là kính lúp thông tin: kỹ năng cao → khoảng xác suất hiển thị chính xác hơn, tin đồn đáng tin hơn.

## 4. Tính cách và Stress
Mỗi tính cách có ba tác dụng cùng lúc:
Modifier: Tham lam → Thương mại +, quan hệ –.
Trọng số AI: NPC tham lam ưu tiên lựa chọn có lợi tiền bạc, dễ bị mua chuộc.
Stress khi làm trái: người chơi có quyền cho nhân vật Nhân từ đi tàn sát, nhưng nhân vật stress nặng.

| Cặp tính cách |  |
| --- | --- |
| Tham vọng / An phận | Nhân từ / Tàn nhẫn |
| Kiên nhẫn / Nóng nảy | Trung thành / Cơ hội |
| Hào phóng / Tham lam | Can đảm / Thận trọng |
| Coi trọng gia đình / Tự do | Mộ đạo / Hoài nghi |

Tính cách chỉ đổi qua sự kiện lớn (mất con, chiến tranh, ngộ đạo) hoặc stress kéo dài.
Di truyền một phần + môi trường tuổi thơ (nghèo đói, được yêu thương, bị bỏ rơi).

## 5. Kinh tế, Tài sản và Mức sống

### 5.1 Tài sản là object

| Thuộc tính | Ý nghĩa |
| --- | --- |
| Giá trị | Bán được bao nhiêu (đổi theo thị trường, chiến tranh) |
| Thu nhập | Sản lượng/năm, phụ thuộc mùa, lao động, quản lý |
| Chi phí duy trì | Bảo trì, thuế, nhân công |
| Rủi ro | Cháy, lụt, cướp, tịch thu, hư hỏng |
| Thanh khoản | Bán nhanh hay chậm |
| Yêu cầu | Kỹ năng để vận hành tốt, địa vị để sở hữu |
| Pixel layer | Hiển thị gì lên cảnh |


### 5.2 Mức sống — một lựa chọn chạm năm hệ thống
Người chơi chọn mỗi năm: Khổ cực · Đạm bạc · Đủ đầy · Sung túc · Xa hoa. Ảnh hưởng đồng thời: chi phí, sức khỏe, tinh thần, danh tiếng (quý tộc sống đạm bạc bị khinh), triển vọng hôn nhân của con, và cảnh pixel.

### 5.3 Kinh tế hộ nông dân
Ruộng đất: cây trồng theo mùa và đất, luân canh, phân bón, mương, trâu.
Phân bổ sức lao động: ai ra đồng, ai làm thuê, ai đi học, ai chăm người ốm.
Kho lương: ăn, bán, giữ giống, tích trữ phòng đói.
Quyết định khó: cho con đi học (mất một lao động) hay giữ lại làm ruộng?

## 6. Quan hệ xã hội
Opinion = tổng các modifier có thời hạn (mô hình đã được CK3 chứng minh):
Bá hộ Lý → bạn: +23
+30  Bạn cứu con ông ấy (giảm dần, hết sau 20 năm)
+10  Cùng tính Tham vọng
-15  Bạn từ chối gả con gái cho con ông (giảm dần)
-2   Khác tầng lớp
Loại quan hệ tách khỏi opinion: bạn, thù, người yêu, bảo trợ, đồng minh, chủ nợ, ân nhân, đồng hương.
Memory sinh modifier. Ký ức quan trọng (“bạn giết cha tôi”) truyền cho con ở dạng yếu hơn → mối thù kéo dài thế hệ.

### 6.1 Quyền lực mềm

| Cơ chế | Mô tả | Ở tầng nông dân |
| --- | --- | --- |
| Ân tình | Ai giúp bạn → bạn nợ họ; họ có thể đòi vào lúc bất tiện nhất | Vay thóc mùa giáp hạt |
| Nắm thóp (Hook) | Biết bí mật hoặc được nợ ân tình → ép người khác làm theo | “Tôi biết anh trộm lúa nhà lý trưởng” |
| Bí mật | Con ngoài giá thú, phạm tội cũ, tham ô, theo tà giáo | Từng làm cướp |
| Mưu sự (Scheme) | Hành động kéo dài, có tiến độ và rủi ro lộ | Tán tỉnh, vận động làng chống tăng tô |
| Uy hiếp (Dread) | Cai trị bằng sợ hãi | Côn đồ, địa chủ khét tiếng |


## 7. Gia đình, Hôn nhân và Thừa kế
Con cái:
0–5 tuổi: chủ yếu ngẫu nhiên + sức khỏe; tử vong trẻ em là rủi ro thật.
6–15 tuổi: người chơi chọn hướng giáo dục (gửi học, theo cha làm nghề, gửi làm con nuôi quý tộc...).
16+: con có Focus và đời riêng, do AI điều khiển nhưng chịu ảnh hưởng gia đình.
Hôn nhân:
Chợ hôn nhân phụ thuộc địa vị, hồi môn, danh tiếng, tính cách, hấp dẫn.
Hôn nhân tạo liên kết giữa hai gia tộc (opinion, nghĩa vụ, quyền thừa kế chéo).
Thể chế quyết định: một vợ một chồng hay thê thiếp, ly hôn được hay không, cha mẹ sắp đặt hay tự chọn.
Thừa kế:
Luật thừa kế theo khuôn văn minh: con trưởng hưởng hết, chia đều, theo di chúc, ruộng hương hỏa.
Luật chia đều → phân nhánh gia tộc, cạnh tranh nội bộ, rất giàu câu chuyện.
Người thừa kế nhận: tài sản và nợ, tước vị nếu đủ điều kiện, danh tiếng, đồng minh và kẻ thù, tranh chấp chưa giải quyết. Không nhận kỹ năng.
Hậu cung: chỉ xuất hiện ở thể chế phù hợp. Không phải phi tần nào cũng tranh đấu: có người không muốn tham gia chính trị, có người tham vọng, có người chỉ muốn an toàn cho con. Mâu thuẫn phải có nguyên nhân từ quan hệ và quyền lợi. Thiết kế tập trung vào chính trị và kế vị để giữ xếp hạng độ tuổi phù hợp.

## 8. Thang địa vị xã hội
Không phải một thang duy nhất mà là mạng lưới (chi tiết ở Tài liệu 04). Thang chung minh họa cho khuôn phong kiến:
Nô lệ/Nông nô → Nông dân tự do → Thợ/Tiểu thương → Thương nhân → Thân hào/Hiệp sĩ
→ Nam tước → Bá tước → Công tước → Vua → Hoàng đế
Mỗi bậc có cổng với nhiều con đường: quân công, mua (tiền + quan hệ + thể chế cho phép), hôn nhân, thời cơ (khủng hoảng kế vị, nổi loạn thắng, triều đình thiếu người), khoa cử (khuôn Nho giáo).
Cơ hội thăng tiến chủ yếu đến từ biến động thế giới, không phải cày chỉ số. Thời bình xã hội cứng nhắc; thời loạn anh hùng xuất hiện.
Tỷ lệ cơ động xã hội là thông số cân bằng quan trọng nhất: người chơi có kỹ năng, xuất phát nông dân, có khoảng 30–50% khả năng đưa gia tộc lên tầng quý tộc thấp trong 3–4 đời.

## 9. Hệ thống Thời cơ (cơ chế đặc trưng)

### 9.1 Thế giới có biến trạng thái “trôi”
Giá cả: lúa rẻ sau thu hoạch, đắt mùa giáp hạt, cực đắt khi mất mùa.
Khí hậu chính trị: lãnh chúa mạnh hay yếu, triều đình ổn hay rối.
Tâm trạng NPC: cha vợ tương lai vừa được mùa hay vừa mất bò.
Mùa vụ: nông nhàn rảnh người, mùa gặt thiếu tay.
Dư luận: làng vừa qua nạn đói dễ nổi giận hơn.

### 9.2 Cùng hành động, kết quả khác hoàn toàn

| Hành động | Đúng thời điểm | Sai thời điểm |
| --- | --- | --- |
| Bán lúa tích trữ | Trước mất mùa → giàu to | Sau thu hoạch → lỗ |
| Cầu hôn | Nhà kia đang cần liên minh → đồng ý | Họ vừa được gả cao hơn → bị từ chối, mất mặt |
| Kêu gọi nổi dậy | Lãnh chúa đi chinh chiến, dân đói → thành công | Quân đang ở nhà → bị dập, cả làng bị trừng phạt |
| Xin tăng lương | Chủ vừa trúng lớn → được | Chủ đang nợ → bị đuổi |
| Tố cáo quan tham | Cấp trên đang thanh trừng phe hắn → được thưởng | Hắn đang được sủng ái → bị vu oan |
| Mở cửa hàng | Thị trấn đang phát triển → lời | Sắp có dịch → phá sản |


### 9.3 Đọc thời cơ
Tin đồn (có thể sai): “Nghe nói quân lãnh chúa sắp ra trận phía bắc...”
Dấu hiệu môi trường: trời hạn kéo dài, giá lúa nhích, người lạ xuất hiện nhiều.
Kỹ năng làm kính lúp: Mưu lược → tin đồn chính xác hơn; Thương mại → dự đoán giá tốt hơn.
Quan hệ là nguồn tin: bạn làm lính gác lâu đài biết lịch quân đội.
Thông tin trở thành tài nguyên. Người giỏi là người có nguồn tin tốt và biết chờ.

### 9.4 “Chưa phải lúc” là một lựa chọn
Nhiều sự kiện có phương án hoãn, giữ cơ hội mở, nhưng cơ hội có thời hạn; chờ quá lâu thì mất hoặc người khác chớp lấy. Đánh đổi: hành động sớm (ít thông tin) và hành động muộn (có thể mất cơ hội).

## 10. Quyền lực, Chính trị và Quân sự

### 10.1 Chính trị
Ghế chức vụ: hiệu quả = kỹ năng × trung thành × (1 – tham nhũng).
Chính danh (Legitimacy / Thiên mệnh): giảm khi thua trận, cướp ngôi, vi phạm luật, thiên tai (khuôn Nho giáo); tăng khi trị vì lâu, chiến thắng, công trình.
Ủng hộ các phe: quý tộc, giáo sĩ/sĩ phu, thương nhân, quân đội, dân chúng.
Phe phái: NPC bất mãn tự tập hợp theo mục tiêu; đủ mạnh → tối hậu thư → nổi loạn.
Chi phí quyền lực tăng theo quy mô: nhiều chư hầu → nhiều phe → nhiều sự kiện triều đình. Cơ chế chống snowball tự nhiên.

### 10.2 Quân sự (trừu tượng hóa)
Đội quân: quân số, chất lượng, sĩ khí, hậu cần, chỉ huy.
Chiến tranh: chiếm vùng, công thành theo thời gian, war score, đàm phán.
Trận đánh: tự giải quyết bằng công thức + vài lựa chọn chiến thuật (tấn công, phòng thủ, mai phục, rút lui) → micro-cutscene đúng kết quả.
Tướng có thể lập công, bất tuân, phản bội. Người chơi điều khiển chiến lược và mệnh lệnh, không điều từng binh sĩ.

### 10.3 Ngoại giao
Liên minh, thương mại, hôn nhân chính trị, cống nạp/triều cống, bảo hộ, gây sức ép, tranh chấp biên giới, ngừng chiến, hòa ước.

## 11. Hệ thống Nổi dậy từ dưới lên (cơ chế đặc trưng)

### 11.1 Bất mãn tích tụ (Grievance)
Mỗi vùng/làng có mức bất mãn tăng từ: thuế nặng, tô cao, mất mùa, đói, lãnh chúa tàn ác, lao dịch, bắt lính, bất công lặp lại (ký ức tập thể), tin nơi khác nổi dậy thành công. Giảm khi: được mùa, giảm thuế, cứu trợ, lãnh chúa nhân từ, hoặc bị đàn áp (sợ hãi tăng, thù hận ngầm tích tụ).

### 11.2 Tám giai đoạn
1. CĂM PHẪN    Dân bất mãn, người chơi nhận ra cơ hội
2. KẾT NỐI     Bí mật tìm người cùng chí hướng
3. TỔ CHỨC     Lập nhóm, tích vũ khí, lương thực, chọn thủ lĩnh
4. CHỜ THỜI    Đợi lãnh chúa yếu, đi vắng, có biến
5. KHỞI NGHĨA  Chiếm kho lương, giết quan, chiếm lâu đài
6. LAN RỘNG    Các làng khác hưởng ứng hay không
7. KẾT CỤC     Bị dập · Thương lượng · Thắng lợi · Kéo dài thành nội chiến
8. HẬU NỔI DẬY Thắng: cai trị thế nào? Thua: trốn, bị xử, gia đình liên lụy

### 11.3 Bí mật và Lòng tin
Mỗi người được rủ vào có mức tin cậy và động cơ (thù lãnh chúa, muốn đất, sợ hãi, tham tiền).
Thêm người → lực lượng mạnh hơn nhưng rủi ro lộ cao hơn.
Có thể có kẻ chỉ điểm (bị mua chuộc, bị đe dọa, vốn là tay sai).
Người chơi có thể thử lòng, chia ô bí mật (mỗi người chỉ biết vài người), xử lý kẻ phản bội.
Lộ trước khi sẵn sàng → bị đàn áp khi chưa đủ lực: “đúng việc sai thời điểm” kinh điển.

### 11.4 Thắng lợi chưa phải là hết
Chính danh: quý tộc xung quanh không công nhận, có thể liên minh đánh lại.
Lời hứa với dân: hứa chia ruộng, giảm thuế — giữ được không?
Đồng đội cũ đòi phần thưởng, có người muốn thay bạn.
Mô hình cai trị: tự xưng lãnh chúa, hội đồng làng, quy phục vua khác đổi lấy công nhận.
Người anh hùng có thể thành bạo chúa mới.
NPC cũng nổi dậy. Người chơi phải chọn: theo, đứng ngoài hay tố giác.

## 12. Quản lý fractal và ủy quyền (cơ chế đặc trưng)

### 12.1 Cùng 5 yếu tố ở mọi tầng

| Yếu tố | Nông dân | Thương nhân | Lãnh chúa | Vua |
| --- | --- | --- | --- | --- |
| Nguồn lực | Ruộng, lương thực | Hàng hóa, vốn | Đất phong, thuế | Ngân khố |
| Con người | Gia đình | Nhân công, đối tác | Chư hầu, quan lại | Triều đình, tướng |
| Rủi ro | Thời tiết, bệnh | Giá cả, cướp | Nổi loạn, chiến tranh | Phe phái, ngoại xâm |
| Đầu tư | Trâu, mương | Thương đoàn, cửa hàng | Thành lũy, chợ | Đường sá, cải cách |
| Quan hệ | Láng giềng, chủ đất | Thương hội, quan thuế | Lãnh chúa trên, dân | Ngoại bang, quý tộc |

Người chơi học logic quản lý ở tầng thấp, logic đó mở rộng tự nhiên khi lên cao: sâu mà không khó học.

### 12.2 Ủy quyền ở mọi tầng
Nút “Để người khác lo”: vợ quản kho lương, quản gia quản điền trang, tể tướng quản triều chính.
Người được ủy quyền làm theo năng lực và tính cách: tốt hơn bạn, kém hơn bạn, hoặc lợi dụng.
Người chơi chọn mức can thiệp: thích quản lý chi tiết thì tự làm, thích sống thì giao việc.

## 13. Các hệ thống chiều sâu bổ sung

| Hệ thống | Nội dung |
| --- | --- |
| Thông tin | Không biết mọi thứ; thông tin có độ tin cậy, có thể bị cài; thu thập qua quan hệ, gián điệp, kỹ năng, tiền |
| Danh tiếng theo nhóm | Làm vừa lòng nhóm này có thể mất lòng nhóm kia |
| Sức khỏe chi tiết | Bệnh có giai đoạn, lây lan, mạn tính; thương tật vĩnh viễn đổi con đường đời; tâm bệnh ảnh hưởng hành vi |
| Tín ngưỡng, phong tục | Lễ hội, cấm kỵ, kiêng húy; vi phạm bị xã hội trừng phạt |
| Pháp luật | Quyền sở hữu, thừa kế, nghĩa vụ, hình phạt; khác nhau theo thể chế |
| Thiên tai | Lũ, hạn, động đất, cháy, dịch, mất mùa; đầu tư thủy lợi, kho lương, cứu trợ làm giảm thiệt hại |


## 14. Chuỗi va chạm hệ thống (ví dụ)
Luật chia đều tài sản → các con đều có đất → anh em ghét nhau → em trai mưu ám sát anh → anh chết → cháu 6 tuổi kế vị → nhiếp chính lạm quyền → chư hầu nổi loạn.
Không ai viết sẵn chuỗi này. Nó tự xảy ra vì luật thừa kế, opinion, tính cách, mưu sự và nhiếp chính cùng vận hành. Đây là thước đo chiều sâu của game.