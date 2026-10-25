# Dữ liệu nội dung — tra cứu nhanh cho người viết

Mọi thứ trong thư mục này được kiểm bằng Zod lúc nạp (`src/content/schemas/`). Sửa xong chạy:

```bash
npm run validate     # schema + id tham chiếu + biến DSL + token văn bản
npm run simulate     # xem KPI cân bằng có lệch không
```

| Thư mục / file | Nội dung |
| :--- | :--- |
| `balance/time.yaml` | Năm bắt đầu, mili-giây mỗi tháng, các mức tốc độ, tự lưu |
| `balance/calendar.yaml` | Mùa, thời tiết theo tháng |
| `balance/life.yaml` | Giai đoạn đời, trần sức khỏe theo tuổi, tử vong theo tuổi, nguyên nhân chết |
| `balance/skills.yaml` | Đường cong XP, hệ số học theo tuổi, hiệu lực Focus phụ |
| `balance/economy.yaml` | Thu hoạch, sức lao động, được/mất mùa, giá thóc theo tháng, thuế, nợ, làm thuê |
| `balance/living_standards.yaml` | 5 bậc mức sống |
| `balance/director.yaml` | Event Director: số quyết định/năm, căng thẳng, gộp nhật ký, khoảng xác suất |
| `balance/modifiers.yaml` | Modifier có điều kiện (mùa đông, nợ nần, tuổi tác...) |
| `balance/display.yaml` | Dải chữ (sức khỏe "Khá"...), luật "Việc dang dở", ngôn ngữ mặc định |
| `balance/scene.yaml` | Luật suy ra tình trạng cảnh và hiệu ứng hạt |
| `focuses/`, `skills/`, `traits/`, `properties/` | Focus, 7 kỹ năng, 16 tính cách, loại tài sản |
| `origins/`, `cultures/` | 3 Xuất thân (`nong_dan`, `thuong_nhan`, `quy_toc_nho`), văn hóa (tên, cách xưng hô) |
| `careers/`, `ambitions/`, `diseases/` | 4 Nghề lắp ghép (`nong_dan`, `thuong_nhan`, `linh`, `thao_khau`), tham vọng cả đời, bệnh tật |
| `events/common/`, `events/careers/`, `events/crossover/` | Sự kiện quyết định (làng xã, theo nghề, giao thoa nghề) |
| `events/ambient/` | Mẫu nhật ký dòng đời; `he_thong.yaml` là mẫu do mô phỏng tự gọi (đừng đổi id) |
| `lang/vi.json` | Chữ giao diện |

## Điều kiện (DSL)

```yaml
condition:
  all:
    - { var: household.debt, op: '>', value: 12 }
    - { var: world.season, op: in, value: [ha, thu] }
    - { var: player.age, op: between, value: [16, 50] }
    - { not: { has_flag: duoc_khat_no } }
    - { any: [{ has_property: trau }, { has_trait: can_dam }] }
    - { has_trait: tham_lam, who: chu_no }     # tính cách của vai trò
    - { role: thay, exists: true }
```

Toán tử: `==` `!=` `>` `>=` `<` `<=` `between` `in`.

### Biến

| Biến | Ý nghĩa |
| :--- | :--- |
| `world.year` · `world.month` · `world.month_index` | Năm, tháng (1–12), số tháng từ đầu game |
| `world.season` · `world.weather` | Mùa, thời tiết hiện tại (id trong `calendar.yaml`) |
| `world.harvest_quality` | Trời định năm nay (`duoc_mua`, `binh_thuong`, `kem`, `mat_mua`), ẩn với người chơi |
| `world.food_price` · `world.last_harvest` · `world.months_to_harvest` | Giá thóc, sản lượng vụ trước, số tháng tới vụ gặt |
| `world.trade_index` · `world.military_alert` · `world.patrol_level` | Thời cơ buôn bán, tình hình quân sự (`binh_yen`/`tuan_tra`/`chien_dich`), mức tuần tiễu (0–100) |
| `player.career` · `player.career_rank` · `player.merit` · `player.wanted` | Nghề hiện tại, chỉ số bậc nghề, công trạng nghề, mức truy nã |
| `player.<f>` · `self.<f>` · `role.<id>.<f>` · `village.<vai_trò>.<f>` | Thuộc tính nhân vật (xem bảng dưới) |
| `village.<vai_trò>.exists` | Làng có người giữ vai trò đó (còn sống) |
| `household.money` · `food` · `debt` · `living_standard` | Sổ sách hộ |
| `household.members` · `workers` · `farmland` · `food_months` | Số người, người làm được, số sào, thóc đủ ăn mấy tháng |
| `household.property.<id>` | Số lượng một loại tài sản |
| `focus.primary` · `focus.secondary` | Focus đang chọn |
| `flag.<id>` | Cờ đang bật (true/false) |
| `year.decisions` · `year.mourning` | Số quyết định năm nay, năm nay có tang |

Thuộc tính nhân vật `<f>`: `age`, `sex` (`m`/`f`), `health`, `stress`, `alive`, `opinion` (thiện cảm với người chơi), `favor` (ân tình với người chơi), `life_stage`, `in_household`, `is_head`, `trait_count`, `married` (`true`/`false`), `children_count`, `sick` (`true`/`false`), `disease_count`, `reputation`, `satisfaction`, `mood`, `ambition`, `skill.<id>`.

`self` là nhân vật đang xét: ứng viên vai trò, người chịu modifier có điều kiện, người chết (khi chọn nguyên nhân).

## Vai trò (roles)

```yaml
roles:
  - { id: chu_no, from: village, village_role: ba_ho }
  - { id: benh, from: family, relation: member, condition: { var: self.health, op: '<', value: 45 } }
  - { id: thay, from: village, village_role: thay_lang, optional: true }
```

`relation`: `father`, `mother`, `parent`, `sibling`, `member`. `pick`: `random` (mặc định), `oldest`, `youngest`. Thiếu vai trò bắt buộc thì sự kiện không xảy ra (R1: không bịa).

## Hậu quả (effects)

| `type` | Trường | Ghi chú |
| :--- | :--- | :--- |
| `money` / `food` / `debt` | `value`, `ledger?` | `value` là số hoặc `{ var, factor, add, min, max, round }` |
| `health` / `stress` | `value`, `who?` | `who`: `player` (mặc định), id vai trò, hoặc `household` |
| `skill_xp` | `skill`, `value`, `who?` | |
| `modifier` | `target`, `value`, `op?`, `months`, `label`, `who?` | Modifier có thời hạn, hiện trong tooltip |
| `set_flag` / `clear_flag` | `flag`, `years?`, `label?` | Có `label` thì hiện ở "Việc dang dở" |
| `opinion` | `role`, `value` | |
| `property_add` / `property_remove` | `property`, `count` | |
| `schedule_event` | `event`, `months`, `keep_roles?`, `label?` | Chuỗi sự kiện: vài năm sau mới xảy ra |
| `leave_household` | `who` | Người đó rời hộ thật (lấy chồng, ra ở riêng) |
| `add_trait` | `trait`, `who?` | Bỏ qua nếu đã có tính cách đối lập |
| `set_career` | `career`, `rank?` | Chuyển sang nghề mới (mặc định bậc `0`) |
| `career_merit` / `wanted` | `value` | Cộng/trừ công trạng nghề hoặc mức truy nã |
| `log` | `text: [..]`, `importance` | Ghi một dòng ký ức |
| `chance` | `p`, `then: [..]`, `else: [..]` | Gieo mầm ngẫu nhiên |

Chỉ số modifier (`target`): `health.monthly`, `stress.monthly`, `xp.all`, `xp.<kỹ_năng>`, `harvest.yield`, `death_risk`, `living.cost`, `food.consumption`.

## Phương án sự kiện

```yaml
- id: xin_khat
  text: 'Ăn nói khéo léo, xin khất đến cuối năm'
  hint: 'Cần tài ăn nói'
  condition: { ... }                 # ẩn phương án nếu sai
  trait_stress: { nhan_tu: 6 }       # làm trái tính cách thì căng thẳng
  chance: { base: 0.35, skill: ngoai_giao, per_level: 0.04, modifiers: [{ condition: ..., add: 0.2 }] }
  effects: [ ... ]                   # luôn xảy ra
  success: [ ... ]
  failure: [ ... ]
  success_result: [ '...' ]
  failure_result: [ '...' ]
  defer: { months: 5 }               # "Chưa phải lúc": sự kiện quay lại với cùng vai trò
```

## Token văn bản

`{player.name}`, `{role.<id>.call}` (cách người chơi gọi: "cha", "chị Mận", "bá hộ Lộc"), `{role.<id>.name}`, `{role.<id>.given}`, `{village.<vai_trò>.call}`, `{world.settlement}`, `{world.season_name}`, `{world.weather_name}`, `{world.harvest_name}`, cùng mọi biến số ở bảng trên (`{household.debt}`, `{world.food_price}`...). Số lẻ được làm tròn 1 chữ số.

Mẫu hệ thống (`he_thong.yaml`) còn nhận tham số: `{age}`, `{amount}`, `{sao}`, `{food}`, `{money}`, `{skill}`, `{level}`, `{stage}`, `{call}`, `{cause}`, `{title}`, `{items}`.
