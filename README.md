# Dòng Đời — Life & Dynasty Simulation

> *Không phải mọi cuộc đời đều vĩ đại. Nhưng mọi cuộc đời đều có thể để lại dấu vết trong lịch sử.*

**Dòng Đời** (tên tạm tiếng Anh: *Legacy of Ages*) là game mô phỏng cuộc đời, gia tộc và lịch sử, chơi trên web, đồ họa pixel art 2D. Bạn sinh ra trong một làng quê kiểu Đại Việt thế kỷ 11 và sống một đời người: cày cấy, vay nợ, đi học, chạy lụt, tang ma, cưới hỏi. Mọi lựa chọn để lại hậu quả, đôi khi rất nhiều năm sau mới thấy.

Công thức ngắn gọn: **chiều sâu nhân vật và gia tộc của *Crusader Kings III* + nhịp năm nhanh, đời thường của *BitLife / 1in8b***, cộng thêm những thứ riêng:

- **Nông dân cũng là một đời đáng chơi**, không chỉ vua chúa mới có câu chuyện.
- **Hệ thống Thời cơ**: cùng một việc, làm đúng lúc thì thành, sai lúc thì bại. "Chưa phải lúc" cũng là một lựa chọn.
- **Hỗn loạn có nhân quả**: không đoán trước được, nhưng nhìn lại thì hiểu vì sao. Mỗi con số đều có tooltip giải thích nguồn gốc.

---

## Trạng thái: Giai đoạn 0 — Prototype vòng lặp

Mục tiêu GĐ0 là trả lời một câu hỏi: ***vòng lặp một năm có vui và tạo cảm giác nhân quả không?***

| Có trong GĐ0 | Chi tiết |
| :--- | :--- |
| 1 xuất thân | Nông dân, bắt đầu từ 16, 6 hoặc 0 tuổi |
| Thời gian | Tick theo tháng, thời gian tự trôi với tốc độ 1×–12×, có Pause và Auto-pause khi cần quyết định |
| Trọng tâm (Focus) | 8 Focus, chọn 1 chính + 1 phụ khi trưởng thành; tác động lên XP, bộ lọc sự kiện và các modifier |
| Mức sống | 5 bậc (Khổ cực → Xa hoa); mỗi bậc tác động cùng lúc lên chi tiêu, sức khỏe, tinh thần và cảnh pixel |
| Sổ sách hộ | Thu hoạch 2 vụ, thuế, sưu, lãi nợ, mua bán thóc theo giá trôi theo mùa, làm thuê, bị xiết nợ |
| Sự kiện quyết định | 17 storylet, vai trò lấy từ NPC thật, khoảng xác suất hẹp lại khi kỹ năng cao, có chuỗi sự kiện kéo dài nhiều năm |
| Nhật ký dòng đời | Khoảng 75 mẫu (nhiều cách viết, có điều kiện khớp trạng thái thật), cùng điềm báo, tin đồn và câu tổng hợp năm |
| Cảnh pixel 7 lớp | Địa hình · nhà · thời tiết · người · tài sản · tình trạng (ngập lụt, mất mùa, nghèo đói, thịnh vượng) · hiệu ứng hạt |
| Tử vong | Rủi ro theo tháng: tuổi × sức khỏe × modifier; cái chết nào cũng ghi nguyên nhân; có cơ chế chống xui liên tiếp |
| Công cụ | Mô phỏng headless 1.000 đời với 5 bot, kiểm tra chéo dữ liệu, test tất định |

Đồ họa hiện là **hình khối tạm (placeholder)** vẽ theo `SceneDescriptor`; art thật thay vào sau mà không phải sửa luật chơi.

### KPI cân bằng hiện tại (200 đời mỗi bot, `npm run simulate`)

| Bot | Tuổi thọ TB | Quyết định/năm | Chết bất ngờ | Ruộng cuối đời |
| :--- | :---: | :---: | :---: | :---: |
| An phận | 51.1 | 1.26 | 4.0% | 4.2 sào |
| Tối ưu | 56.1 | 1.25 | 3.5% | 14.4 sào |
| Tham vọng | 48.0 | 1.22 | 1.0% | 10.2 sào |
| Liều lĩnh | 40.7 | 1.09 | 2.5% | 0.1 sào |
| Ngẫu nhiên | 33.6 | 1.21 | 2.5% | 0.3 sào |

Tử vong trẻ em (bắt đầu từ 0 tuổi): **19.3%**, nằm trong mục tiêu 15–25%. Cách chơi cẩn thận thì sống lâu, xài quá khả năng thì mất ruộng, nợ chồng và chết sớm: quyết định có hậu quả thật.

**Vấn đề đã biết:** tỷ lệ gặp lại cùng một sự kiện trong một đời còn cao (khoảng 70%), vì GĐ0 mới có 17 sự kiện. GĐ1 cần 30–50 mẫu để đạt mục tiêu "gần như không lặp".

---

## Chạy thử

Yêu cầu: Node.js 20+.

```bash
npm install
npm run dev          # mở http://localhost:5173
```

| Lệnh | Việc |
| :--- | :--- |
| `npm run dev` | Chạy game (Vite; sửa YAML trong `src/data/` thì trang tự tải lại, ván đang chơi giữ trong bản lưu) |
| `npm run build` | Typecheck + build bản phát hành vào `dist/` |
| `npm test` | Test lõi (RNG tất định, DSL, modifier, lưu/tải) và test dữ liệu |
| `npm run validate` | Kiểm tra toàn bộ `src/data/`: Zod schema, id tham chiếu, biến DSL, token văn bản |
| `npm run simulate -- --lives 200` | Mô phỏng headless, in KPI cân bằng (`--bot toi_uu`, `--start-age 0`, `--seed x`) |
| `npm run trace -- --bot an_phan --seed x` | In diễn biến từng năm của một đời để chẩn đoán cân bằng |
| `npm run lint` | ESLint: chặn `src/core` dùng Phaser/React/DOM/`Math.random` |

---

## Kiến trúc

Lõi mô phỏng là **TypeScript thuần**, chạy được trên Node (headless) lẫn trình duyệt. Phaser chỉ vẽ, React chỉ hiển thị và gửi lệnh.

```text
src/data/ (YAML/JSON)            ← mọi con số, chữ, sự kiện, luật cảnh
   ↓  Zod
@content  (schemas + ContentLoader)
   ↓
@core     (engine · entities · systems · events · scene-descriptor · api)   ← tất định theo seed
   ↓
@bridge   (GameStore: nhịp thời gian thực, lưu IndexedDB, Notifications)
   ├──→ @game (Phaser: ghép 7 lớp cảnh từ SceneDescriptor)
   └──→ @ui   (React: HUD, EventCard, sổ sách, chợ, tổng kết đời)
```

Các module nền tảng của lõi (`src/core/engine/`):

- **`Rng`**: mulberry32 có seed, tách luồng theo hệ thống, lưu được trạng thái. Cùng seed và cùng lựa chọn thì ra cùng một đời (có test).
- **`ModifierSystem`**: mọi tác động đều mang nguồn, nên UI giải thích được "vì sao sức khỏe giảm 1,4 mỗi năm".
- **`RuleEvaluator`**: DSL điều kiện dạng cấu trúc (`all` / `any` / `not` / `var op value`...), dùng chung cho sự kiện, Focus, modifier có điều kiện, luật cảnh và nguyên nhân tử vong.
- **`GameClock`**: tick tháng và tổng kết năm. Lõi không có đồng hồ thực; `@bridge` gọi `tickMonth()` theo tốc độ người chơi chọn.
- **`SaveSystem`**: lưu qua `StorageAdapter` (IndexedDB ở trình duyệt, bộ nhớ ở Node).

### Cấu trúc thư mục chính

```text
src/
├─ data/            nội dung game: balance/, focuses/, skills/, traits/, properties/,
│                   origins/, cultures/, events/{common,ambient}/, lang/
├─ content/         Zod schema + ContentLoader (+ nguồn Vite)
├─ core/            lõi mô phỏng thuần TS
│  ├─ engine/       Rng, GameClock, ModifierSystem, RuleEvaluator, SaveSystem
│  ├─ entities/     Character, Household, Property, World (GameState)
│  ├─ systems/      life, skills, economy, modifiers, resolver (DSL ↔ trạng thái)
│  ├─ events/       Director, decision, journal, effects, selection
│  ├─ scene-descriptor/
│  └─ api/          GameSession, commands, queries
├─ bridge/          GameStore, Notifications, IndexedDbStorage
├─ game/            Phaser: scenes/, scene-layers/ (7 lớp + hạt)
├─ ui/              React: screens/ (MainMenu, LifeHud, LifeSummary), components/
└─ shared/          nội suy bảng, điền token văn bản
tools/
├─ simulate/        bot + KPI headless
├─ validate-content/
└─ shared/          nạp src/data/ trên Node
public/assets/      hình vẽ tạm của cảnh (scene-art.json) — sau thay bằng sprite thật
docs/               bộ GDD 00–09 và phân tích tổng thể
```

---

## Viết nội dung (không cần đụng code)

Mọi sự kiện, nhật ký, Focus, tài sản, con số cân bằng và chữ giao diện nằm trong `src/data/`. Ví dụ một dòng nhật ký có điều kiện thật, nhiều cách viết, phản ứng theo tính cách và gieo mầm tính cách mới:

```yaml
- id: cho_nha_ba_ho_duoi
  kind: chuyen_vat
  condition: { var: player.age, op: between, value: [5, 13] }
  roles: [{ id: ba_ho, from: village, village_role: ba_ho }]   # phải có bá hộ thật trong làng
  weight: 6
  cooldown_years: 5
  variants:
    - 'Bạn bị chó nhà {role.ba_ho.call} đuổi, té xuống ruộng.'
    - 'Con chó nhà {role.ba_ho.call} đuổi bạn chạy một mạch về nhà.'
  trait_reactions:
    can_dam: 'Bạn nhặt cục đất ném lại nó.'
  effects:
    - { type: stress, value: 1 }
    - { type: chance, p: 0.15, then: [{ type: add_trait, trait: than_trong }] }
```

Danh sách biến DSL, loại hậu quả và token văn bản xem ở [src/data/README.md](src/data/README.md). Sửa xong thì chạy `npm run validate`.

---

## Lộ trình

| GĐ | Tên | Câu hỏi kiểm chứng |
| :---: | :--- | :--- |
| **0** | **Prototype vòng lặp** ← *đang ở đây* | Vòng lặp một năm có vui không? |
| 1 | Core Life Simulator: khuôn Nho giáo, 3 xuất thân, 4 nghề, Thời cơ, Hạnh phúc tâm lý | Một đời người có hấp dẫn không? |
| 2 | Dynasty Simulator: con cái, thừa kế, gia phả, AI NPC | Nhân vật chết rồi, có muốn chơi tiếp đời con không? |
| 3 | Kingdom Simulator: bản đồ, chính trị, quân sự, nổi dậy | Từ dân thường lên nắm quyền được không? |
| 4 | Living World: nhiều vùng, LOD đầy đủ, thiên tai, dịch bệnh | Thế giới có đáng khám phá khi không làm vua? |
| 5 | Legacy of Ages: hệ thống thời đại, các mốc lịch sử | Chiến dịch nhiều thế kỷ có giữ được hứng thú? |

Chi tiết thiết kế: [docs/00_Tong_Quan_GDD.md](docs/00_Tong_Quan_GDD.md) → [docs/09_Lo_Trinh_Can_Bang_Rui_Ro.md](docs/09_Lo_Trinh_Can_Bang_Rui_Ro.md), tổng hợp ở [docs/PHAN_TICH_TONG_THE_GDD.md](docs/PHAN_TICH_TONG_THE_GDD.md).

## Quy tắc đóng góp

- **Không hard-code**: code chỉ chứa cơ chế; mọi con số, chữ, danh sách đặt trong `src/data/` hoặc `public/assets/` ([.agents/rules/no-hardcode-rule.md](.agents/rules/no-hardcode-rule.md)).
- **`src/core` thuần TypeScript và tất định**: không Phaser, React, DOM, `Math.random`, `Date.now` (ESLint chặn tự động).
- Kiến trúc và quy trình: [.agents/rules/](.agents/rules/).

## Đạo đức thiết kế

Gây nghiện bằng chiều sâu, không bằng thao túng: không phần thưởng đăng nhập, không đếm ngược FOMO, không gacha, không năng lượng hồi theo giờ thực, không bán lợi thế.
