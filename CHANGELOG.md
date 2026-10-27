# Changelog — Dòng Đời (Legacy of Ages)

Mọi thay đổi quan trọng của dự án **Dòng Đời** (`dong-doi`) được ghi nhận tại tài liệu này.

---

## [Chưa phát hành] — 2026-10-27 (Có thứ để mất, có chuyện để kể)

### Lớp câu chuyện (học nguyên tắc từ 1in8b, theo bản sắc Đại Việt)
- **Bốc thăm số phận**: nút "Chào đời", xuất thân rút theo `birth_weight` (`src/data/origins/*.yaml`), mặc định bắt đầu từ 0 tuổi.
- **Giấy khai sinh** và **Thẻ đời** xuất ảnh PNG để lưu/chia sẻ (Web Share trên điện thoại); kích thước & bảng màu ở `display.life_card`.
- **Bạn cùng lứa**: 4 đứa trẻ cùng năm, khác gia cảnh, sống song song theo cùng bảng tử vong; **mốc suy ngẫm** ở 5 · 15 · 30 · 50 · 70 tuổi; **văn bia** theo hoàn cảnh — dữ liệu ở `src/data/story/story.yaml`.
- **Thẻ kết quả** sau mỗi quyết định (tiền, thóc, nợ, sức khỏe, căng thẳng, danh tiếng, lòng người).

### Nhịp & hậu quả
- Ấu thơ trôi nhanh gấp 3 (`time.stage_speed_factor`), nút "Tới quyết định tiếp" (`time.skip_max_months`).
- 25 sự kiện **bước ngoặt** (`buoc_ngoat.yaml`) và 11 sự kiện **giàu rước họa** (`giau_ruoc_hoa.yaml`); 165 câu biến thể mới cho hành động nghề.
- Luật Director mới (`director.yaml`): sự kiện không ghi giai đoạn đời chỉ cho người lớn (`default_event_life_stages`), trần lặp mỗi đời (`max_decision_repeats_per_life`), giới hạn "chưa phải lúc" (`max_defer_fires`), giãn cách bước ngoặt (`major_events`).

### Kinh tế
- Tăng chi sinh hoạt và tiền sưu; thêm **việc làng, việc họ** cuối năm theo số người và theo của cải (`economy.obligations`), **ma chay** khi người nhà mất (`life.funeral`).
- Làm chủ hộ thì mua ruộng/trâu không còn tự động (`economy.auto_manage_defaults`).

### Sửa lỗi
- Trẻ con không còn bị hỏi chuyện mua ruộng, vay nợ; câu nhật ký "nghèo" không còn hiện khi nhà có tiền; "vay 0 quan" → làm tròn lên.
- Hiệu năng: xét điều kiện không cần vai trò trước khi gán vai trò, dùng chung resolver — ~50 → 27–40 ms/năm mô phỏng.

---

## [1.0.0] — 2026-10-26 (Bản phát hành hoàn chỉnh v1.0 — Giai đoạn 0 → 2)

### Nền tảng & Truyền đời (Phases 0–3)
- **Vòng lặp cuộc đời trọn vẹn (0–80+ tuổi)**: 6 giai đoạn đời (*Ấu thơ, Thiếu thời, Thanh niên, Lập nghiệp, Trung niên, Tuổi già*), lịch Can Chi, mùa vụ, thời tiết, sức khỏe, bệnh tật, tâm lý hạnh phúc 3 tầng và Bản tổng kết đời 5 trục.
- **Ba chế độ số phận & Hai chế độ chơi**: *Đời bình lặng, Đời thực, Số phận khắc nghiệt*; hỗ trợ chơi *Một đời (One Life)* hoặc *Truyền đời dòng họ (Dynasty)*.
- **Hệ thống truyền đời & Gia phả (Phase 3)**: phân gia tách hộ khi lập gia đình, chia thừa kế có chúc thư / không chúc thư, chọn người kế vị theo luật Nho giáo (con trưởng, con thứ, con nuôi, con gái, cháu, họ hàng xa), cơ chế giám hộ khi kế vị lúc nhỏ, Cây gia phả đa thế hệ, Di nguyện tổ tiên và Sử sách các đời.

### Xã hội Làng xã, Nghề nghiệp & Cơ nghiệp (Phases 4–7)
- **Xã hội làng xã & Chợ hôn nhân (Phase 4)**: 5–8 dòng họ NPC trong làng tự vận hành bằng Character AI T1 (tự cưới gả, sinh con, đổi nghề, giữ cân bằng dân số); Chợ hôn nhân mai mối (*Môn đăng hộ đối, Trèo cao, Hạ mình*), sính lễ / của hồi môn và xác suất con cái cãi lời theo tính cách; 3 hướng nuôi dạy con cái từ 6–15 tuổi (*Đi học, Học nghề, Phụ việc nhà*).
- **Hệ thống Nghề nghiệp v2 (Phase 5)**: 17 nghề nghiệp thuộc 8 ngành (*4 nghề sâu: Nông dân, Thương nhân, Quan văn / Sĩ tử, Lính, Thảo khấu; 10 nghề nhẹ & vừa: Tá điền, Làm thuê, Thợ mộc, Thợ rèn, Thầy lang, Ngư dân, Chủ đò, Nha lại, Bán rong, Bà đỡ*), thưởng thu nhập theo thâm niên ngành, nghề riêng của từng thành viên trong hộ, 6 nghề tay trái mùa nông nhàn và bản đồ lối ra chuyển nghề.
- **Tài sản, Cơ nghiệp & Tín dụng NPC (Phase 6)**: nâng cấp nhà ở (*Nhà tranh → Nhà gỗ ba gian → Phủ đệ ngói đỏ*), mở và mở rộng 7 loại cơ nghiệp kinh doanh có thuê nhân công, vay và cho vay gắn với chủ nợ/con nợ NPC cụ thể kèm hệ quả ân tình, đòi nợ, xiết tài sản.
- **Bản đồ Vùng 3 điểm (Phase 7)**: kết nối *Làng nông nghiệp – Thị trấn bến sông – Phủ thành*, đi buôn chuyến đường xa có vốn hàng & sự cố ở nhà, chuyển hộ định cư, bổ nhiệm nhậm chức tại Phủ thành và dịch bệnh lan truyền theo tuyến giao thương.

### Trải nghiệm người chơi, Cân bằng & Đóng gói v1.0 (Phases 8–9)
- **Hướng dẫn mở dần & Minh bạch chỉ số (Phase 8)**: gợi ý ván đầu tiên, mở dần bảng giao diện theo độ tuổi, giải thích *"Vì sao"* ở mọi chỉ số, 4 ô lưu IndexedDB có kiểm tra save hỏng và xuất/nhập file `.json`, `AudioManager` theo tâm trạng/môi trường, phím tắt bàn phím, bố cục 1 cột cho màn hình hẹp (Mobile) và `ErrorBoundary` từng vùng.
- **Cân bằng 5 Bot, Hiệu năng 200 năm & Đóng gói v1.0 (Phase 9)**:
  - Kiểm thử tự động với 5 bot (*an phận, liều lĩnh, tham vọng, ngẫu nhiên, tối ưu*) qua nhiều thế hệ, chống lối mòn chiến lược.
  - Cắt tỉa nhật ký thường quá hạn (giữ trọn vẹn dòng dấu mốc `highlight`), dọn NPC ngoại tộc đã mất lâu năm và nén từ điển `DDSLZ1:` trong `SaveSystem` giúp bản lưu sau 200 năm luôn gọn nhẹ.
  - Công cụ `npm run validate` tự động kiểm tra độ dày nội dung theo ngưỡng dữ liệu và kiểm tra đồng bộ 100% khóa song ngữ `vi.json` ↔ `en.json`.
  - Hỗ trợ đóng gói PWA cho Web (`manifest.webmanifest`, Service Worker `sw.js`, màn hình chờ) và cấu hình Tauri v2 cho PC (`src-tauri/`).
