# AGENTS.md — Quy Chuẩn & Bản Đồ Điều Hướng Kỹ Thuật (Dòng Đời / Legacy of Ace)

Tài liệu định hướng kiến trúc và quy tắc thực thi dành cho AI Agent làm việc trên dự án **Dòng Đời** (`dong-doi` / `legacyOfAce`).

---

## 1. BỘ CÔNG NGHỆ CỐT LÕI (TECH STACK)

| Lớp | Công nghệ | Vai trò |
| :--- | :--- | :--- |
| **Ngôn ngữ** | **TypeScript** | Dữ liệu và hệ thống của game rất nhiều, có kiểu dữ liệu tĩnh (`strict: true`) giúp đỡ vỡ khi dự án lớn. |
| **Lõi mô phỏng (`@core`)** | **TypeScript thuần (Zero Phaser/React)** | Nhân vật, kinh tế, sự kiện, AI, RNG có seed. Chạy được trên Node để test headless và trong Web Worker để không giật hình. |
| **Hình ảnh (`@game`)** | **Phaser 4 / Phaser 3.86+** | Cảnh pixel, bản đồ, cutscene. Chỉ đọc **Scene Descriptor** từ lõi mô phỏng, tuyệt đối không chứa luật chơi. |
| **Giao diện (`@ui`)** | **React / Preact (HTML/CSS đè lên canvas)** | Hồ sơ, sự kiện, gia phả, bảng, menu hiển thị trên lớp `#ui-root` đè lên `#game-container`. |
| **Cầu nối (`@bridge`)** | **GameStore & Notifications** | Đồng bộ trạng thái từ `@core` sang `@game` (Phaser) và `@ui` (React). |
| **Dữ liệu nội dung (`src/data/` & `@content`)** | **JSON / YAML + Zod** | Sự kiện, nghề, khuôn văn minh, cân bằng chỉ số. Viết sai dữ liệu thì báo lỗi ngay lúc nạp (`ContentLoader`). |
| **Build & Bundler** | **Vite** | Tốc độ khởi động và HMR nhanh, hỗ trợ Path Aliases (`@core`, `@content`, `@game`, `@ui`, `@bridge`, `@shared`). |
| **Test & Cân bằng (`tools/`)** | **Vitest + Node Headless Simulator** | Tự chạy 1.000 đời không cần màn hình (`tools/simulate/`), đo các KPI cân bằng và kiểm tra dữ liệu (`tools/validate-content/`). |
| **Lưu game** | **IndexedDB** | Lưu trữ kiểu Delta theo thiết kế (`SaveSystem.ts`). |
| **Đóng gói** | **Capacitor (Mobile) / Tauri hoặc Electron (PC/Steam)** | Một codebase duy nhất cho mọi nền tảng. |

---

## 2. NGUYÊN TẮC KIẾN TRÚC BẤT BIẾN (INVIOLABLE RULES)

1. **Cô lập tuyệt đối Lõi mô phỏng (`src/core/`)**:
   - `src/core/` **CHỈ** dùng TypeScript thuần.
   - **CẤM TUYỆT ĐỐI** import `phaser`, `react`, `react-dom`, `window`, `document` hoặc bất kỳ module nào từ `@game/*`, `@ui/*` vào `src/core/`. (Được kiểm soát tự động bởi `eslint.config.js`).
   - Mọi số ngẫu nhiên trong `src/core/` bắt buộc đi qua `src/core/engine/Rng.ts` (Seeded RNG) — **CẤM** dùng `Math.random()` trực tiếp để đảm bảo cùng seed luôn ra cùng kết quả.
2. **Phaser (`src/game/`) chỉ vẽ, không chứa luật chơi**:
   - Phaser chỉ nhận dữ liệu mô tả cảnh từ `src/core/scene-descriptor/` thông qua `@bridge/GameStore` để dựng 7 lớp cảnh (`scene-layers/`), sprites (`objects/`) và hoạt cảnh (`cutscenes/`).
3. **React (`src/ui/`) chỉ hiển thị và gửi lệnh**:
   - Giao diện React đọc dữ liệu qua `src/core/api/queries.ts` (hoặc `@bridge/GameStore`) và gửi thao tác người chơi qua `src/core/api/commands.ts` / `GameSession.ts`. Không tính toán công thức kinh tế/tử vong/sự kiện trong React Component.
4. **Thiết kế hướng dữ liệu (Data-Driven Design tại `src/data/`)**:
   - Không hard-code chỉ số cân bằng, sự kiện, nghề nghiệp, tính cách, văn minh hay chuỗi ngôn ngữ trong code.
   - Đặt dữ liệu tại `src/data/` (YAML/JSON) và kiểm tra kiểu nghiêm ngặt bằng Zod schema tại `src/content/schemas/`.
5. **Chống God-File & Tôn trọng Lộ trình Giai đoạn `[0]` → `[5]`**:
   - Phân tách rõ trách nhiệm từng phân hệ trong `src/core/systems/` (`life`, `skills`, `economy`, `traits`, `happiness`, `social`, `family`, `career`, `opportunity`, `status`, `organization`, `ai`, `politics`, `military`, `rebellion`).
   - Tuân thủ lộ trình phát triển theo nhãn giai đoạn `[0]` → `[5]` trong cấu trúc thư mục.

---

## 3. BẢN ĐỒ TRA CỨU QUY TẮC & TÀI LIỆU GDD (`.agents/rules/` & `docs/`)

- Quy tắc quy trình phát triển cốt lõi (Phân cấp task, Tái sử dụng, Kiểm tra, Báo cáo): [.agents/rules/core-development-rule.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/.agents/rules/core-development-rule.md)
- **Quy tắc cấm hard-code (bắt buộc)** — code chỉ chứa cơ chế, mọi con số/chữ/danh sách nằm trong `src/data/` hoặc `public/assets/`: [.agents/rules/no-hardcode-rule.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/.agents/rules/no-hardcode-rule.md)
- Quy chuẩn kiến trúc & cấu trúc thư mục dự án Dòng Đời: [.agents/rules/project-architecture-rule.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/.agents/rules/project-architecture-rule.md)
- **Phân tích tổng thể kế hoạch GDD & Ánh xạ kiến trúc**: [docs/PHAN_TICH_TONG_THE_GDD.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/PHAN_TICH_TONG_THE_GDD.md)
- **Bộ 10 tài liệu GDD gốc dạng Markdown (`00` → `09`)**:
  - [00_Tong_Quan_GDD.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/00_Tong_Quan_GDD.md) · [01_Gameplay_va_Game_Loop.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/01_Gameplay_va_Game_Loop.md) · [02_Core_Machine_Kien_Truc.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/02_Core_Machine_Kien_Truc.md) · [03_Co_Che_va_He_Thong.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/03_Co_Che_va_He_Thong.md) · [04_He_Thong_Nghe_Nghiep.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/04_He_Thong_Nghe_Nghiep.md)
  - [05_Su_Kien_va_Kich_Ban.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/05_Su_Kien_va_Kich_Ban.md) · [06_The_Gioi_Ban_Do_Lich_Su.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/06_The_Gioi_Ban_Do_Lich_Su.md) · [07_Khuon_Van_Minh.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/07_Khuon_Van_Minh.md) · [08_Pixel_Art_va_Giao_Dien.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/08_Pixel_Art_va_Giao_Dien.md) · [09_Lo_Trinh_Can_Bang_Rui_Ro.md](file:///home/thanhhai/myProjects/GamesProject/legacyOfAce/docs/09_Lo_Trinh_Can_Bang_Rui_Ro.md)

