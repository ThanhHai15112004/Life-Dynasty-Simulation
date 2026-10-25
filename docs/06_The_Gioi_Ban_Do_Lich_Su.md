# 06_The_Gioi_Ban_Do_Lich_Su.docx

DÒNG ĐỜI — LEGACY OF AGES
Game Design Document
Tài liệu 06 · Thế giới, Bản đồ & Lịch sử
Sinh ra ở bất kỳ đâu, bất kỳ thời kỳ nào mà dữ liệu vẫn kiểm soát được

| Mục | Thông tin |
| --- | --- |
| Dự án | Dòng Đời — Legacy of Ages (tên tạm) |
| Phạm vi | Bản đồ cấp tỉnh, dòng thời gian chính trị, sinh dân cư, dữ liệu lịch sử, nguồn và giấy phép |
| Phiên bản | 0.1 — Bản nháp tổng hợp từ phân tích |
| Ngày | 25/10/2026 |
| Bộ tài liệu | 10 tài liệu (00–09), xem danh mục trong Tài liệu 00 |

Mục lục
1. Năm khó khăn thật sự
2. Nguyên tắc: địa lý cố định, chính trị là dữ liệu theo thời gian
2.1 Năm lớp bản đồ
2.2 Chính trị chỉ là bảng thời gian
2.3 Thực thể có thứ bậc
2.4 Địa danh có lịch sử tên
3. Độ chi tiết: dừng ở cấp tỉnh
4. Bộ xương lịch sử thật + phần thịt sinh tự động
5. Mức chi tiết theo khoảng cách (Map LOD)
6. Lịch sử thật và lịch sử thay thế
6.1 Lịch sử là điểm xuất phát, không phải đường ray
6.2 Phân loại sự kiện lịch sử
6.3 Thanh trượt “Bám sát lịch sử”
6.4 Nhân vật lịch sử
7. Đi qua mọi thời kỳ: mốc lịch sử (Bookmark)
8. Sinh nhân vật ở bất kỳ đâu
8.1 Trọng số
8.2 Thứ tự sinh
8.3 Sinh lười và có định danh
9. Khối lượng dữ liệu
9.1 Ba cấp hoàn thiện vùng
10. Nguồn dữ liệu
10.1 Bản đồ và dân số
10.2 Sự kiện và nhân vật lịch sử
10.3 Nguyên tắc pháp lý
10.4 Quy trình biên soạn sự kiện lịch sử
11. Nhạy cảm
12. Lộ trình thế giới

## 1. Năm khó khăn thật sự

| Khó khăn | Mô tả |
| --- | --- |
| Số thực thể bùng nổ | Riêng Đế quốc La Mã Thần thánh có hàng trăm lãnh địa; nhân với toàn thế giới và nhiều thế kỷ |
| Biên giới tiền hiện đại không rõ | Vùng đệm, chư hầu nửa độc lập, du mục, quan hệ triều cống |
| Dữ liệu không đồng đều | Châu Âu, Trung Hoa, Trung Đông nhiều ghi chép; nhiều vùng khác ít |
| Lịch sử thật mâu thuẫn mô phỏng | Bám sát thì người chơi không thay đổi được gì; không bám thì dữ liệu phía sau vô dụng |
| Nhạy cảm | Biên giới, chủ quyền, tôn giáo, thuộc địa |


## 2. Nguyên tắc: địa lý cố định, chính trị là dữ liệu theo thời gian
Vẽ một bản đồ địa lý duy nhất, chia thành các tỉnh/vùng cố định, rồi lưu lịch sử dưới dạng “tỉnh nào thuộc về ai, từ năm nào đến năm nào”.

### 2.1 Năm lớp bản đồ

| Lớp | Nội dung | Đổi theo thời gian? |
| --- | --- | --- |
| Địa lý | Địa hình, sông, biển, khí hậu, tài nguyên | Gần như cố định |
| Tỉnh / Vùng | Lưới tỉnh cố định (~2.000 tỉnh toàn cầu) | Cố định |
| Định cư | Kinh thành, thành phố lớn, cảng; năm thành lập và suy tàn | Theo dòng thời gian |
| Văn hóa / Tôn giáo / Khuôn văn minh | Tỉnh này nói tiếng gì, theo đạo gì, dùng khuôn nào | Chậm |
| Chính trị | Tỉnh thuộc thực thể nào, thực thể đó là chư hầu của ai | Nhanh |


### 2.2 Chính trị chỉ là bảng thời gian
Tỉnh: [kinh đô Đại Việt]
939–967    Nhà Ngô
968–980    Nhà Đinh
980–1009   Nhà Tiền Lê
1009–1225  Nhà Lý
1225–1400  Nhà Trần
...
Chọn năm nào, engine tra bảng và tô màu. Không cần vẽ lại bản đồ.

### 2.3 Thực thể có thứ bậc
Thời trung cổ loạn vì quyền lực xếp tầng. Mỗi thực thể chính trị có: cấp bậc (lãnh địa, công quốc, vương quốc, đế quốc, bộ lạc, thành bang...), cấp trên trực tiếp, loại quan hệ (chư hầu, triều cống, bảo hộ, liên minh danh nghĩa). Một vương quốc triều cống vẫn được ghi là độc lập trên thực tế, chỉ có quan hệ triều cống danh nghĩa.

### 2.4 Địa danh có lịch sử tên
[kinh đô Đại Việt]: Đại La (trước 1010) → Thăng Long → Đông Đô (thời Hồ)
→ Đông Quan (Minh thuộc) → Đông Kinh (từ Lê sơ) → ... → Hà Nội (thế kỷ 19)
Game luôn hiển thị tên đúng năm hiện tại; tùy chọn chú thích tên hiện đại (“Đông Kinh (nay là Hà Nội)”).

## 3. Độ chi tiết: dừng ở cấp tỉnh
Địa chỉ nhân vật chỉ cần: Tỉnh/Vùng — Quốc gia — Năm, kèm thẻ thành thị / nông thôn.

| Sinh ra | Hiển thị |
| --- | --- |
| Đại Việt 1250 | Nông thôn, lộ Thiên Trường — Đại Việt, năm 1250 |
| Anh 1250 | Nông thôn, hạt Kent — Vương quốc Anh, năm 1250 |
| Pháp 1250 | Thành thị, Paris — Vương quốc Pháp, năm 1250 |
| Ai Cập 1250 | Thành thị, Cairo — Vương triều Mamluk, năm 1250 |

Dưới cấp tỉnh (làng, xóm) chỉ là tên sinh tự động khi câu chuyện cần, theo quy luật đặt tên của văn hóa và địa hình (ví dụ làng ven sông ưu tiên chữ Giang, Bến; tên Hán-Việt hai chữ tốt lành như An Phú, Vĩnh Thịnh; làng Anh hậu tố -ton, -ham, -by).

## 4. Bộ xương lịch sử thật + phần thịt sinh tự động

| Phần | Nguồn | Ví dụ |
| --- | --- | --- |
| Bộ xương (thật) | Dữ liệu lịch sử biên soạn | Vương triều lớn, kinh đô, vua chúa chính, biên giới lớn, sự kiện lớn |
| Phần thịt (sinh) | Engine sinh theo khuôn văn hóa | Quý tộc nhỏ, quan địa phương, gia đình thường dân, làng xóm |

Chọn Đại Việt năm 1250: lấy từ dữ liệu thật nhà Trần đang trị vì, vua, kinh đô, các lộ chính. Ông lý trưởng, nhà địa chủ, quan huyện được sinh tự động theo khuôn Đại Việt thế kỷ 13. Lịch sử không ghi lại họ nên người chơi không phân biệt được.

## 5. Mức chi tiết theo khoảng cách (Map LOD)

| Khoảng cách | Bản đồ | Mô phỏng |
| --- | --- | --- |
| Tỉnh đang sống | Thành thị/nông thôn, khu định cư chính | Đầy đủ |
| Tỉnh lân cận | Cấp tỉnh | Nhân vật quan trọng + thống kê |
| Cùng quốc gia / khu vực | Cấp vùng lớn | Thế lực lớn + thống kê |
| Xa | Cấp quốc gia / đế quốc | Cường quốc và xu hướng |
| Rất xa | Khối văn minh | Chỉ sự kiện lớn có ảnh hưởng |

Người chơi di chuyển hoặc mở rộng ảnh hưởng → vùng mới được “phóng to”. Nông dân Pháp thế kỷ 11 không biết gì về nhà Lý, nên game không cần mô phỏng chi tiết nhà Lý cho họ.

## 6. Lịch sử thật và lịch sử thay thế

### 6.1 Lịch sử là điểm xuất phát, không phải đường ray
Khởi đầu đúng lịch sử: chọn năm → thế giới dựng theo dữ liệu thật.
Mô phỏng tiếp quản: từ lúc bắt đầu, thế giới tự vận hành.
Lực hút lịch sử (tùy chọn): sự kiện lớn có xu hướng xảy ra nếu điều kiện còn phù hợp.

### 6.2 Phân loại sự kiện lịch sử

| Loại | Ví dụ | Xử lý |
| --- | --- | --- |
| Tự nhiên | Núi lửa lớn, tiểu băng hà, hạn hán lớn | Xảy ra đúng thời điểm (tùy chọn ngẫu nhiên hóa) |
| Cấu trúc | Dịch hạch lan theo tuyến thương mại | Xảy ra nếu điều kiện còn (tuyến buôn, đô thị đông) |
| Thế lực ngoài | Đế quốc Mông Cổ trỗi dậy | Xác suất cao nếu thảo nguyên thống nhất; có thể khác hướng |
| Chính trị cụ thể | Triều đại thay thế triều đại | Chỉ xảy ra nếu nhân vật và hoàn cảnh còn |
| Công nghệ / Tư tưởng | Thuốc súng, in ấn, tôn giáo lan | Lan theo giao thương, tốc độ phụ thuộc thế giới |


### 6.3 Thanh trượt “Bám sát lịch sử”
Bám sát lịch sử ◄══════●══════► Lịch sử tự do
(sự kiện lớn gần        (mặc định)   (lịch sử chỉ là
như chắc chắn)                       điểm xuất phát)

### 6.4 Nhân vật lịch sử
Nhân vật lịch sử đang sống ở năm bắt đầu có trong dữ liệu, kèm quan hệ gia đình.
Người sinh sau năm bắt đầu: chế độ bám sát → “được sinh ra” nếu cha mẹ còn sống và kết hôn đúng lịch sử; chế độ tự do → mọi người do mô phỏng tạo.
Người chơi có thể gặp, kết thân, làm thù, thậm chí thay thế nhân vật lịch sử.

## 7. Đi qua mọi thời kỳ: mốc lịch sử (Bookmark)

| Mốc | Lý do chọn |
| --- | --- |
| ~3000 TCN | Văn minh sông ngòi đầu tiên |
| ~500 TCN | Thời kỳ cổ điển |
| ~1 CN | Các đế chế lớn |
| ~600 | Sau thời kỳ di cư |
| ~1000 | Trung cổ |
| ~1250 | Đỉnh trung cổ, trước Mông Cổ |
| ~1450 | Cuối trung cổ |
| ~1600 | Cận đại |
| ~1800 | Trước công nghiệp hóa |
| ~1900 | Đế quốc thực dân |
| ~1950 | Hậu chiến |

Chọn năm bất kỳ: lấy mốc gần nhất trước đó → áp dụng thay đổi lớn đã lưu giữa hai mốc → sinh phần thịt cho năm đó. Độ chính xác không đồng đều; nên đánh dấu độ tin cậy dữ liệu theo khu vực cho người chơi.
Khi đã bắt đầu, mô phỏng tiếp quản hoàn toàn. Dữ liệu lịch sử chỉ cần cho điểm khởi đầu; quá trình phát triển cần quy luật (khuôn văn minh, cây công nghệ, điều kiện chuyển thời đại).

## 8. Sinh nhân vật ở bất kỳ đâu

### 8.1 Trọng số
Theo dân số lịch sử: sinh ở Trung Hoa phải phổ biến hơn sinh ở một bộ lạc nhỏ. Nguồn: HYDE (lưới dân số toàn cầu ~10.000 TCN đến nay).
Theo tầng lớp: thời trung cổ ~85–90% nông dân; quý tộc rất ít; hoàng tử gần bằng không.

| Chế độ sinh | Cách sinh |
| --- | --- |
| Thực tế | Theo dân số và tầng lớp thật (gần như chắc chắn là nông dân) |
| Ngẫu nhiên cân bằng | Tăng xác suất tầng lớp khác để đa dạng |
| Chọn vùng | Chọn khu vực, ngẫu nhiên phần còn lại |
| Tự chọn | Chọn năm, vùng, tầng lớp, gia đình |


### 8.2 Thứ tự sinh
Mật độ dân tỉnh → Khu định cư (loại: kinh thành, lỵ sở, cảng, làng nghề, làng nông,
bản, đồn binh, chùa...) → Hộ gia đình (tầng lớp theo tỷ lệ loại định cư)
→ Thành viên (họ tên, tuổi theo tháp dân số, tính cách, kỹ năng theo nghề)
Sinh theo hộ, không sinh người lẻ; cấu trúc gia đình theo văn hóa (Việt nhiều thế hệ ở chung; Tây Âu nhiều nơi hạt nhân).
Dòng họ tập trung theo làng: mỗi xã 2–5 họ chính, có quan hệ họ hàng thật → người chơi có mạng lưới họ hàng từ lúc sinh.
Đa dạng trong một quốc gia: người Kinh đồng bằng, dân tộc miền núi, người Chăm, thương nhân nước ngoài ở cảng; mỗi nhóm dùng khuôn văn hóa riêng.

### 8.3 Sinh lười và có định danh

| Trạng thái khu định cư | Dữ liệu lưu |
| --- | --- |
| Chưa ai quan tâm | Tên, loại, dân số, thịnh vượng |
| Đã được “nhìn thấy” | Danh sách hộ và dòng họ chính |
| Người chơi sống/tương tác | Sinh đầy đủ từng người |

Seed khu định cư = seed thế giới + mã định danh → vào lại vẫn đúng người cũ; chỉ lưu thay đổi.

## 9. Khối lượng dữ liệu

| Dữ liệu | Ước tính |
| --- | --- |
| ~2.000 tỉnh × ~12 mốc (tên, chủ, văn hóa, tôn giáo, dân số, phát triển) | Vài MB |
| Thực thể chính trị qua các mốc | Vài nghìn bản ghi |
| Vua chúa, triều đại chính | Vài chục nghìn bản ghi, vài MB |
| Kho tên theo văn hóa | Vài KB–vài chục KB mỗi văn hóa |
| Tổng | Vài chục MB |

Dữ liệu bản đồ và lịch sử không lớn. Cái thật sự lớn là nội dung văn hóa, xử lý bằng khuôn văn minh dùng chung (Tài liệu 07) và ba cấp hoàn thiện vùng.

### 9.1 Ba cấp hoàn thiện vùng

| Cấp | Nội dung | Sinh ra ở đây được? |
| --- | --- | --- |
| A — Sâu | Khuôn đầy đủ, văn hóa chi tiết, nhiều sự kiện riêng, pixel art riêng | Có, đầy đủ |
| B — Cơ bản | Khuôn dùng chung, kho tên, chức danh, sự kiện chung của khuôn | Có, đơn giản hơn |
| C — Nền | Thế lực trên bản đồ, mô phỏng thống kê | Chưa |

Ghi rõ cho người chơi vùng nào ở cấp nào.

## 10. Nguồn dữ liệu

### 10.1 Bản đồ và dân số

| Nguồn | Nội dung | Giấy phép / Lưu ý |
| --- | --- | --- |
| historical-basemaps (aourednik) | Ranh giới quốc gia và vùng văn hóa lịch sử quy mô toàn cầu/lục địa | GNU GPL v3.0 — có thể ràng buộc với game thương mại đóng mã; dùng làm tham khảo |
| OpenHistoricalMap | Bản đồ lịch sử cộng đồng, có ngày bắt đầu/kết thúc từng đối tượng | Mặc định CC0 (từ 8/2022); một số đối tượng CC BY / CC BY-SA ghi trong thẻ license |
| CShapes 2.0 | Biên giới quốc gia và lãnh thổ phụ thuộc 1886–2019 | CC BY-NC-SA 4.0 — không dùng thương mại nếu chưa xin phép |
| World Historical GIS (Thinkquest) | Shapefile 2000 TCN – 1994 | Do học sinh tạo, sai số ~±40 dặm; chỉ tham khảo |
| HYDE 3.x | Lưới dân số, đô thị/nông thôn, sử dụng đất ~10.000 TCN – nay | Kiểm tra điều khoản; năm xa chủ yếu là ước tính mô hình; không có biên giới |


### 10.2 Sự kiện và nhân vật lịch sử

| Nguồn | Dùng cho | Lưu ý |
| --- | --- | --- |
| Wikidata | Vua chúa, triều đại, năm trị vì, trận đánh, chiến tranh | CC0, dùng thương mại được; khung xương tốt nhất |
| Biên niên sử cổ (Đại Việt sử ký toàn thư, Nhị thập tứ sử, biên niên sử châu Âu) | Thiên tai, điềm lạ, mất mùa, dịch, khởi nghĩa theo năm | Nguyên bản cổ thuộc phạm vi công cộng; bản dịch hiện đại có thể còn bản quyền |
| Dữ liệu khí hậu cổ (NOAA Paleoclimatology, tái dựng phun trào núi lửa) | Năm lạnh, khô, núi lửa lớn | Nguồn rất hay cho thiên tai “đúng lịch sử” |
| Seshat Global History Databank | Quy mô, thể chế, quân sự, tôn giáo của các nhà nước | Kiểm tra giấy phép |
| Wikipedia, sách sử | Tra cứu, tham khảo | Không chép nguyên văn (CC BY-SA, bản quyền) |


### 10.3 Nguyên tắc pháp lý
Dữ kiện lịch sử không có bản quyền. Cách diễn đạt, bộ dữ liệu biên soạn, bản dịch, bản đồ vẽ sẵn thì có.
Không copy dữ liệu từ CK3, EU4 hay game khác.
An toàn nhất: tự xây lưới tỉnh và bản đồ pixel riêng, dùng nguồn mở làm tham khảo để gán dữ liệu.
Ưu tiên nguồn CC0 / phạm vi công cộng cho dữ liệu đưa trực tiếp vào game.
Trước khi phát hành thương mại, hỏi luật sư về sở hữu trí tuệ.

### 10.4 Quy trình biên soạn sự kiện lịch sử
1. THU THẬP     Wikidata + biên niên sử + dữ liệu khí hậu
2. LỌC          Giữ sự kiện ảnh hưởng đời sống người chơi
3. PHÂN LOẠI    Tự nhiên / Cấu trúc / Thế lực ngoài / Chính trị / Công nghệ
4. GẮN ĐIỀU KIỆN Khi nào xảy ra; nếu lịch sử đã khác thì sao
5. VIẾT GÓC NHÌN Mỗi sự kiện viết cho nhiều tầng lớp (Tài liệu 05)
6. KIỂM TRA     Người am hiểu sử rà soát, ghi nguồn và độ tin cậy
AI có thể soạn nháp bước 2–5; bước 6 bắt buộc có người.

## 11. Nhạy cảm
Biên giới gần hiện đại nhạy cảm nhất (tranh chấp chủ quyền, lãnh thổ chiếm đóng, quốc gia chưa được công nhận). Một số thị trường kiểm duyệt nội dung bản đồ khi cấp phép phát hành.
Thể hiện kiểm soát thực tế thay vì phán xét chủ quyền.
Chủ đề nặng (nô lệ, diệt chủng, thực dân, chiến tranh tôn giáo) xử lý nghiêm túc, không biến thành “cơ chế tối ưu”.
Tôn giáo mô phỏng như hệ thống xã hội, không đánh giá đúng sai.
Dùng tên gọi tôn trọng: ví dụ “người bản địa Bắc Mỹ” hoặc tên riêng từng dân tộc thay vì từ lỗi thời.
Cân nhắc chỉ làm thời kỳ xa ở các bản đầu; thời hiện đại để rất muộn.

## 12. Lộ trình thế giới

| Bước | Nội dung | Mục đích |
| --- | --- | --- |
| 1 | Thế giới giả tưởng từ seed, một khu vực nhỏ | Kiểm chứng hệ thống, không ràng buộc dữ liệu thật |
| 2 | Kiến trúc bản đồ 5 lớp + editor | Nền cho cả giả tưởng và lịch sử |
| 3 | Một khu vực lịch sử + một khoảng thời gian (ví dụ Đông Á 1000–1400) | Kiểm chứng “bộ xương thật + phần thịt sinh” |
| 4 | Mở rộng khu vực lân cận, thêm khuôn văn minh | Đa dạng |
| 5 | Thêm mốc thời gian | Mở rộng thời kỳ |
| 6 | Toàn thế giới ở cấp C/B, nâng dần lên A | Tầm nhìn đầy đủ |

Cần chốt: làm Historical World từ đầu (thu hút hơn) hay Generated World trước (nhanh, ít rủi ro). Phương án lai: thế giới giả tưởng lấy cảm hứng rõ ràng từ một vùng lịch sử (ví dụ “một vương quốc kiểu Đại Việt thế kỷ 13” với tên hư cấu), rồi mới làm bản lịch sử thật.