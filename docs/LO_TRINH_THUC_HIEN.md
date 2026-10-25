# Lộ trình thực hiện — theo dõi từng hạng mục

Cập nhật 25/10/2026. ✅ xong · 🟡 làm một phần · ⬜ chưa làm. Phạm vi và câu hỏi kiểm chứng của từng giai đoạn: [09_Lo_Trinh_Can_Bang_Rui_Ro.md](09_Lo_Trinh_Can_Bang_Rui_Ro.md).

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
| 30–50 mẫu sự kiện | ✅ | 151 sự kiện quyết định (có chuỗi nhiều hồi), 406 mẫu nhật ký; ưu tiên đúng hoàn cảnh nhờ trọng số theo Focus, nghề nhà, nơi ở và giảm dần khi đã gặp |
| Tổng kết đời 5 trục | ✅ | Công thức trong `src/data/balance/life.yaml › summary_axes` |
| Hoạt cảnh (micro-cutscene) | ✅ | Hàng đợi trong core, Phaser phát lần lượt — `public/assets/common/placeholder/cutscenes.json` |
| Cảnh vẽ bằng code từ bộ phận lắp ghép | ✅ | `public/assets/common/scene-kit.json`: bộ phận pixel + bảng màu theo văn hóa và mùa; làng nông và thị trấn bến sông; chân dung dùng chung bộ phận người |
| Biên niên vương triều | ✅ | Đổi vua/niên hiệu, chiến tranh, nạn đói, dịch, chính sự — `src/data/chronicle/` |
| Giao diện kiểu 1in8b | ✅ | Tuổi làm trung tâm, thanh năm trượt liên tục, hồ sơ có chân dung, cảnh có chú thích, nhật ký theo tuổi, gia đình, bản đồ cuộc đời, biên niên |
| KPI cân bằng | 🟡 | Xem mục KPI trong README; tỷ lệ gặp lại sự kiện còn ~20% (mục tiêu 15%), cần thêm nội dung riêng cho nhà buôn |
| Chơi thử trả lời "một đời người có hấp dẫn không?" | ⬜ | cần người chơi thật |

## Giai đoạn 2 trở đi

Chưa bắt đầu. Nền móng đã có: thực thể `Settlement`, loại khu định cư, thang địa vị, `set_career` cho chuyển nghề — xem [09_Lo_Trinh_Can_Bang_Rui_Ro.md](09_Lo_Trinh_Can_Bang_Rui_Ro.md) §2.
