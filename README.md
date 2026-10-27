# Dòng Đời — Life & Dynasty Simulation

> *Không phải mọi cuộc đời đều vĩ đại. Nhưng mọi cuộc đời đều có thể để lại dấu vết trong lịch sử.*

**Dòng Đời** (tên tạm tiếng Anh: *Legacy of Ages*) là game mô phỏng cuộc đời, gia tộc và lịch sử, chơi trên web, đồ họa pixel art 2D. Bạn sinh ra trong một làng quê kiểu Đại Việt thế kỷ 11 và sống một đời người: cày cấy, vay nợ, đi học, chạy lụt, tang ma, cưới hỏi. Mọi lựa chọn để lại hậu quả, đôi khi rất nhiều năm sau mới thấy.

Công thức ngắn gọn: **chiều sâu nhân vật và gia tộc của *Crusader Kings III* + nhịp năm nhanh, đời thường của *BitLife / 1in8b***, cộng thêm những thứ riêng:

- **Nông dân cũng là một đời đáng chơi**, không chỉ vua chúa mới có câu chuyện.
- **Hệ thống Thời cơ**: cùng một việc, làm đúng lúc thì thành, sai lúc thì bại. "Chưa phải lúc" cũng là một lựa chọn.
- **Hỗn loạn có nhân quả**: không đoán trước được, nhưng nhìn lại thì hiểu vì sao. Mỗi con số đều có tooltip giải thích nguồn gốc.

---

## Trạng thái: Giai đoạn 1 — Core Life Simulator (code xong, chờ chơi thử)

Câu hỏi kiểm chứng GĐ1: ***sống trọn một đời người (20–40 phút) có hấp dẫn chỉ với quyết định và hậu quả không?*** GĐ0 (vòng lặp một năm) đã xong phần code.

| Có trong GĐ1 | Chi tiết |
| :--- | :--- |
| 3 xuất thân khác cách mưu sinh | Nông dân (làng, tự cày) · Thương nhân (thị trấn bến sông, ruộng phát canh thu tô, lời buôn theo Thời cơ) · Quý tộc nhỏ (nhà nho sa sút, thu tô, dạy học, nợ thể diện) |
| Nghề lắp ghép | Nông dân, Thương nhân, Lính → Tướng, Thảo khấu, Sĩ tử → Quan văn; mỗi nghề quy định hộ tự cày hay phát canh, người nhà làm gì, thu nhập theo kỹ năng nào |
| Khuôn Quan liêu Nho giáo | Hiếu đạo, Danh vọng sĩ phu, Khoa cử (thi Hương → thi Hội – Đình năm sau, học vị cần đủ Học vấn), Cư tang 27 tháng, thang địa vị 5 bậc |
| Thời cơ | Giá buôn theo mùa, động tĩnh quân sự, tuần tra, truy nã |
| Hạnh phúc tâm lý | Tâm trạng · Mãn nguyện · thích nghi; hệ giá trị theo tính cách; Tham vọng cả đời; Tổng kết đời 5 trục |
| Sự kiện | 151 sự kiện quyết định (nhiều chuỗi kéo dài nhiều năm), 406 mẫu nhật ký; ưu tiên đúng hoàn cảnh theo Focus, nghề nhà, nơi ở, giảm dần khi đã gặp; biên niên vương triều giả tưởng chạy song song |
| Cảnh | Vẽ bằng code từ bộ phận lắp ghép (`scene-kit.json`, đổi màu/kiểu theo văn hóa và mùa), đổi theo nơi ở; hoạt cảnh 3–4 giây (vinh quy, cưới, sinh con, tang lễ, bội thu, lũ) |
| Giao diện | Bố cục 3 cột kiểu 1in8b: tuổi làm trung tâm, thanh năm trượt liên tục, hồ sơ có chân dung pixel, nhật ký theo tuổi, gia đình, bản đồ cuộc đời, biên niên |
| Từ GĐ0 | Tick tháng/năm, Focus, mức sống, sổ sách hộ, tử vong có nguyên nhân, mô phỏng headless, kiểm tra dữ liệu, test tất định |

Tiến độ từng hạng mục: [docs/LO_TRINH_THUC_HIEN.md](docs/LO_TRINH_THUC_HIEN.md). Danh sách asset còn thiếu: [docs/ART_CAN_CHUAN_BI.md](docs/ART_CAN_CHUAN_BI.md).

### Lớp câu chuyện & nhịp chơi (27/10/2026)

| Thêm | Chi tiết |
| :--- | :--- |
| Bốc thăm số phận | Nút "Chào đời": xuất thân rút theo `birth_weight` (nông 80 · buôn 12 · nho 8), bắt đầu từ 0 tuổi |
| Giấy khai sinh | Nơi sinh, cha mẹ, gia cảnh, "cứ 100 đứa trẻ thì N đứa vào nhà như thế", tuổi thọ thời ấy — lưu/chia sẻ ảnh PNG |
| Bạn cùng lứa | 4 đứa trẻ cùng năm, khác gia cảnh, sống song song theo cùng bảng tử vong (`src/data/story/story.yaml`) |
| Mốc suy ngẫm | 5 · 15 · 30 · 50 · 70 tuổi: dừng lại hỏi một câu, người chơi viết một dòng, cuối đời đọc lại |
| Thẻ đời | Văn bia theo hoàn cảnh, bản đồ đời, dấu mốc, số phận bạn cùng lứa — xuất ảnh PNG để chia sẻ |
| Thẻ kết quả | Sau mỗi quyết định hiện rõ được/mất (tiền, sức khỏe, lòng người…) |
| Nhịp | Ấu thơ trôi nhanh ×3; nút "Tới quyết định tiếp" (tua tối đa 24 tháng) |
| Bước ngoặt | 25 sự kiện lớn mỗi đời gặp một lần (`buoc_ngoat.yaml`), cách nhau ≥ 4 năm; 11 sự kiện "giàu rước họa" (`giau_ruoc_hoa.yaml`) |
| Kinh tế | Chi sinh hoạt, thuế sưu, việc làng việc họ (thêm phần theo của cải), ma chay; mua ruộng/trâu không còn tự động khi làm chủ hộ |
| Luật sự kiện | Sự kiện không ghi giai đoạn đời chỉ dành cho người lớn; một sự kiện tối đa 3 lần/đời; "chưa phải lúc" hẹn lại tối đa 2 lần |

### Số đo cân bằng (27/10/2026, 6–8 đời mỗi nhóm, bắt đầu 16 tuổi — mẫu nhỏ, chỉ để định hướng)

| Xuất thân | Bot | Tuổi chết TB | Tài sản ròng cuối đời p25 / trung vị / p75 (quan) | Từng nợ > 30 quan |
| :--- | :--- | :---: | :---: | :---: |
| Nông dân | An phận | 48 | −121 / 78 / 95 | 38% |
| Nông dân | Tối ưu | 52 | −78 / 272 / 462 | 50% |
| Nông dân | Liều lĩnh | 32 | −54 / 89 / 159 | 38% |
| Thương nhân | An phận | 60 | 143 / 478 / 714 | 0% |
| Thương nhân | Tối ưu | 56 | −70 / 85 / 91 | 88% |
| Thương nhân | Liều lĩnh | 54 | 30 / 1.827 / 2.066 | 25% |

Trước đợt này mọi đời đều giàu dần lên 1.600–4.700 quan và không nợ suốt đời. Hiệu năng: 27–40 ms mỗi năm mô phỏng (chạy riêng).

**Vấn đề đã biết:** Nhà buôn "tối ưu" hay rơi vào nợ (bot chưa biết né rủi ro buôn chuyến). Vòng nợ lãi 30% sau hai tai họa liên tiếp rất khó thoát, cần thêm lối ra (làm thuê, bỏ làng, họ hàng cứu). Một số câu chữ còn giả định giới tính ("vợ con"). Chưa có người chơi thật thử.

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
| `npm run process-art` | Cắt, tách nền, thu về lưới pixel các ảnh nguồn trong `art-source/` (không commit) → `public/assets/` + `sprites.json`. Vùng cắt khai báo ở `tools/process-art/manifest.json` |

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
├─ process-art/     xử lý ảnh nguồn → sprite
└─ shared/          nạp src/data/ trên Node
public/assets/      sprite đã xử lý, sprites.json, bố cục cảnh (common/scene-layout.json)
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
| 0 | Prototype vòng lặp | Vòng lặp một năm có vui không? |
| **1** | **Core Life Simulator** ← *đang ở đây*: khuôn Nho giáo, 3 xuất thân, 4 nghề, Thời cơ, Hạnh phúc tâm lý | Một đời người có hấp dẫn không? |
| 2 | Dynasty Simulator: con cái, thừa kế, gia phả, AI NPC | Nhân vật chết rồi, có muốn chơi tiếp đời con không? |
| 3 | Kingdom Simulator: bản đồ, chính trị, quân sự, nổi dậy | Từ dân thường lên nắm quyền được không? |
| 4 | Living World: nhiều vùng, LOD đầy đủ, thiên tai, dịch bệnh | Thế giới có đáng khám phá khi không làm vua? |
| 5 | Legacy of Ages: hệ thống thời đại, các mốc lịch sử | Chiến dịch nhiều thế kỷ có giữ được hứng thú? |

Theo dõi tiến độ từng hạng mục (đã xong / làm dở / chưa làm): [docs/LO_TRINH_THUC_HIEN.md](docs/LO_TRINH_THUC_HIEN.md).

Chi tiết thiết kế: [docs/00_Tong_Quan_GDD.md](docs/00_Tong_Quan_GDD.md) → [docs/09_Lo_Trinh_Can_Bang_Rui_Ro.md](docs/09_Lo_Trinh_Can_Bang_Rui_Ro.md), tổng hợp ở [docs/PHAN_TICH_TONG_THE_GDD.md](docs/PHAN_TICH_TONG_THE_GDD.md).

## Quy tắc đóng góp

- **Không hard-code**: code chỉ chứa cơ chế; mọi con số, chữ, danh sách đặt trong `src/data/` hoặc `public/assets/` ([.agents/rules/no-hardcode-rule.md](.agents/rules/no-hardcode-rule.md)).
- **`src/core` thuần TypeScript và tất định**: không Phaser, React, DOM, `Math.random`, `Date.now` (ESLint chặn tự động).
- Kiến trúc và quy trình: [.agents/rules/](.agents/rules/).

## Đạo đức thiết kế

Gây nghiện bằng chiều sâu, không bằng thao túng: không phần thưởng đăng nhập, không đếm ngược FOMO, không gacha, không năng lượng hồi theo giờ thực, không bán lợi thế.
