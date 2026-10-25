---
trigger: always_on
---

# Quy Chuẩn Kiến Trúc & Cấu Trúc Dự Án (Dòng Đời)

Rule này quy định chi tiết cấu trúc thư mục, bộ công nghệ, phân định ranh giới giữa các tầng và nguyên tắc tổ chức mã nguồn cho dự án **Dòng Đời** (`dong-doi` / `legacyOfAce`).

---

## 1. Bộ Công Nghệ Chuẩn (Tech Stack)

| Lớp | Công nghệ | Vai trò |
| :--- | :--- | :--- |
| **Ngôn ngữ** | **TypeScript** | Dữ liệu và hệ thống của game rất nhiều, có kiểu dữ liệu giúp đỡ vỡ khi dự án lớn. |
| **Lõi mô phỏng** | **TypeScript thuần, không phụ thuộc Phaser** | Nhân vật, kinh tế, sự kiện, AI, RNG có seed. Chạy được trên Node để test và trong Web Worker để không giật hình. |
| **Hình ảnh** | **Phaser 4 (hoặc Phaser 3.86+)** | Cảnh pixel, bản đồ, cutscene. Chỉ đọc “Scene Descriptor” từ lõi. |
| **Giao diện** | **React, Svelte hoặc Preact (HTML/CSS đè lên canvas)** | Hồ sơ, sự kiện, gia phả, bảng, menu. |
| **Build** | **Vite** | Nhanh, hợp với Phaser và TypeScript. |
| **Dữ liệu nội dung** | **JSON/YAML + Zod để kiểm tra** | Sự kiện, nghề, khuôn văn minh. Viết sai dữ liệu thì báo lỗi ngay. |
| **Test và cân bằng** | **Vitest + script Node chạy mô phỏng headless** | Đo các KPI cân bằng, tự chạy 1.000 đời không cần màn hình. |
| **Lưu game** | **IndexedDB** | Lưu kiểu delta như GDD. |
| **Đóng gói** | **Capacitor (Android/iOS), Tauri hoặc Electron (PC/Steam)** | Một codebase cho mọi nền tảng. |

---

## 2. Cấu Trúc Thư Mục Chuẩn & Lộ Trình Giai Đoạn (`[0]` → `[5]`)

Các nhãn `[0]`, `[1]`, `[2]`, `[3]`, `[4]`, `[5]` biểu thị giai đoạn phát triển (Milestone/Phase) của từng thành phần:

```text
dong-doi/
├─ public/
│  └─ assets/                         ← hình ảnh, âm thanh (giống Assets/Art bên Unity)
│     ├─ common/                      ← dùng chung mọi khuôn văn minh
│     │  ├─ terrain/          [0]     ← nền địa hình: đồng lúa, rừng, ven sông... theo 4 mùa
│     │  ├─ effects/          [1]     ← mưa, tuyết, khói bếp, lửa, nước lụt
│     │  └─ ui/               [0]     ← icon, khung, nút
│     ├─ civilizations/               ← bộ hình riêng của từng khuôn văn minh
│     │  └─ nho_giao/         [1]
│     │     ├─ buildings/             ← nhà tranh → nhà gỗ 3 gian → phủ đệ → hoàng thành
│     │     ├─ characters/            ← người và trang phục theo tầng lớp
│     │     └─ props/                 ← trâu, kho lúa, xe hàng, thuyền
│     ├─ map/                 [3]     ← bản đồ pixel các tỉnh
│     ├─ audio/
│     │  ├─ music/            [1]     ← nhạc nền theo khuôn văn minh và tâm trạng
│     │  ├─ ambient/          [1]     ← mưa, gà gáy, chợ, sóng biển
│     │  └─ sfx/              [1]     ← âm báo sự kiện, tiếng bấm
│     └─ fonts/               [0]     ← font hiển thị tốt tiếng Việt
│
├─ src/data/                          ← nội dung game (đặt trong src/ — quyết định 25/10/2026) (giống ScriptableObject bên Unity)
│  ├─ balance/                [0]     ← các con số để chỉnh: tử vong, tốc độ học, giá cả, chế độ số phận
│  ├─ origins/                [0]     ← xuất thân: nông dân, thương nhân, quý tộc nhỏ
│  ├─ focuses/                [0]     ← Trọng tâm: Học tập, Kinh doanh, Quân sự...
│  ├─ traits/                 [0]     ← tính cách
│  ├─ skills/                 [0]     ← 7 kỹ năng
│  ├─ properties/             [0]     ← loại tài sản: nhà, ruộng, trâu, cửa hàng, thuyền
│  ├─ events/
│  │  ├─ ambient/             [0]     ← sự kiện thường (nhật ký dòng đời mỗi năm: 40–60 mẫu GĐ0, 150–250 mẫu GĐ1)
│  │  ├─ common/              [0]     ← sự kiện quyết định ai cũng gặp: bệnh, cưới, mất mùa
│  │  ├─ careers/             [1]     ← theo nghề, bậc nghề, lối sống
│  │  ├─ crossover/           [1]     ← giao thoa nghề: thương nhân gặp thảo khấu
│  │  ├─ civilizations/       [1]     ← theo khuôn văn minh: khoa cử, cư tang
│  │  └─ history/             [4]     ← sự kiện lịch sử thật
│  ├─ ambitions/              [1]     ← tham vọng cả đời và các mốc phụ
│  ├─ careers/                [1]     ← "hợp đồng nghề": nông dân, thương nhân, lính, thảo khấu
│  ├─ diseases/               [1]     ← bệnh, mức nặng, cách chữa
│  ├─ civilizations/          [1]     ← khuôn văn minh: nho_giao.yaml
│  ├─ cultures/               [1]     ← văn hóa: tên người, chức danh, cách đặt tên làng
│  ├─ organizations/          [2]     ← loại tổ chức: làng, thương hội, băng cướp, triều đình
│  ├─ lifestyles/             [3]     ← lối sống: hậu cung, chinh chiến, cai trị
│  ├─ ventures/               [3]     ← dự nghiệp: khai hoang, lập băng, xưng vương
│  ├─ world/
│  │  ├─ settlement_types.yaml [1]    ← loại khu định cư: kinh thành, làng nông, cảng...
│  │  ├─ provinces/           [3]     ← các tỉnh, tên theo từng thời kỳ
│  │  ├─ polities/            [3]     ← nhà nước, triều đại, tỉnh thuộc về ai năm nào
│  │  └─ bookmarks/           [5]     ← các mốc lịch sử để chọn năm bắt đầu
│  └─ lang/                   [1]     ← chữ hiển thị: vi.json, en.json
│
├─ src/
│  ├─ main.ts                 [0]     ← điểm khởi động game
│  │
│  ├─ core/                           ← LÕI MÔ PHỎNG: chỉ TypeScript, không dùng Phaser hay React
│  │  ├─ engine/              [0]
│  │  │  ├─ Rng.ts                    ← số ngẫu nhiên có seed (cùng seed thì ra cùng kết quả)
│  │  │  ├─ GameClock.ts              ← thời gian: tick tháng, tổng kết năm
│  │  │  ├─ ModifierSystem.ts         ← cộng trừ chỉ số, có ghi rõ nguồn
│  │  │  ├─ RuleEvaluator.ts          ← kiểm tra điều kiện của sự kiện, nghề, luật
│  │  │  └─ SaveSystem.ts             ← lưu và tải game
│  │  ├─ entities/                    ← khuôn dữ liệu của các đối tượng trong game
│  │  │  ├─ Character.ts      [0]     ← con người
│  │  │  ├─ Household.ts      [0]     ← hộ gia đình (đơn vị giữ tiền, nhà, ruộng)
│  │  │  ├─ Property.ts       [0]     ← tài sản
│  │  │  ├─ Settlement.ts     [1]     ← khu định cư
│  │  │  ├─ Dynasty.ts        [2]     ← dòng họ
│  │  │  ├─ Organization.ts   [2]     ← tổ chức
│  │  │  ├─ Polity.ts         [3]     ← nhà nước, lãnh địa
│  │  │  └─ Province.ts       [3]     ← tỉnh
│  │  ├─ systems/                     ← luật vận hành, chạy mỗi tick
│  │  │  ├─ life/             [0]     ← tuổi, giai đoạn đời, sức khỏe, bệnh, tử vong
│  │  │  ├─ skills/           [0]     ← kỹ năng, kinh nghiệm, Trọng tâm
│  │  │  ├─ economy/          [0]     ← thu chi của hộ, tài sản, mức sống
│  │  │  ├─ traits/           [1]     ← tính cách, stress khi làm trái tính cách
│  │  │  ├─ happiness/        [1]     ← 3 tầng cảm xúc, thích nghi, kỳ vọng, tổng kết đời
│  │  │  ├─ social/           [1]     ← quan hệ, ký ức, danh tiếng, ân tình, bí mật
│  │  │  ├─ family/           [1]     ← hôn nhân, con cái, thừa kế
│  │  │  ├─ career/           [1]     ← nghề và các thành phần nghề, bổn phận
│  │  │  ├─ opportunity/      [1]     ← hệ thống Thời cơ: giá cả dao động, tin đồn
│  │  │  ├─ status/           [2]     ← thang địa vị và các cổng thăng tiến
│  │  │  ├─ organization/     [2]     ← thành viên, chức vụ, kế vị trong tổ chức
│  │  │  ├─ ai/               [2]     ← NPC tự ra quyết định
│  │  │  ├─ politics/         [3]     ← chức vụ, chính danh, phe phái, ngoại giao, luật
│  │  │  ├─ military/         [3]     ← quân đội, chiến tranh
│  │  │  └─ rebellion/        [3]     ← bất mãn, nổi dậy
│  │  ├─ events/              [0]     ← bộ máy sự kiện + Director điều nhịp
│  │  ├─ world/               [1]     ← sinh dân cư, khí hậu, thiên tai; về sau thêm bản đồ, lịch sử
│  │  ├─ chronicle/           [1]     ← biên niên sử, giải thích vì sao thành hay bại
│  │  ├─ scene-descriptor/    [1]     ← đổi trạng thái game thành "mô tả cảnh" để Phaser vẽ
│  │  └─ api/                 [0]
│  │     ├─ GameSession.ts            ← giống GameManager: bắt đầu game, qua năm, chọn, lưu
│  │     ├─ commands.ts               ← các lệnh người chơi gửi vào
│  │     └─ queries.ts                ← các hàm lấy dữ liệu để hiển thị
│  │
│  ├─ content/                [0]     ← đọc file trong src/data/ và báo lỗi nếu viết sai
│  │  ├─ schemas/                     ← quy định mỗi loại file YAML phải có những trường nào
│  │  └─ ContentLoader.ts
│  │
│  ├─ game/                           ← PHASER: chỉ vẽ, không chứa luật chơi
│  │  ├─ scenes/
│  │  │  ├─ BootScene.ts      [0]     ← khởi động
│  │  │  ├─ PreloadScene.ts   [0]     ← tải hình ảnh, âm thanh
│  │  │  ├─ LifeScene.ts      [0]     ← cảnh pixel chính: nhà, ruộng, phố
│  │  │  ├─ CutsceneScene.ts  [1]     ← hoạt cảnh 3–8 giây
│  │  │  └─ MapScene.ts       [3]     ← bản đồ
│  │  ├─ objects/             [0]     ← giống Prefab: HouseSprite, CharacterSprite, WeatherFx
│  │  ├─ scene-layers/        [1]     ← ghép 7 lớp cảnh: địa hình, nhà, thời tiết, người, đồ vật, tình trạng, hiệu ứng
│  │  ├─ cutscenes/           [1]     ← từng hoạt cảnh: thu hoạch, lụt, cưới, vinh quy...
│  │  ├─ asset-manifest.ts    [0]     ← danh sách file hình, âm thanh cần tải
│  │  └─ config.ts            [0]     ← cấu hình Phaser: kích thước, chế độ pixel art
│  │
│  ├─ ui/                             ← REACT: giao diện chữ và bảng (giống Canvas bên Unity)
│  │  ├─ screens/
│  │  │  ├─ MainMenu          [0]
│  │  │  ├─ NewGame           [1]     ← chọn thế giới, chế độ chơi, mức số phận, xuất thân
│  │  │  ├─ LifeHud           [0]     ← màn hình chính: hồ sơ, thời gian, Trọng tâm, hành động
│  │  │  ├─ Character         [1]
│  │  │  ├─ Properties        [1]     ← tài sản và đầu tư
│  │  │  ├─ Career            [1]
│  │  │  ├─ Relations         [1]
│  │  │  ├─ Chronicle         [1]
│  │  │  ├─ LifeSummary       [1]     ← tổng kết đời
│  │  │  ├─ Family            [2]     ← gia đình, gia phả
│  │  │  ├─ Succession        [2]     ← chọn người thừa kế
│  │  │  ├─ Organization      [3]     ← tổ chức, lãnh địa
│  │  │  └─ Map               [3]
│  │  ├─ components/          [0]     ← EventCard, StatBar, Tooltip, ModifierList, TimeBar
│  │  └─ styles/              [0]
│  │
│  ├─ bridge/                         ← cầu nối giữa lõi, Phaser và giao diện
│  │  ├─ GameStore.ts         [0]     ← dữ liệu đang hiển thị trên màn hình
│  │  └─ Notifications.ts     [0]     ← báo tin: năm mới, có sự kiện, nhân vật qua đời
│  │
│  └─ shared/                 [0]     ← hằng số, hàm tiện ích dùng chung
│
├─ tools/                             ← công cụ cho người làm game (giống Editor scripts)
│  ├─ simulate/               [0]     ← tự chạy 1.000 đời không cần màn hình, in số liệu cân bằng
│  ├─ validate-content/       [1]     ← kiểm tra toàn bộ src/data/ trước khi build
│  └─ editors/                [3]     ← trình soạn sự kiện, nghề, bản đồ
│
├─ index.html                 [0]     ← trang web chứa game
├─ vite.config.ts             [0]     ← cấu hình chạy thử và build
├─ tsconfig.json              [0]     ← cấu hình TypeScript, đặt đường tắt @core, @game, @ui
├─ eslint.config.js           [0]     ← tự báo lỗi nếu core lỡ dùng Phaser hoặc React
└─ package.json               [0]     ← danh sách thư viện
```

---

## 3. Quy Tắc Ranh Giới Phụ Thuộc (Dependency Flow)

Luồng phụ thuộc một chiều bắt buộc:

```text
src/data/ (YAML/JSON)
  ↓
@content (Zod Schemas + ContentLoader)
  ↓
@core (Pure TypeScript Simulation: engine, entities, systems, events, world, chronicle, scene-descriptor, api)
  ↓
@bridge (GameStore, Notifications)
  ├──→ @game (Phaser Scenes, Objects, 7 Scene Layers, Cutscenes — chỉ đọc SceneDescriptor để vẽ)
  └──→ @ui   (React Screens & Components — chỉ đọc Queries/GameStore và gửi Commands)
```

1. **Path Aliases chuẩn (`tsconfig.json` & `vite.config.ts`)**:
   - `@core/*` → `src/core/*`
   - `@content/*` → `src/content/*`
   - `@game/*` → `src/game/*`
   - `@ui/*` → `src/ui/*`
   - `@bridge/*` → `src/bridge/*`
   - `@shared/*` → `src/shared/*`
2. **Quy tắc cấm trong `@core`**:
   - Không import `phaser`, `react`, `react-dom`, `@game/*`, `@ui/*`.
   - Không truy cập `window`, `document`, `localStorage` trực tiếp trong logic mô phỏng (riêng `SaveSystem.ts` giao tiếp qua adapter lưu trữ để khi chạy headless trên Node.js không bị lỗi thiếu DOM/IndexedDB).
   - Không dùng `Math.random()` — bắt buộc dùng `Rng.ts` có seed để tái lập 100% kết quả mô phỏng.
3. **Quy tắc tổ chức file trong từng phân hệ**:
   - Đặt tên Class, Entity, Scene, Component theo `PascalCase` (`Character.ts`, `GameSession.ts`, `BootScene.ts`).
   - Đặt tên file nhóm hàm hoặc cấu hình theo đúng quy ước thư mục (`commands.ts`, `queries.ts`, `asset-manifest.ts`, `config.ts`).
   - Khi một phân hệ trong `src/core/systems/<tên>/` hoặc màn hình trong `src/ui/screens/<tên>/` lớn dần, chủ động tách nhỏ các file nội bộ (`types.ts`, `constants.ts`, `helpers.ts`, sub-components) thay vì dồn vào một file quá 400 dòng.

