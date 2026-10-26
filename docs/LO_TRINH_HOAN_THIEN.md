# Lộ trình hoàn thiện game — chia theo Phase

Lập 26/10/2026. Mục tiêu: đi từ bản hiện tại (GĐ1 + GĐ1.5 gần xong) tới **bản v1.0 chơi trọn vẹn**. Mỗi lần code làm trọn **một phase**. Theo dõi hạng mục đã xong vẫn ghi ở [LO_TRINH_THUC_HIEN.md](LO_TRINH_THUC_HIEN.md). Giai đoạn và câu hỏi kiểm chứng gốc: [09_Lo_Trinh_Can_Bang_Rui_Ro.md](09_Lo_Trinh_Can_Bang_Rui_Ro.md).

## 0. Hiện trạng (đo 26/10/2026)

- `typecheck` sạch, 39 test qua, `validate` hợp lệ: 1 khuôn văn minh, 3 xuất thân, 7 nghề, 252 sự kiện quyết định, 423 mẫu nhật ký, 16 Focus, 8 tham vọng, 6 bệnh, 9 tài sản, 16 tính cách.
- Đã chơi được **một đời**: tick tháng, Focus, nghề, kinh tế kiểu 1in8b, túi tiền riêng, gia đình cơ bản, bệnh, tử vong, tổng kết 5 trục, cảnh lắp ghép, biên niên.
- Còn thiếu để thành game hoàn chỉnh:
  - Chết là hết ván. Chưa có **truyền đời** (Dynasty), gia phả, thừa kế, ra ở riêng.
  - Menu chỉ có "Chơi tiếp" và "Ván mới". Chưa có **chỗ chơi thử nhanh từng tình huống**, chưa có công cụ dev trong ván.
  - Chưa có chế độ số phận, chưa có cài đặt, chỉ một ô lưu tự động, chưa có âm thanh và hướng dẫn chơi.
  - Thế giới chỉ một nơi ở, chưa đi lại. Nghề chưa có bậc, thâm niên. Chưa có cơ nghiệp kinh doanh.

## 1. Phạm vi v1.0 (đề xuất)

**v1.0 = chế độ One Life + Dynasty trong một vùng (làng – thị trấn – phủ)**, đủ nghề và cơ nghiệp để mỗi đời khác nhau, có đủ cài đặt, lưu game, hướng dẫn, âm thanh, đóng gói được. Đây là GĐ1 + GĐ2 + phần nghề nghiệp của GĐ4 trong GDD 09.

Tầng quyền lực (Tổ chức, Vương quốc, chiến tranh, nổi dậy), nhiều vùng, nhiều khuôn văn minh và thời đại để **sau v1.0** (§4). Muốn đưa phần nào vào v1.0 thì chèn phase trước Phase 9.

**Nguyên tắc "khung trước, nội dung sau"**: mỗi phase làm xong cơ chế, schema, UI và chỉ kèm **dữ liệu tối thiểu** (2–5 sự kiện mẫu cho mỗi cơ chế mới) đủ để chạy và test. Phần viết thêm nội dung ghi vào mục "Nợ nội dung" của phase để làm sau, song song.

## 2. Quy ước bắt buộc cho mọi phase

Phase chỉ coi là xong khi đủ các điều sau:

1. **Kịch bản thử nghiệm**: mỗi cơ chế mới có ít nhất một kịch bản trong `src/data/scenarios/` và hiện trong tab **Thử nghiệm** ở menu (khung làm ở Phase 1).
2. **Không hard-code**: số, chữ, danh sách nằm trong `src/data/`, có Zod schema. Chữ mới có trong cả `vi.json` và `en.json`. Đã chạy lệnh grep chuỗi tiếng Việt trong `.agents/rules/no-hardcode-rule.md`.
3. **Save cũ không vỡ**: đổi `GameState` thì tăng `SAVE_VERSION` và viết bước nâng cấp trong `src/core/world/migrate.ts`.
4. **Kiểm tra đã chạy**: `npm run typecheck`, `npm test`, `npm run validate`, `npm run lint`. Có test "mọi kịch bản chạy 10 năm không lỗi". Phase nào chạm cân bằng thì chạy `npm run simulate` và ghi KPI.
5. **Cập nhật tài liệu**: tick hạng mục trong [LO_TRINH_THUC_HIEN.md](LO_TRINH_THUC_HIEN.md), ghi "Nợ nội dung" của phase.

## 3. Các phase tới v1.0

| Phase | Tên | Kết quả chơi được |
| :---: | :--- | :--- |
| 1 | Phòng thử nghiệm & công cụ dev | Menu có tab Thử nghiệm với ~25 kịch bản; trong ván có bảng dev để tua năm, gọi sự kiện, sửa chỉ số |
| 2 | Tách hộ, thừa kế, chế độ số phận | Cưới xong ra ở riêng, cha mẹ chia gia sản, người mất để lại di sản; chọn mức số phận khi tạo ván |
| 3 | Truyền đời (Dynasty) | Chết xong chọn người kế, chơi tiếp đời sau; gia phả, sử sách các đời; tuyệt tự mới hết ván |
| 4 | Các họ trong làng, hôn nhân, nuôi con | 5–8 dòng họ NPC tự sống; mai mối, gả con, hôn nhân nâng địa vị; đầu tư cho con |
| 5 | Nghề nghiệp v2 (khung) | Nghề có bậc, thâm niên, nghề tay trái, nghề người nhà, tìm việc và chuyển nghề; thêm khung ~10 nghề |
| 6 | Cơ nghiệp & tài sản | Mở sạp, hiệu buôn, xưởng; vốn, người làm, doanh thu theo Thời cơ; màn hình tài sản, nâng cấp nhà |
| 7 | Một vùng: làng – thị trấn – phủ | Chuyển nhà, lên phủ thi và làm quan, đi buôn chuyến; mỗi nơi có cảnh và giá cả riêng |
| 8 | Trải nghiệm người chơi | Hướng dẫn mở dần, cài đặt, nhiều ô lưu, âm thanh, các màn hình phụ, mobile, phím tắt |
| 9 | Cân bằng, hiệu năng, đóng gói v1.0 | Đủ 5 bot và KPI GDD 09, save gọn, bản web PWA và bản PC |

---

### Phase 1 — Phòng thử nghiệm & công cụ dev

**Mục tiêu**: vào thẳng bất kỳ tình huống nào trong vài giây, không phải chơi 30 năm mới gặp. Làm đầu tiên vì mọi phase sau đều cần nó để test.

**Core**
- Schema mới `src/content/schemas/scenario.ts` và thư mục `src/data/scenarios/*.yaml`. Một kịch bản gồm:
  - `base`: xuất thân, tuổi, giới tính, seed, năm bắt đầu.
  - `setup`: **dùng lại danh sách hiệu ứng có sẵn** (`money`, `food`, `debt`, `property_add`, `set_career`, `add_disease`, `add_trait`, `marry`, `set_flag`, `set_exam_degree`, `reputation`, `own_money`...) để không viết cơ chế thứ hai.
  - Vài khóa chỉ dành cho dựng cảnh, hiệu ứng không làm được: tuổi, sức khỏe của người nhà, thêm con theo tuổi, cha mẹ còn hay mất, trạng thái thế giới (mùa màng, động tĩnh quân sự, giá thóc).
  - `start_event` (bật ngay một sự kiện theo id), `fast_forward_years` (tua headless N năm bằng bot trước khi vào), `auto_minor`.
- `src/core/world/scenario.ts`: `applyScenario(ctx, scenario)` chạy sau `generateNewGame`.
- Lệnh dev trong `commands.ts` (`devAdvance`, `devTriggerEvent`, `devApplyEffects`, `devKill`, `devSetAge`). Lõi từ chối các lệnh này nếu cờ dev tắt.
- Cờ bật/tắt nằm trong data (`display.yaml › dev_tools`). Bridge chỉ bật khi chạy `vite dev` hoặc cờ data bật, bản phát hành tự ẩn.

**UI**
- Menu chính thành 3 tab: **Chơi tiếp · Ván mới · Thử nghiệm**.
- Tab Thử nghiệm: kịch bản theo nhóm, ô tìm, mô tả "kịch bản này để test gì", ô sửa seed, nút "tua thêm N năm rồi vào", nút Chạy.
- Bảng dev trong ván (phím `~`): tua 1/5/10 năm, gọi sự kiện theo id (gợi ý từ content), sửa tiền/thóc/nợ/sức khỏe/stress, cho bệnh, cho người nhà mất, xem lý do Director chọn sự kiện, xuất/nhập save JSON, chép seed.

**Tools**
- `npm run simulate -- --scenario <id>` chạy bot từ một kịch bản.
- `validate` kiểm tra mọi id mà kịch bản tham chiếu (xuất thân, nghề, sự kiện, bệnh...) đều tồn tại.
- Vitest: mọi kịch bản dựng được và chạy 10 năm không lỗi, cùng seed ra cùng kết quả.

**Kịch bản ban đầu (~25)**

| Nhóm | Kịch bản |
| :--- | :--- |
| Khởi đầu | 3 xuất thân × tuổi 0 / 6 / 16 (9 kịch bản) |
| Kinh tế | Nghèo ngập nợ · Phú hộ nhiều ruộng · Nhà buôn vốn lớn gặp giá cao · Mất mùa, đói giáp hạt · Kho thóc đầy, lái buôn tới |
| Sức khỏe & cái chết | Ốm nặng chưa chữa · 70 tuổi sức yếu · Dịch trong làng |
| Gia đình | Mới cưới, vợ đang mang thai · Nhiều con nhỏ · Cha mẹ sắp giao việc nhà · Góa vợ/chồng |
| Nghề | Lính gặp chiến dịch · Thảo khấu bị truy nã · Sĩ tử sắp thi Hương · Quan văn mới nhậm chức |
| Văn minh & thế giới | Đang cư tang · Năm đổi vua · Bật ngay một chuỗi sự kiện nhiều hồi |

**Xong khi**: chọn bất kỳ kịch bản nào là vào ván đúng tình huống; bảng dev gọi được mọi sự kiện; test kịch bản qua.

---

### Phase 2 — Tách hộ, thừa kế, chế độ số phận (đóng GĐ1.5)

**Mục tiêu**: gia đình có vòng đời như thật. Con lớn ra ở riêng, cha mẹ mất để lại gia sản. Người chơi chọn được độ khắc nghiệt.

**Core & Data**
- **Ra ở riêng**: luật trong `life.yaml › household_split` (bao lâu sau cưới, ai ở lại thờ cúng). Theo luật Nho giáo trong `nho_giao.yaml`: con trưởng giữ hương hỏa, phần còn lại chia theo tỷ lệ. Có sự kiện xin ra ở riêng, cha mẹ chia ruộng, anh em tranh phần.
- Nhà cha mẹ thành hộ NPC (mô phỏng thưa) nhưng vẫn nối quan hệ: cha mẹ ốm thì có sự kiện, cha mẹ mất thì có cư tang và thừa kế.
- **Thừa kế**: luật chia tài sản và nợ theo khuôn văn minh. Người già lập di chúc qua sự kiện; mất đột ngột không di chúc thì chia theo luật mặc định và dễ sinh tranh chấp (chuỗi sự kiện).
- **Chế độ số phận** (`balance/fate_modes.yaml`): Đời bình lặng / Đời thực / Số phận khắc nghiệt / Tùy chỉnh. Mỗi chế độ là bộ hệ số cho tử vong, bệnh, thiên tai, trọng số sự kiện xấu.
- **Đỡ xui** (bad-luck protection): sau chuỗi biến cố xấu thì tăng trọng số sự kiện cứu vãn. Ngưỡng nằm trong `director.yaml`.
- **Điềm báo trước cái chết**: sức khỏe tụt có nhật ký báo trước; nguyên nhân chết luôn ghi rõ (GDD 01 §8.2).
- KPI mới trong `kpi-targets.json`: tuổi làm chủ hộ TB ≤ 30, tỷ lệ đời lên Phú hộ, tỷ lệ tách hộ.

**UI**: NewGame có ô chọn mức số phận. Thẻ gia đình hiện cả "nhà cha mẹ" và "nhà anh em". Chốt sổ năm có dòng thừa kế.

**Kịch bản thêm**: Vừa cưới còn ở chung · Cha sắp mất, có 3 con trai · Mất không di chúc, anh em tranh phần · Con thứ ra riêng tay trắng · Cùng seed chạy cả 3 mức số phận.

**Nợ nội dung**: sự kiện tranh gia tài, giỗ chạp, cư tang cho từng xuất thân.

---

### Phase 3 — Truyền đời (chế độ Dynasty)

**Mục tiêu**: trả lời câu hỏi kiểm chứng GĐ2: *"Người chơi có muốn chơi tiếp khi nhân vật đầu chết không?"*

**Core & Data**
- NewGame chọn chế độ **One Life** hoặc **Dynasty** (danh sách chế độ để trong data).
- Thực thể `Dynasty` (`src/core/entities/Dynasty.ts`): họ, tổ tiên, các đời đã chơi, danh vọng dòng họ, ân oán với các họ khác, di nguyện còn dang dở.
- **Luật kế vị** trong khuôn văn minh: thứ tự ưu tiên (con trai trưởng → con khác → cháu → họ hàng), ai bị loại. Chọn người không nhận phần chính vẫn được, chỉ là chơi tiếp với hoàn cảnh nghèo hơn (GDD 01 §9).
- **Chuyển người chơi**: đổi `playerId`; reset túi tiền riêng, Focus, tham vọng (chọn tham vọng mới); không nhận kỹ năng của người trước. Mang theo được: danh tiếng dòng họ, nợ, quan hệ, lời hứa dang dở (trở thành "di nguyện").
- **Người kế còn nhỏ**: mẹ hoặc chú làm giám hộ, nhà tự lo, người chơi chơi từ tuổi thơ.
- **Hết ván** chỉ khi tuyệt tự. Lối thoát: nhận con nuôi, đón họ hàng xa (sinh nhân vật họ hàng theo luật data).
- Bản đồ cuộc đời, nhật ký, tổng kết lưu riêng cho từng đời.
- Mô phỏng: bot chơi nhiều đời. KPI mới: tuyệt tự qua 100 năm < 10%, thăng tầng xã hội qua 3–4 đời 30–50%.

**UI**
- Màn hình **Truyền đời**: tổng kết đời vừa hết → danh sách người kế (tuổi, tính cách, quan hệ, phần gia sản nhận) → bắt đầu đời mới.
- Màn hình **Gia phả** (cây nhiều đời) và **Sử sách các đời** (mỗi đời một dòng tổng kết 5 trục).
- Bảng **Tổng kết dòng họ** khi tuyệt tự hoặc người chơi dừng.

**Kịch bản thêm**: 68 tuổi có 3 con (tua 1 năm là mất) · Mất khi con trưởng 5 tuổi (giám hộ) · Không con, chỉ có cháu họ · Tuyệt tự hoàn toàn · Đời thứ 3 có sẵn 2 đời tổ tiên · Người kế nóng nảy (làm trái tính cách bị stress).

**Nợ nội dung**: sự kiện đầu đời mới ("ngày đầu làm chủ nhà sau tang cha"), di nguyện theo tham vọng của đời trước.

---

### Phase 4 — Các họ trong làng, hôn nhân, nuôi con

**Mục tiêu**: gia tộc là sợi dây xuyên suốt. Người chơi lo cho đời sau từ khi con còn nhỏ.

**Core & Data**
- 5–8 **dòng họ NPC** trong làng và thị trấn: gia thế, nghề, danh tiếng, quan hệ với họ người chơi. Danh sách họ và tên lấy từ `cultures/`.
- **Character AI T1**, chạy theo năm, mô phỏng thưa: NPC quan trọng tự cưới, sinh con, đổi nghề, làm giàu hoặc sa sút, chết.
- **Chợ hôn nhân**: mai mối đưa vài đối tượng (gia thế, tính cách, sính lễ hoặc của hồi môn). Hôn nhân "môn đăng hộ đối" nâng địa vị, thông gia thì thêm đồng minh.
- **Gả cưới cho con**: chủ hộ quyết hôn sự cho con; con có thể cãi lời (theo tính cách).
- **Nuôi dạy con**: chọn hướng cho từng con (đi học, học nghề, phụ việc nhà); hướng đó ảnh hưởng kỹ năng và tính cách của con.
- **Danh tiếng gia tộc**, ân oán giữa các họ (thông gia, thù truyền đời) giữ qua các đời.

**UI**: màn hình **Hôn sự** (đối tượng, so sánh), thẻ con cái có ô chọn hướng nuôi dạy, thẻ **Các họ trong làng**.

**Kịch bản thêm**: Con gái 16 tuổi tới tuổi gả · Ba nhà cùng mai mối · Đang có thù với một họ · Con trai học giỏi muốn đi thi · Tua 50 năm để xem làng (dân số không chết sạch, không bùng nổ).

**Nợ nội dung**: sự kiện mai mối, lễ cưới, mẹ chồng nàng dâu, anh em bất hòa.

---

### Phase 5 — Nghề nghiệp v2 (khung)

**Mục tiêu**: đời người đa dạng như thật. Khung theo [kế hoạch GĐ4 trong LO_TRINH_THUC_HIEN.md](LO_TRINH_THUC_HIEN.md#kế-hoạch-gđ4--hệ-nghề-nghiệp-v2-chốt-25102026) và GDD 04.

**Core & Data**
- Schema nghề mới: ngành, độ sâu (Nhẹ/Vừa/Sâu), nơi có nghề, cổng vào, các bậc (số năm, kỹ năng, uy tín, khoảng thu nhập), tác động lên sức khỏe/stress/XP, lối ra, nhãn sự kiện. Chuyển 7 nghề hiện có sang schema mới.
- **Thâm niên & lý lịch**: đếm tháng làm nghề và thâm niên trong ngành; thăng bậc theo năm, kỹ năng, uy tín; thu nhập tăng theo thâm niên.
- **Nghề tay trái** theo mùa nông nhàn (đan lát, đánh cá, chở đò...).
- **Nghề người nhà**: mỗi người lớn có nghề riêng, thu nhập hộ là tổng các nghề.
- **Tìm việc & chuyển nghề**: bảng việc mở theo nơi ở, lời mời qua sự kiện, bị đẩy vào do biến cố (bắt lính, phá sản). Mỗi đường chuyển nghề là dữ liệu.
- Thêm **khung ~10 nghề Nhẹ/Vừa** (Tá điền, Làm thuê, Thợ mộc, Thợ rèn, Thầy lang, Ngư dân, Chủ đò, Nha lại, Bán rong, Bà đỡ), mỗi nghề 2–3 sự kiện mẫu.

**UI**: thẻ Nghề có lý lịch nghề, bậc hiện tại và điều kiện lên bậc, bảng việc đang mở, nghề của người nhà.

**Kịch bản thêm**: mỗi nghề mới một kịch bản bắt đầu · Làm 20 năm sắp lên bậc · Bị bắt lính · Mùa nông nhàn có nghề tay trái · Nhà có ba người ba nghề.

**Nợ nội dung**: nghề Nhẹ 5–10 sự kiện, Vừa 20–30, Sâu 50+ (ước 250–350 sự kiện).

---

### Phase 6 — Cơ nghiệp & tài sản

**Mục tiêu**: có đường làm giàu bằng kinh doanh và để lại gia nghiệp cho đời sau.

**Core & Data**
- `src/data/ventures/`: sạp → cửa hiệu → hiệu buôn; lò gốm, xưởng mộc, thuyền buôn, quán rượu. Mỗi loại có vốn, người làm, doanh thu theo Thời cơ và danh tiếng, chi phí, rủi ro.
- Vòng đời cơ nghiệp: mở, mở rộng, sa sút, phá sản, truyền lại cho đời sau (nối với thừa kế ở Phase 2–3).
- **Vay và cho vay có chủ nợ là NPC**: ân tình, thù oán, đòi nợ qua sự kiện.
- **Nâng cấp nhà** (nhà tranh → nhà gỗ 3 gian → phủ đệ), cảnh thay đổi theo nhà.

**UI**: màn hình **Tài sản & đầu tư** (ruộng, nhà, trâu, cơ nghiệp, khoản cho vay, mua/bán/nâng cấp); thẻ cơ nghiệp có doanh thu năm.

**Kịch bản thêm**: Có sạp nhỏ · Hiệu buôn sắp phá sản · Thừa kế xưởng gốm · Giá cao bất thường (Thời cơ) · Chủ nợ đến đòi.

**Nợ nội dung**: sự kiện theo từng loại cơ nghiệp, phần nhà ở trong `scene-kit.json`.

---

### Phase 7 — Một vùng: làng – thị trấn – phủ

**Mục tiêu**: đúng quyết định đã chốt ở GDD 09 §5 (một làng, một thị trấn, một phủ). Người chơi đi lại và đổi chỗ ở được.

**Core & Data**
- Mỗi khu định cư có trạng thái riêng: giá, Thời cơ, dân cư (mô phỏng thưa), thiên tai.
- **Chuyển nhà** (bán hoặc giữ tài sản cũ), **lên phủ** thi Hội và làm quan, **đi buôn chuyến** (vắng nhà vài tháng, có rủi ro dọc đường).
- Dịch bệnh lan giữa các nơi (nền móng cho GĐ4).
- Thêm loại khu định cư "phủ/kinh thành" vào `settlement_types.yaml` và bộ phận cảnh tương ứng vào `scene-kit.json`.

**UI**: bản đồ vùng đơn giản (3 điểm, đường đi, thời gian đi); cảnh đổi theo nơi đang ở.

**Kịch bản thêm**: Chuyển ra thị trấn · Quan văn nhậm chức ở phủ · Dịch bùng ở thị trấn · Đang đi buôn chuyến thì nhà có việc.

**Nợ nội dung**: sự kiện và nhật ký riêng của phủ, đường đi, nhà trọ.

---

### Phase 8 — Trải nghiệm người chơi

**Mục tiêu**: người lạ mở game là tự chơi được, không cần người làm game đứng cạnh.

- **Hướng dẫn mở dần** (GDD 08 §6.5): ván đầu gợi ý xuất thân và tham vọng; tính năng mở theo giai đoạn đời; tooltip "vì sao" ở mọi con số.
- **Cài đặt** (lưu trong IndexedDB): ngôn ngữ vi/en, tốc độ mặc định, quy tắc tự dừng, hiện số hay hiện lời, tự quyết chuyện nhỏ, âm lượng, cỡ chữ.
- **Lưu game**: nhiều ô lưu, lưu tay và lưu tự động, xuất/nhập file, xóa; báo rõ khi save hỏng.
- **Âm thanh**: `AudioManager` đọc data (nhạc theo khuôn văn minh và tâm trạng, âm môi trường theo lớp cảnh, tiếng báo sự kiện). Chưa có file thì im lặng, không lỗi.
- **Màn hình phụ** theo GDD 08 §6.2: Nhân vật, Gia phả, Tài sản, Quan hệ, Biên niên. Chỉ hiện khi hợp địa vị và nghề.
- **Menu tạm dừng trong ván** (lưu, cài đặt, về menu), phím tắt (Space dừng/chạy, 1–5 đổi tốc độ).
- **Mobile**: bố cục 1 cột ở màn hẹp, nút đủ lớn để chạm.
- Error boundary cho React: lỗi một thẻ không làm sập cả màn hình.

**Kịch bản thêm**: Ván đầu tiên (bật hướng dẫn) · Nạp save phiên bản cũ (test migrate) · Save hỏng.

---

### Phase 9 — Cân bằng, hiệu năng, đóng gói v1.0

- **Đủ 5 bot** (an phận, liều lĩnh, tham vọng, ngẫu nhiên, tối ưu) chạy nhiều đời. Báo cáo đủ KPI ở GDD 09 §3 và KPI dòng họ. Sửa lối mòn: không nghề hay chiến lược nào thắng áp đảo.
- **Hiệu năng**: đo thời gian tick một năm và kích thước save sau 200 năm; cắt bớt nhật ký cũ, nén save, chuyển mô phỏng vào Web Worker nếu tick chậm.
- **Kiểm tra độ dày nội dung**: `validate` cảnh báo khi một nghề, giai đoạn đời hoặc xuất thân có ít sự kiện hơn ngưỡng trong data. Danh sách cảnh báo này chính là danh sách việc viết nội dung.
- **Đóng gói**: PWA cho web, Tauri cho PC; icon, màn hình chờ, số phiên bản, changelog.
- `en.json` đầy đủ.
- **Chơi thử với 3–5 người thật**, trả lời các câu hỏi kiểm chứng GĐ0, GĐ1, GĐ2.

---

## 4. Sau v1.0

Mỗi mục là một hoặc vài phase, lên chi tiết khi tới nơi.

| Phase | Nội dung | Tương ứng GDD |
| :---: | :--- | :--- |
| 10 | **Tổ chức & chức vụ**: lý trưởng và phe trong làng, thương hội, băng cướp, nha môn; thành viên, chức vụ, kế vị; quản lý fractal, ủy quyền | GĐ2–3, GDD 03 |
| 11 | **Vương quốc**: bản đồ tỉnh, lãnh địa, chính trị, quân đội, chiến tranh, nổi dậy từ dưới lên, triều đình, kế vị ngai vàng | GĐ3 |
| 12 | **Thế giới sống**: nhiều vùng, khuôn văn minh thứ hai, quốc gia AI, LOD đầy đủ, Historical World | GĐ4 |
| 13 | **Legacy of Ages**: Era System, gói thời đại, mốc lịch sử để chọn năm bắt đầu | GĐ5 |

## 5. Mạch nội dung chạy song song

Việc viết dữ liệu (sự kiện, nhật ký, nghề, tên, cảnh) không chặn phase nào. Gom các mục "Nợ nội dung" của từng phase và cảnh báo độ dày nội dung (Phase 9) thành danh sách việc. Ưu tiên phần đang thiếu theo KPI: hiện quyết định lặp 21–31% (mục tiêu 15%), nhất là của nhà nho và nhà buôn.
