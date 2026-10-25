# 04_He_Thong_Nghe_Nghiep.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 04 · Nghề nghiệp & Con đường
Core nghề lắp ghép, mở rộng vô hạn bằng dữ liệu

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Kiến trúc nghề, hợp đồng nghề, Tổ chức, thừa kế nghề, Dự nghiệp, nghề mẫu |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Mục tiêu
2. Bốn lớp của một con đường
3. Bổn phận và Lối sống
3.1 Bổn phận (Duties) của vai trò
3.2 Quỹ tâm sức có hạn
3.3 Bỏ bê có hậu quả, nhưng có thể ủy quyền
4. Kiến trúc: lắp ghép thành phần
5. Hợp đồng nghề (Career Contract)
6. Tổ chức — xương sống của nghề
7. Thừa kế nghề
7.1 Gia nghiệp
7.2 Con có thể từ chối nghề cha
8. Sự kiện theo nghề
9. Hệ sinh thái nghề
10. Dự nghiệp — lập ra cái mới
11. Bản đồ chuyển nghề
12. Chống lối mòn
13. Cấp độ sâu của nghề
14. Danh mục nghề định hướng
15. Nghề cho Giai đoạn 1

## 1. Mục tiêu
Không phải ai cũng muốn làm vua. Có người làm vua chỉ vì hậu cung, có người vì chinh chiến, có người chỉ muốn làm nam tước chăm lãnh địa nhỏ, có người làm lính, thương gia, thảo khấu, cướp biển, có người khai hoang lập đất mới hay dựng triều đại riêng.
Core nghề nghiệp phải:
Cho phép rất nhiều con đường, mỗi đường có sự kiện riêng.
Thêm nghề mới mà không sửa lõi (chủ yếu thêm dữ liệu).
Quy định rõ nghề có gì, truyền lại được gì.

## 2. Bốn lớp của một con đường
“Vua” chưa phải con đường, chỉ là vị trí. Con đường = tổ hợp bốn lớp độc lập:

| Lớp | Câu hỏi | Ví dụ |
| --- | --- | --- |
| Thân phận (Status) | Xã hội xếp bạn ở đâu? | Nông nô, dân tự do, quý tộc, hoàng tộc, kẻ ngoài vòng pháp luật |
| Vai trò (Role) | Bạn đang giữ việc/chức gì? | Nông dân, thương nhân, lính, tướng, nam tước, vua, cướp biển |
| Lối sống (Passion) | Bạn thích dành thời gian cho gì? | Hậu cung, chinh chiến, cai trị, làm giàu, học thuật, ăn chơi |
| Dự nghiệp (Venture) | Bạn đang xây gì lớn? | Khai hoang lập ấp, lập thương hội, lập băng hải tặc, dựng triều đại |

Ví dụ tổ hợp:
Vua + Hậu cung → triều chính bỏ bê, phi tần tranh sủng, nhiều con, khủng hoảng kế vị.
Vua + Chinh chiến → mở rộng lãnh thổ, ngân khố cạn, ít ở nhà, con cái xa cách.
Nam tước + Cai trị → lãnh địa nhỏ thịnh vượng, không quan tâm triều đình.
Thương nhân + Khai hoang → mua đất hoang, đưa dân đến, lập làng mới.
Ngoài vòng pháp luật + Cướp biển + Lập hải đảo → từ băng cướp thành tiểu quốc.
Số con đường nhân lên theo tổ hợp, không phải viết tay từng cái.

## 3. Bổn phận và Lối sống

### 3.1 Bổn phận (Duties) của vai trò
Vua lo triều chính, thuế, quốc phòng, kế vị. Nam tước nộp thuế và quân cho lãnh chúa. Thuyền trưởng chia chiến lợi phẩm, giữ lòng thủy thủ.

### 3.2 Quỹ tâm sức có hạn
Vua A (Lối sống: Hậu cung)
Hậu cung    ██████████  50%
Triều chính ████        20%
Quân sự     ██          10%
Gia đình    ████        20%

### 3.3 Bỏ bê có hậu quả, nhưng có thể ủy quyền
Bỏ bê triều chính → tể tướng nắm quyền; giỏi và trung thành thì nước vẫn ổn, tham thì lũng đoạn.
Bỏ bê quân sự → tướng tự quyết; lập công hoặc lộng quyền.
Lối sống có phần thưởng riêng: vua hậu cung có tinh thần cao, nhiều con (nhiều lựa chọn kế vị), liên minh qua gia tộc phi tần; vua chinh chiến có danh tiếng, lãnh thổ, kỹ năng quân sự.
Không có lối sống sai, chỉ có lối sống với cái giá khác nhau. Một vị vua chỉ biết hậu cung vẫn có thể trị vì yên ổn 40 năm nếu chọn đúng tể tướng.

## 4. Kiến trúc: lắp ghép thành phần
Không dùng kế thừa cứng (cướp biển vừa giống thương nhân vừa giống lính, không biết kế thừa từ ai). Dùng lắp ghép: core cung cấp bộ thành phần chuẩn, mỗi nghề là tổ hợp thành phần + dữ liệu + sự kiện.
┌────────────────────────────────────────────────────────────┐
│ TẦNG 3 — GÓI NGHỀ (Content Pack, chỉ là dữ liệu)           │
│ Nông dân · Thương nhân · Lính · Tướng · Nam tước · Vua     │
│ Cướp biển · Thảo khấu · Tu sĩ · Thầy thuốc · Thợ rèn ...   │
├────────────────────────────────────────────────────────────┤
│ TẦNG 2 — THÀNH PHẦN NGHỀ (code tái sử dụng, khối Lego)     │
│ Thang bậc · Tổ chức · Lãnh thổ · Đội quân · Hạm đội        │
│ Tuyến buôn · Kho hàng · Xưởng · Truy nã · Hậu cung         │
│ Học trò · Khách hàng · Bổn phận · Dự nghiệp · Hang ổ       │
├────────────────────────────────────────────────────────────┤
│ TẦNG 1 — CORE ENGINE                                       │
│ Nhân vật · Kỹ năng · Tính cách · Kinh tế · Tài sản         │
│ Quan hệ · Sự kiện · Thời gian · Rủi ro · Danh tiếng        │
│ Pháp luật · Modifier · Điều kiện · Thừa kế                 │
└────────────────────────────────────────────────────────────┘

| Nghề | Thành phần sử dụng |
| --- | --- |
| Nông dân | Ruộng đất · Hộ gia đình · Làng (Tổ chức) · Bổn phận (thuế, lao dịch) |
| Thương nhân | Kho hàng · Tuyến buôn · Thương hội (Tổ chức) · Khách hàng |
| Lính | Thang bậc quân đội · Đơn vị (Tổ chức) · Bổn phận (mệnh lệnh) |
| Tướng | Thang bậc quân đội · Đội quân · Bổn phận · Quan hệ triều đình |
| Nam tước | Lãnh thổ · Thái ấp (Tổ chức) · Bổn phận chư hầu · Triều nhỏ |
| Vua | Lãnh thổ · Triều đình · Đội quân · Hậu cung · Bổn phận quốc gia |
| Cướp biển | Hạm đội · Băng (Tổ chức) · Truy nã · Hang ổ · Chia chiến lợi phẩm |
| Thảo khấu | Băng (Tổ chức) · Truy nã · Hang ổ · Lãnh thổ ngầm |
| Thợ rèn | Xưởng · Khách hàng · Học trò · Phường hội |
| Người khai hoang | Dự nghiệp · Lãnh thổ mới · Làng mới (Tổ chức) |
| Sĩ tử / Quan văn | Thang bậc khoa cử · Phẩm hàm · Bổn phận · Luân chuyển |

Cướp biển và Thảo khấu dùng chung gần hết thành phần, chỉ khác Hạm đội và địa hình. Viết một thành phần tốt thì nhiều nghề cùng hưởng.

## 5. Hợp đồng nghề (Career Contract)
Mỗi nghề phải khai báo đủ bảng sau. Điền đủ là nghề chạy được trong game.

| Mục | Ý nghĩa | Ví dụ: Cướp biển |
| --- | --- | --- |
| Định danh | Tên, nhóm, thời đại, khuôn văn minh | Ngoài vòng pháp luật · Trung cổ–Cận đại · Vùng ven biển |
| Cổng vào | Cách trở thành | Gia nhập băng · Cướp thuyền · Thủy thủ nổi loạn · Bị truy nã chạy ra biển |
| Thang bậc | Các cấp trong nghề | Thủy thủ → Đầu lĩnh → Thuyền phó → Thuyền trưởng → Chúa biển |
| Điều kiện thăng bậc | Cách lên cấp | Uy tín trong băng + chiến công + lòng phục của thủy thủ |
| Hành động | Việc làm thường ngày | Cướp thuyền buôn · Đột kích làng · Bán hàng chợ đen · Sửa thuyền · Chia chiến lợi |
| Tài nguyên riêng | Chỉ nghề này có | Thuyền · Thủy thủ · Tiếng tăm hải tặc · Mức truy nã · Hang ổ |
| Thu nhập / chi phí | Kinh tế nghề | Chiến lợi phẩm thất thường · Lương, rượu thủy thủ · Sửa thuyền |
| Kỹ năng dùng | Kỹ năng liên quan | Quân sự · Sinh tồn (hàng hải) · Mưu lược |
| Cây chuyên môn | Perk riêng | Hải chiến · Đe dọa · Buôn lậu · Thủ lĩnh |
| Rủi ro | Nguy cơ đặc thù | Hải quân truy đuổi · Bão · Thủy thủ nổi loạn · Treo cổ |
| Kho sự kiện | Sự kiện riêng | Kho báu · Phản loạn trên tàu · Đề nghị chiêu an · Gặp đối thủ |
| Lối ra | Chuyển sang nghề khác | Chiêu an → Đô đốc · Giải nghệ → Chủ quán · Lập đảo → Lãnh chúa |
| Luật thừa kế | Truyền lại gì | Xem mục 7 |
| AI | NPC cùng nghề hành xử | Cướp mục tiêu yếu, tránh hải quân, phản bội khi có lợi |
| Giao diện | Tab/nút mở ra | Bảng hạm đội · Bản đồ tuyến biển · Bảng băng cướp |
| Pixel scene | Cảnh hiển thị | Boong tàu · Hang ổ trên đảo · Cảng chợ đen |
| Độ sâu | Nhẹ / Vừa / Sâu | Sâu |


## 6. Tổ chức — xương sống của nghề
Phần lớn nghề là vai trò trong một tổ chức: lính trong đơn vị, thương nhân trong thương hội, cướp biển trong băng, vua đứng đầu vương quốc, phi tần trong hậu cung, tu sĩ trong tu viện, nông dân trong làng.
Hệ thống Tổ chức chung gồm:

| Thành phần | Mô tả |
| --- | --- |
| Thành viên, chức vụ | Ai giữ vị trí gì |
| Thang bậc, quy tắc thăng tiến | Cách lên chức trong tổ chức |
| Ngân quỹ chung | Tài sản của tổ chức |
| Danh tiếng tổ chức | Được nể hay bị ghét |
| Mục tiêu | Tổ chức đang theo đuổi gì |
| Lòng trung thành | Thành viên trung với tổ chức / thủ lĩnh |
| Kế vị lãnh đạo | Vua truyền ngôi; băng cướp bầu hoặc ai mạnh thì thắng; thương hội bỏ phiếu |
| Quan hệ đối ngoại | Đồng minh, thù địch, cấp trên–cấp dưới |

Khi đã có hệ thống Tổ chức, “tự lập băng cướp”, “lập thương hội”, “dựng triều đại” chỉ là tạo một tổ chức mới với mình đứng đầu. Một cơ chế cho mọi tham vọng lập nghiệp.

## 7. Thừa kế nghề

| Loại | Truyền được? | Ví dụ |
| --- | --- | --- |
| Tài sản nghề | Có, theo luật thừa kế | Xưởng rèn, thuyền, cửa hàng, ruộng |
| Tước vị | Có, theo luật kế vị | Nam tước, ngai vàng |
| Tổ chức | Có điều kiện | Băng cướp theo con nếu thủy thủ phục, không thì họ bầu người khác |
| Danh tiếng nghề | Một phần | “Con danh tướng” được nể vài năm đầu, rồi phải tự chứng minh |
| Quan hệ, mối làm ăn | Yếu đi | Khách quen, đối tác của cha cần giữ gìn lại |
| Bí quyết nghề | Có, nếu đã dạy | Công thức rèn, tuyến buôn bí mật, bản đồ kho báu |
| Kẻ thù, nợ máu | Thường truyền | Hải quân vẫn truy nã con của chúa biển |
| Kỹ năng | Không | Con tự học (nhanh hơn nếu cha dạy) |
| Cấp bậc do công trạng | Không | Con tướng không tự thành tướng |
| Lòng trung thành cá nhân | Không | Thủy thủ trung với cha, chưa chắc với con |


### 7.1 Gia nghiệp
Dòng họ làm một nghề qua nhiều đời hình thành gia nghiệp:
“Họ Trần ba đời thợ rèn” → con cháu học nhanh, khách tin, có bí quyết.
“Họ Lê bốn đời làm tướng” → dễ vào quân, nhiều quan hệ quân đội.
“Họ Ngô nổi tiếng hải tặc” → bị truy lùng nhưng được giang hồ nể.

### 7.2 Con có thể từ chối nghề cha
Con tướng có thể Nhút nhát và thích đọc sách. Người chơi chọn: ép con theo nghề (stress, hiệu quả thấp, có thể oán cha), để con theo đam mê (mất gia nghiệp nhưng con hạnh phúc), hoặc chọn người thừa kế khác hợp nghề hơn.

## 8. Sự kiện theo nghề
Mỗi sự kiện mang thẻ để engine biết lúc nào chọn:
Sự kiện: "Đề nghị chiêu an"
Thẻ nghề:      cướp_biển, thảo_khấu
Thẻ bậc:       thuyền_trưởng+
Thẻ lối sống:  bất kỳ
Điều kiện:     Tiếng tăm > X, triều đình đang thiếu quân biển

| Kho | Ai nhận | Ví dụ |
| --- | --- | --- |
| Chung | Mọi người | Bệnh, cưới hỏi, sinh con, tang lễ |
| Theo nghề | Người làm nghề đó | Thương nhân mất hàng; lính ra trận |
| Theo bậc | Người ở cấp đó | Thuyền trưởng: thủy thủ đòi chia thêm |
| Theo lối sống | Người có đam mê đó | Vua hậu cung: phi tần tranh sủng |
| Giao thoa nghề | Khi hai nghề gặp nhau | Thương nhân gặp cướp biển; lính gặp thảo khấu là bạn thơ ấu |

Thêm nghề mới → thêm kho sự kiện riêng + vài sự kiện giao thoa. Nghề cũ không cần sửa mà vẫn có thêm nội dung.

## 9. Hệ sinh thái nghề
thuế                    bảo vệ
Vua ────────→ Thương nhân ←──────── Hải quân / Lính
↑               ↓ ↑                     ↓
cống nạp     hàng hóa  cướp            truy đuổi
│               ↓ ↑                     ↓
Nam tước ←── Thợ thủ công     Cướp biển / Thảo khấu
↑  lương thực                           ↑
│                                  bất mãn, đói
Nông dân ─────────────────────────────────┘
Cướp biển nhiều → thương nhân lỗ → giá tăng → vua tăng quân biển → thuế tăng → nông dân bất mãn → nhiều người đi làm cướp hơn.
Mất mùa → nông dân đói → thảo khấu tăng → thương nhân lương thực lãi to → lãnh chúa khó thu thuế.
Chiến tranh → lính được trọng → thợ rèn lãi → thương nhân rủi ro → nông dân bị bắt lính.
Chọn nghề là chọn chỗ đứng trong hệ sinh thái.

## 10. Dự nghiệp — lập ra cái mới
Dự nghiệp là dự án lớn nhiều giai đoạn, kết quả là một tổ chức hoặc lãnh thổ mới.
Dự nghiệp: KHAI HOANG LẬP ẤP
1. Tìm đất           thám thính, chọn vùng (đất tốt thì xa và nguy hiểm)
2. Xin phép/Bất chấp  xin lãnh chúa (nộp thuế) hoặc tự ý (rủi ro bị đánh)
3. Chiêu mộ          dân nghèo, người trốn nợ, gia đình mình
4. Khai phá          phá rừng, đào mương, dựng nhà (nhiều năm, tốn công)
5. Tồn tại           thú dữ, bệnh, thổ dân, thảo khấu, mất mùa đầu
6. Thành hình        làng mới ra đời, bạn là trưởng làng / chủ ấp; người chơi đặt tên
7. Phát triển        mở rộng, có thể thành thị trấn, lãnh địa
Cùng khung: lập băng cướp/hải tặc, lập thương hội, thương đoàn xuyên vùng, lập môn phái/trường học/tu viện, xưng vương, dời đô. Dự nghiệp có thể kéo dài nhiều đời: ông khai hoang, cha mở làng, cháu thành thị trấn.

## 11. Bản đồ chuyển nghề
Nông dân ─đi lính→ Lính ─lập công→ Đội trưởng → Tướng ─phong tước→ Nam tước
│                │                            │
│             đào ngũ                      phản loạn
│                ↓                            ↓
├─vào rừng→ Thảo khấu ─chiêu an→ Quan quân  Lãnh chúa tự xưng → Vua
│                                             │
│            ra biển
│                ↓
├─đi biển→ Thủy thủ ─nổi loạn→ Cướp biển ─chiêu an→ Đô đốc
│                                  │ lập đảo → Lãnh chúa
├─buôn bán→ Tiểu thương → Thương nhân ─mua tước→ Quý tộc nhỏ
│                           │ khai hoang
├─khai hoang────────────→ Chủ ấp mới → Lãnh chúa
├─đi học→ Sĩ tử ─đỗ đạt→ Quan văn → Đại thần
└─đi tu→ Tăng/Tu sĩ → Trụ trì → Quốc sư
Mỗi mũi tên là dữ liệu chuyển đổi (điều kiện, sự kiện kích hoạt, hệ quả). Thêm nghề = thêm điểm và mũi tên. Mọi đường đều đi ngang, đi lùi, rẽ nhánh được: thương nhân phá sản quay lại làm thuê; tướng thất sủng về làng làm ruộng.

## 12. Chống lối mòn

| Kỹ thuật | Mô tả |
| --- | --- |
| Đường tối ưu theo nhân vật | Can đảm + Khỏe hợp đi lính; Thông minh + Thận trọng hợp buôn; ép người Nhút nhát đi lính → stress, dễ chết |
| Đường tối ưu theo thời thế | Thời chiến: lính; thời bình: buôn; thời loạn: nổi dậy, thảo khấu; thời dịch: thầy thuốc |
| Lực phản kháng | Giàu → bị ghen, quan tham để ý, cướp nhắm; quyền lớn → nhiều phe chống; nổi tiếng → bị lôi vào tranh chấp |
| Lợi ích giảm dần | Đầu tư mãi một hướng kém hiệu quả; đa dạng hóa ổn định hơn |
| Đánh đổi thật | Đi tu không lấy vợ (tùy tôn giáo); làm thảo khấu mất danh tiếng lương thiện; làm quan mất tự do |
| Đường mở từ sự kiện | Gặp thầy thuốc giang hồ nhận làm đệ tử; cứu người lạ là hoàng tử lưu vong; bị oan thành kẻ truy nã |

Con đường = tổ hợp hệ thống, không phải kịch bản. Thảo khấu = Danh tiếng lương thiện thấp + Uy hiếp cao + Tài sản cướp được + Bị truy nã + Mạng lưới giang hồ + Hang ổ. Nghề “hình thành” khi người chơi liên tục chọn cướp bóc.

## 13. Cấp độ sâu của nghề

| Cấp | Nội dung | Dùng cho |
| --- | --- | --- |
| Nhẹ | Thu nhập + vài kỹ năng + 5–10 sự kiện | Nghề phụ, nghề NPC (chủ quán, người chèo đò) |
| Vừa | + Thang bậc + hành động riêng + 20–30 sự kiện | Nghề phổ biến (thợ rèn, thầy thuốc) |
| Sâu | + Thành phần riêng + cây chuyên môn + dự nghiệp + 50+ sự kiện + UI riêng | Nghề chủ lực (thương nhân, tướng, vua, cướp biển, sĩ tử) |

Nghề có thể ra mắt ở cấp Nhẹ rồi nâng dần qua các bản cập nhật.

## 14. Danh mục nghề định hướng

| Nhóm | Nghề |
| --- | --- |
| Nông nghiệp | Tá điền, nông dân, địa chủ, người chăn nuôi, ngư dân |
| Thủ công | Thợ rèn, thợ mộc, thợ gốm, thợ dệt, thợ xây |
| Thương mại | Bán rong, chủ cửa hàng, thương nhân đường dài, chủ thuyền buôn, người cho vay |
| Quân sự | Lính, đội trưởng, võ quan, tướng, lính đánh thuê |
| Cai trị | Lý trưởng, nha lại, quan văn, nam tước, lãnh chúa, vua, hoàng đế |
| Học thuật, tôn giáo | Học trò, thầy đồ, sĩ tử, học giả, tăng ni, tu sĩ, giáo sĩ, đạo sĩ |
| Chuyên môn | Thầy thuốc, thầy địa lý, thầy bói, nghệ nhân, hát rong |
| Cung đình | Phi tần, hoạn quan, cung nữ, quan hầu cận |
| Ngoài vòng pháp luật | Thảo khấu, cướp biển, buôn lậu, gián điệp, sát thủ |
| Người lập nghiệp | Người khai hoang, thủ lĩnh nổi dậy, người dựng triều đại |

Nghề cụ thể phụ thuộc khuôn văn minh và thời đại (Tài liệu 07).

## 15. Nghề cho Giai đoạn 1

| Nghề | Cảm giác chơi | Thành phần kiểm chứng |
| --- | --- | --- |
| Nông dân | Sinh tồn, xây dựng chậm, cộng đồng | Ruộng · Hộ · Làng |
| Thương nhân | Đánh cược, đọc thời cơ, làm giàu | Kho · Tuyến buôn · Tổ chức |
| Lính → Tướng | Rủi ro, vinh quang, thăng tiến | Thang bậc · Đội quân |
| Thảo khấu | Tự do, nguy hiểm, ngoài vòng pháp luật | Tổ chức · Truy nã · Hang ổ |

Bốn nghề này dùng gần đủ thành phần quan trọng, nên kiểm chứng được kiến trúc core. Sau đó thêm Cướp biển, Nam tước, Vua, Sĩ tử, Tu sĩ chủ yếu là thêm dữ liệu.