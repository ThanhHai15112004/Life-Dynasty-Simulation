# Lộ trình thực hiện — theo dõi từng hạng mục

Cập nhật 26/10/2026. ✅ xong · 🟡 làm một phần · ⬜ chưa làm. Phạm vi và câu hỏi kiểm chứng của từng giai đoạn: [09_Lo_Trinh_Can_Bang_Rui_Ro.md](09_Lo_Trinh_Can_Bang_Rui_Ro.md). Lộ trình tới v1.0 chia theo phase: [LO_TRINH_HOAN_THIEN.md](LO_TRINH_HOAN_THIEN.md).

## Giai đoạn 0 — Prototype vòng lặp

| Hạng mục | Trạng thái | Ở đâu |
| :--- | :---: | :--- |
| Một xuất thân (Nông dân), bắt đầu 16 / 6 / 0 tuổi | ✅ | `src/data/origins/nong_dan.yaml` |
| Tick tháng/năm, Pause, Auto-pause, tốc độ | ✅ | `src/core/engine/GameClock.ts`, `src/bridge/GameStore.ts` |
| Focus (8 trọng tâm, chính + phụ) | ✅ | `src/data/focuses/` |
| Mức sống 5 bậc | ✅ | `src/data/balance/living_standards.yaml` |
| Sổ sách hộ (gặt, thuế, nợ, mua bán thóc) | ✅ | `src/core/systems/economy/` |
| ~15 sự kiện quyết định | ✅ | `src/data/events/common/` |
| Cảnh pixel ghép 7 lớp | ✅ | `src/game/scene-layers/` |
| Mô phỏng headless + kiểm tra dữ liệu | ✅ | `tools/simulate/`, `tools/validate-content/` |
| Chơi thử trả lời "vòng lặp một năm có vui không?" | ⬜ | cần người chơi thật |

## Giai đoạn 1 — Core Life Simulator

| Hạng mục | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| Khuôn Quan liêu Nho giáo | ✅ | Hiếu đạo, Danh vọng sĩ phu, Khoa cử 3 bậc (thi Hương → thi Hội – Đình năm sau), Cư tang 27 tháng, thang địa vị 5 bậc có điều kiện và modifier — `src/data/civilizations/nho_giao.yaml` |
| 3 xuất thân khác nhau thật | ✅ | Nông dân (làng, tự cày) · Thương nhân (thị trấn bến sông, thu tô + lời buôn theo Thời cơ) · Quý tộc nhỏ (nhà nho sa sút, thu tô + dạy học, nợ thể diện) |
| 4 nghề sâu + Sĩ tử | ✅ | Nông dân, Thương nhân, Lính → Tướng, Thảo khấu; thêm Sĩ tử → Quan văn (nối với Khoa cử) — `src/data/careers/careers.yaml` |
| Nghề quyết định cách hộ mưu sinh | ✅ | `economy` của nghề: tự cày hay phát canh, công người nhà, thu nhập theo kỹ năng / Thời cơ |
| Thời cơ | ✅ | Giá buôn theo tháng, động tĩnh quân sự, tuần tra, truy nã — `src/data/balance/opportunity.yaml` |
| Hạnh phúc tâm lý 3 tầng | ✅ | Tâm trạng, Mãn nguyện, thích nghi; hệ giá trị theo tính cách là luật trong data |
| Tham vọng cả đời | ✅ | `src/data/ambitions/` |
| Bệnh tật, danh tiếng | ✅ | `src/data/diseases/`, `reputation` |
| Gia đình cơ bản (cưới, sinh con) | ✅ | `src/core/systems/family/` |
| 30–50 mẫu sự kiện | ✅ | 206 sự kiện quyết định (có chuỗi nhiều hồi), 410 mẫu nhật ký; ưu tiên đúng hoàn cảnh nhờ trọng số theo Focus, nghề nhà, nơi ở và giảm dần khi đã gặp |
| Tổng kết đời 5 trục | ✅ | Công thức trong `src/data/balance/life.yaml › summary_axes` |
| Hoạt cảnh (micro-cutscene) | ✅ | Hàng đợi trong core, Phaser phát lần lượt — `public/assets/common/placeholder/cutscenes.json` |
| Cảnh vẽ bằng code từ bộ phận lắp ghép | ✅ | `public/assets/common/scene-kit.json`: bộ phận pixel + bảng màu theo văn hóa và mùa; làng nông và thị trấn bến sông; chân dung dùng chung bộ phận người |
| Biên niên vương triều | ✅ | Đổi vua/niên hiệu, chiến tranh, nạn đói, dịch, chính sự — `src/data/chronicle/` |
| Giao diện kiểu 1in8b | ✅ | Tuổi làm trung tâm, thanh năm trượt liên tục, hồ sơ có chân dung, cảnh có chú thích, nhật ký theo tuổi, gia đình, bản đồ cuộc đời, biên niên |
| KPI cân bằng | 🟡 | Đo 25/10/2026 (30 đời × 5 bot × 3 xuất thân): ✔ tuổi thọ TB 54–56 (chỉ bot ngẫu nhiên ~49) · ✔ dừng thời gian ~1,9–2,1 lần/năm · ✔ 95–99% đời có lập gia đình · ✔ tử vong trẻ em ~20%. ✖ Quyết định lặp 21–31% (mục tiêu 15%) và chuyện nhỏ lặp ~36% (mục tiêu 30%): cần thêm nội dung, nhất là cho nhà nho và nhà buôn |
| Chơi thử trả lời "một đời người có hấp dẫn không?" | ⬜ | cần người chơi thật |

## GĐ1.5 — Kinh tế kiểu 1in8b (chốt 26/10/2026)

Chơi thử thấy "làm không khá nổi": thu nhập gần như không có, địa chủ không có doanh thu, các khoản trừ thóc/nợ lặt vặt rối mắt. Đo 36 đời (bot tối ưu) xác nhận bốn lỗi gốc:

1. Chủ hộ là "người lớn nhiều tuổi nhất": trung bình ~45 tuổi người chơi mới làm chủ, ~1/4 đời không bao giờ.
2. Nhà tự lo không bán thóc dư, không mua ruộng, mức sống kẹt ở đạm bạc. Luật mức sống đòi kho thóc ≥ 3–6 tháng, mà nhà buôn và nhà nho chỉ trữ 2 tháng.
3. Của cải nằm trong thóc nhưng tài sản ròng không tính thóc. Nhà nông ôm 500–1.400 thúng mà "ròng" đứng yên, không lên nổi Phú hộ.
4. Nghề không có doanh thu thật: địa chủ 4 sào thu tô không đủ ăn, lời buôn không gắn với vốn.

Mô hình học từ 1in8b: mỗi năm **một con số thu nhập**, **chi tiêu tự co giãn theo thu nhập**, chốt sổ năm bằng **mức thay đổi tài sản ròng** với tối đa 5 dòng lý do cộng "Chuyện khác". Đơn vị chính vẫn là quan/sào, bên dưới có dòng quy đổi ra giá ngày nay. Chuyện trữ thóc, bán thóc chuyển thành **sự kiện rải rác, đa dạng**: có cái phải chọn, có cái chỉ là dòng nhật ký, không phải chuỗi cố định hằng năm.

| Hạng mục | Trạng thái | Nội dung |
| :--- | :---: | :--- |
| Giao việc nhà | ✅ | Cha mẹ từ tuổi `life.headship.elder_age` giao việc nhà cho con đã lập gia đình; người chơi đã cưới đứng trên anh chị em cùng lứa |
| Thu nhập năm, tài sản ròng | ✅ | Tài sản ròng tính cả thóc theo giá gốc; thu nhập năm = tổng các khoản làm ra (thóc quy ra tiền); sổ năm lưu tài sản ròng và thu nhập |
| Chi tiêu co giãn | ✅ | Mức sống tự chọn theo ngân sách: tiêu tối đa một phần thu nhập năm + một phần của để dành (`living_standards.auto_budget`), bỏ luật theo kho thóc |
| Nhà tự lo biết vun vén | ✅ | Sau gặt tự bán thóc vượt mức dự trữ; đầu năm có dư thì mua ruộng, trâu, ao (`economy.auto_invest`); chủ hộ bật/tắt được |
| Doanh thu nghề | ✅ | Nhà buôn: lời theo vốn (`income.capital`); địa chủ/nhà nho: thêm ruộng phát canh, nới đường cong giảm tô |
| Thẻ tài sản kiểu 1in8b | ✅ | Tài sản ròng + thu nhập năm (quan, dòng quy đổi bên dưới), thay đổi năm qua, ≤ 5 dòng chốt sổ + "Chuyện khác", nhà ở / ruộng (sào ≈ m²) |
| Sự kiện thóc rải rác | ✅ | Hiệu ứng `sell_food` (bán một phần kho theo giá chợ × hệ số); 8 sự kiện quyết định (`events/common/kho_thoc.yaml`) và 10 mẫu nhật ký (`events/ambient/kho_thoc.yaml`) về kho thóc, giá thóc, lái buôn, cho vay thóc, quan bình giá |
| Túi tiền riêng (kiểu 1in8b) | ✅ | Chưa làm chủ hộ thì thẻ tài sản là **của bạn**: trẻ con là 0; lương nghề riêng, thu nhập theo trọng tâm, tiền công, lì xì vào túi riêng (góp `economy.purse.contribute_share` cho nhà); cha mẹ cho tiêu vặt; sổ riêng ghi "Ăn ở trong nhà / Cha mẹ lo" triệt tiêu nhau; nhà cha mẹ chỉ hiện gia cảnh bằng chữ. Làm chủ hộ thì túi riêng gộp vào gia sản. Hiệu ứng `own_money`, biến `player.own_money` — `src/core/systems/economy/purse.ts` |
| Sửa nợ | ✅ | Lãi tính hằng tháng; có dư là trả ngay (giữ `debt.repay_keep_months` tháng chi tiêu); nhà buôn/nhà nho đong thóc dự trữ vẫn giữ tiền tiêu (`tenancy.reserve_cash_months`); thuế ruộng phát canh nhẹ hơn (`tax.food_per_sao_tenanted`). Đo 20 năm: số tháng mang nợ từ 12–81 còn 0–1 |
| Chuyện nhỏ đa dạng | ✅ | Thêm 38 chuyện nhỏ (tổng 79), mỗi chuyện chỉ gặp một lần trong đời, nhịp ~0,5 chuyện/năm (`director.minor`) |
| Giãn sự kiện lặp | ✅ | 23 sự kiện đời nào cũng gặp lại được nâng thời gian chờ lên 12 năm; `repeat_weight_factor` 0,15 → 0,08. Số sự kiện khác nhau mỗi đời 107–121 → 131–151 |
| Ra ở riêng | ✅ | Cưới xong tách hộ mới (`split.ts`), cha mẹ chia ruộng/tiền/thóc, con trưởng ở lại thờ cúng; thừa kế di sản và nợ theo luật Nho giáo khi cha mẹ mất (`inheritance.ts`) |
| KPI mới | 🟡 | Đo 26/10/2026 (20 đời × 5 bot × 3 xuất thân): ✔ tuổi làm chủ hộ TB 26–31 (trước ~45) · ✔ chuyện nhỏ lặp 0% (trước 32–39%) · ✔ dừng thời gian ~1,9–2,0 lần/năm · ✔ nhà nông lên Phú hộ 15–55% tùy cách chơi. ✖ Nhà buôn 65–90%, nhà nho 75–100% (tính cả bậc Sĩ phu nhờ đỗ khoa cử) — còn giàu quá dễ · ✖ quyết định lặp 8–30%, nặng nhất ở nhà buôn và nhà nho (thiếu sự kiện riêng cho hai nghề) |

## Kế hoạch GĐ4 — Hệ Nghề nghiệp v2 (chốt 25/10/2026)

Mục tiêu: đời người đa dạng như thật — nông dân không chỉ cày ruộng; mỗi nghề có thâm niên, kinh nghiệm, thăng tiến; kinh doanh là một cơ nghiệp có bậc. Toàn bộ là **dữ liệu**, khung đã thiết kế ở GDD 04 §4, §5, §11, §13–14.

| Hạng mục | Nội dung |
| :--- | :--- |
| Ngành → Nghề → Bậc | Mỗi nghề một khối data: ngành, độ sâu (Nhẹ/Vừa/Sâu), nơi có nghề, cổng vào, kỹ năng dùng, các bậc (số năm, kỹ năng, uy tín, thu nhập theo khoảng), tác động khi làm (sức khỏe, stress, XP), lối ra, thẻ sự kiện |
| Thâm niên, kinh nghiệm | Đếm tháng làm nghề và tổng thâm niên trong ngành; thăng bậc theo năm + kỹ năng + uy tín; thu nhập tăng theo thâm niên; lý lịch nghề hiện trong hồ sơ và tổng kết đời |
| Nghề tay trái theo mùa | Nghề chính + việc nông nhàn (đan lát, đánh cá, chở đò, buôn chuyến) |
| Nghề của người nhà | Mỗi người lớn trong hộ có nghề riêng, tự đổi theo đời họ; thu nhập hộ = tổng các nghề |
| Cơ nghiệp (kinh doanh) | `src/data/ventures/`: sạp → cửa hiệu → hiệu buôn; lò gốm, xưởng mộc, thuyền buôn, quán rượu; vốn, người làm, doanh thu theo Thời cơ và danh tiếng; mở rộng, sa sút, phá sản, truyền đời |
| Tìm việc, chuyển nghề | Danh sách việc mở theo nơi ở (điều kiện + thu nhập dự kiến); lời mời qua sự kiện (thầy nhận học việc, người quen giới thiệu, bắt lính); bị đẩy vào do biến cố; mỗi đường là mũi tên dữ liệu của bản đồ chuyển nghề |
| Kỹ năng sâu | Cây chuyên môn theo nghề (GDD 04 §5) |
| Danh mục (~30 nghề) | Sâu: Nông dân, Thương nhân, Lính → Tướng, Thảo khấu, Sĩ tử → Quan văn · Vừa: Thợ mộc, Thợ rèn, Thợ gốm, Thợ dệt / nuôi tằm, Thầy lang, Ngư dân, Chủ thuyền đò, Nha lại, Tăng ni, Chủ quán · Nhẹ: Tá điền, Làm thuê, Ở đợ, Chăn vịt, Bán rong, Phu khuân vác, Làm muối, Kiếm củi, Nấu rượu, Đồ tể, Bà đỡ, Thầy bói, Thầy địa lý, Hát rong, Mõ làng |
| Nội dung đi kèm | Nghề Nhẹ 5–10 sự kiện, Vừa 20–30, Sâu 50+ (tổng ước 250–350 sự kiện mới) |

## Giai đoạn 2 trở đi

Nền móng đã có: thực thể `Settlement`, loại khu định cư, thang địa vị, `set_career` cho chuyển nghề — xem [09_Lo_Trinh_Can_Bang_Rui_Ro.md](09_Lo_Trinh_Can_Bang_Rui_Ro.md) §2.

## Tiến độ theo Phase (LO_TRINH_HOAN_THIEN.md)

| Phase | Tên | Trạng thái | Ghi chú hoàn thành |
| :---: | :--- | :---: | :--- |
| **Phase 1** | **Phòng thử nghiệm & công cụ dev** | ✅ | Schema kịch bản `scenario.ts`, 25 kịch bản thuộc 6 nhóm, GameSession scenario factory, MainMenu tab Thử nghiệm, DevPanel phím `~`, CLI `--scenario <id>`, Vitest 10 năm qua 100%, build sạch. |
| **Phase 2** | **Tách hộ, thừa kế, chế độ số phận** | ✅ | Đóng GĐ1.5: `split.ts`, `inheritance.ts` (luật hương hỏa Nho giáo), `fate_modes.yaml` (Bình lặng / Đời thực / Khắc nghiệt), đỡ xui (`bad_luck_protection`), điềm báo trước cái chết, UI Nhà cha mẹ / Nhà anh em & dòng chốt sổ thừa kế/phân gia, 5 kịch bản Phase 2, nâng `SAVE_VERSION = 3`. *Nợ nội dung*: chuỗi sự kiện tranh gia tài sâu, giỗ chạp, cư tang riêng theo từng xuất thân. |
| **Phase 3** | **Truyền đời (Dynasty)** | ✅ | Đóng GĐ2: `Dynasty.ts`, `succession.ts`, `SuccessionModal.tsx`, `FamilyTreeModal.tsx`, `DynastySummaryModal.tsx`, nâng `SAVE_VERSION = 3`. |
| **Phase 4** | **Dòng họ làng, vai trò truyền đời, hôn nhân có chọn lọc** | ✅ | Đóng GĐ3: `Clan`, dòng họ làng, chuyển giao vai trò làng khi mất, sính lễ & môn đăng hộ đối (`marriage.ts`), 6 kịch bản hôn nhân/dòng họ. |
| **Phase 5** | **Nghề nghiệp v2 (khung)** | ✅ | Schema nghề v2 (`sector`, `depth`, `settlement_types`, `work_effects`, `exits`, `min_years`, `min_skill`, `min_reputation`, `income_range`, `side_jobs`), thâm niên (`tenure`, `sectorMonths`) & lý lịch nghề (`careerHistory`), nghề tay trái theo mùa (`sideJob`), nghề riêng của người nhà (`family_work`), tìm việc/chuyển nghề mở rộng, 10 nghề Nhẹ/Vừa mới + 5 việc nông nhàn, 22 sự kiện nghề mới (`nghe_nghiep_v2.yaml`), 10 kịch bản mới (`scenarios/nghe_nghiep.yaml`), nâng `SAVE_VERSION = 4`. *Nợ nội dung*: ~15 nghề Nhẹ/Vừa còn lại và hàng trăm sự kiện chuyên sâu theo nghề (làm ở Phase 9). |
| **Phase 6** | **Cơ nghiệp & tài sản** | ✅ | `src/data/ventures/ventures.yaml` + `ventureSchema` (chuỗi `sap_nho` → `cua_hieu` → `hieu_buon`, `lo_gom`, `xuong_moc`, `thuyen_buon`, `quan_ruou`), vòng đời cơ nghiệp (`ventures.ts`: mở, mở rộng, thuê thợ, sa sút, phá sản, truyền đời qua `inheritance.ts`), vay & cho vay gắn với NPC (`NpcLoan`: ân tình, thiện cảm, thù oán họ tộc, sự kiện đòi nợ `kt_chu_no_den_doi`), nâng cấp nhà ở (`nha_tranh` → `nha_go` → `phu_nho` đổi cảnh pixel), UI `PropertiesPanel.tsx`, 5 kịch bản Phase 6 (`kinh_te.yaml`), nâng `SAVE_VERSION = 5`. *Nợ nội dung*: chuỗi sự kiện chuyên sâu theo từng loại cơ nghiệp. |
| **Phase 7** | **Một vùng: làng – thị trấn – phủ** | ✅ | 3 khu định cư vùng (`lang_nong`, `thi_tran_ben_song`, `phu_thanh`) trong `settlement_types.yaml` và `region.ts`, mỗi nơi có giá lúa, Thời cơ, dân cư thưa, thiên tai và dịch bệnh (`ta_ly`, `sot_ret`, `dau_mua_soi`) lan theo tuyến giao thương; chuyển nhà (`relocateHousehold`: bán hoặc giữ ruộng cũ thu tô), đi buôn chuyến xa nhà (`startTradeTrip` / `cancelActiveTrip`), lên phủ nhậm chức quan văn (`appointPrefectureOfficial`); cảnh pixel `phu_thanh` (`tuong_thanh_viet`, `cong_phu_viet`, `co_hieu_viet`, `duong_da_viet`) đổi theo nơi đang có mặt; UI `RegionMapModal.tsx`, 5 sự kiện quyết định + 4 mẫu nhật ký (`vung_mien.yaml`), 4 kịch bản Phase 7 (`scenarios/vung_mien.yaml`), nâng `SAVE_VERSION = 6`. *Nợ nội dung*: thêm nhiều sự kiện và nhật ký riêng của phủ, đường đi, nhà trọ (mở rộng ở Phase 9). |
