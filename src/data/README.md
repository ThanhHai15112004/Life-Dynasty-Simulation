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
| `balance/life.yaml` | Giai đoạn đời, trần sức khỏe theo tuổi, tử vong theo tuổi, nguyên nhân chết, hôn nhân, hạnh phúc (luật hệ giá trị `value_rules`), công thức 5 trục Tổng kết đời (`summary_axes`) |
| `balance/skills.yaml` | Đường cong XP, hệ số học theo tuổi, hiệu lực Focus phụ |
| `balance/economy.yaml` | Thu hoạch, sức lao động, được/mất mùa, giá thóc theo tháng, thuế, nợ, làm thuê, phát canh thu tô (`tenancy`) |
| `balance/opportunity.yaml` | Thời cơ: giá buôn theo tháng, động tĩnh quân sự, tuần tra, truy nã giảm dần |
| `balance/living_standards.yaml` | 5 bậc mức sống |
| `balance/director.yaml` | Event Director: số quyết định/năm, căng thẳng, gộp nhật ký, khoảng xác suất |
| `balance/modifiers.yaml` | Modifier có điều kiện (mùa đông, nợ nần, tuổi tác...) |
| `balance/display.yaml` | Dải chữ (sức khỏe "Khá"...), luật "Việc dang dở", ngôn ngữ mặc định |
| `balance/scene.yaml` | Luật suy ra tình trạng cảnh và hiệu ứng hạt |
| `focuses/`, `skills/`, `traits/`, `properties/` | Focus, 7 kỹ năng, 16 tính cách, loại tài sản |
| `origins/`, `cultures/` | 3 Xuất thân (`nong_dan`, `thuong_nhan`, `quy_toc_nho`), văn hóa (tên, cách xưng hô) |
| `careers/`, `ambitions/`, `diseases/` | 5 Nghề lắp ghép (`nong_dan`, `thuong_nhan`, `linh`, `thao_khau`, `si_tu`), tham vọng cả đời, bệnh tật |
| `chronicle/` | Biên niên vương triều giả tưởng: đổi vua, chiến tranh, nạn đói, dịch, chính sự — chạy song song đời nhân vật |
| `civilizations/`, `world/` | Khuôn văn minh (`nho_giao.yaml`: học vị, thang địa vị, cư tang), loại khu định cư (`settlement_types.yaml`) |
| `events/common/`, `events/careers/`, `events/crossover/`, `events/civilizations/` | Sự kiện quyết định (làng xã, theo nghề, giao thoa nghề, khuôn văn minh) |
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
| `world.exam_stage` · `world.is_exam_year` | Khoa thi năm nay: `huong` (thi Hương), `hoi` (thi Hội – Đình, năm sau thi Hương), `none`; `is_exam_year` = năm thi Hương |
| `world.settlement_type` · `world.local_trade_factor` | Loại khu định cư nơi hộ sống, hệ số buôn bán của nơi đó |
| `player.career` · `player.career_rank` · `player.career_months` · `player.merit` · `player.wanted` | **Nghề riêng** của người chơi ('' khi còn nhỏ; `phu_gia_dinh` / `that_nghiep` khi chưa có nghề), bậc nghề, số tháng làm nghề, công trạng, mức truy nã |
| `household.career` | **Nghề nhà** — nghề nuôi cả hộ (theo xuất thân, đổi khi chủ hộ đổi nghề). Sự kiện "con nhà buôn", "nhà nông" dùng biến này |
| `player.filial_piety` · `player.scholarly_prestige` · `player.exam_degree` · `player.mourning_months` | Hiếu đạo, Danh vọng sĩ phu, Học vị Khoa cử (`none`/`sinh_do`/`huong_cong`/`tien_si`), số tháng đang cư tang |
| `player.status_rank` · `player.origin` | Bậc thang địa vị (`dan_ngheo`…`quan_lai`), xuất thân |
| `player.best_skill` · `player.favor_total` · `player.ambition_progress` | Bậc kỹ năng cao nhất, tổng ân tình, tỷ lệ mốc tham vọng đã đạt (0–1) |
| `player.<f>` · `self.<f>` · `role.<id>.<f>` · `village.<vai_trò>.<f>` | Thuộc tính nhân vật (xem bảng dưới) |
| `village.<vai_trò>.exists` | Làng có người giữ vai trò đó (còn sống) |
| `household.money` · `food` · `debt` · `living_standard` | Sổ sách hộ |
| `household.members` · `workers` · `farmland` · `food_months` | Số người, người làm được, số sào, thóc đủ ăn mấy tháng |
| `household.net_worth` · `household.self_farms` | Giá trị ròng (tiền + tài sản − nợ), hộ có tự cày không (`false`: phát canh thu tô) |
| `household.property.<id>` | Số lượng một loại tài sản |
| `focus.primary` | Trọng tâm đang chọn ('' khi còn quá nhỏ) |
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
| `filial_piety` / `scholarly_prestige` | `value` | Cộng/trừ điểm Hiếu đạo hoặc Danh vọng sĩ phu |
| `set_ambition` | `ambition` | Đặt chí hướng (sự kiện trưởng thành, biến cố); đổi chí hướng thì mốc cũ không còn tính |
| `set_exam_degree` | `degree` | Đạt học vị Khoa cử. Không bao giờ hạ học vị; Học vấn chưa đủ `min_hoc_van` thì chỉ nhận bậc vừa sức. Phát hoạt cảnh `cutscenes.exam_passed` của khuôn văn minh |
| `cutscene` | `id` | Phát hoạt cảnh (id phải có chủ đề trong `public/assets/common/placeholder/cutscenes.json` và chữ `cutscene.<id>.title/subtitle` trong lang) |
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

## Nghề nhà nuôi hộ thế nào (`careers/*.yaml › economy`)

```yaml
economy:
  self_farm: false          # không tự cày: ruộng phát canh, mùa gặt thu tô theo balance.economy.tenancy
  family_wage_month: 0.5    # công mỗi tháng của một người nhà dư sức (mặc định: làm thuê)
  income: { money_month: 0.5, skill: thuong_mai, per_level: 0.15, trade_scaled: true, ledger: buon_ban }
```

`income` tính theo người giỏi kỹ năng đó nhất trong hộ, nên lúc người chơi còn nhỏ thì cha mẹ vẫn nuôi nhà bằng nghề xuất thân. `trade_scaled` nhân thêm `world.trade_index` × hệ số buôn bán của khu định cư. Focus cũng có thể có `income` (tính theo kỹ năng người chơi). `ledger` phải có nhãn `ledger.<id>` trong lang.

## Thang địa vị (`civilizations/*.yaml › status_ranks`)

Xếp từ thấp đến cao; bậc cao nhất có `condition` đúng là địa vị hiện tại (bậc đầu là mặc định). Mỗi bậc có thể kèm `modifiers`. Đổi bậc thì nhật ký ghi `sys.dia_vi_len` / `sys.dia_vi_xuong`.

## Trọng số sự kiện theo nghề và nơi ở

Ngoài Focus, nghề nhà (`careers/*.yaml › event_weights`) và loại khu định cư (`world/settlement_types.yaml › event_weights`) nhân trọng số mọi sự kiện/nhật ký có thẻ tương ứng, ví dụ nhà buôn `{ buon_ban: 2.0, ruong_dong: 0.3 }`. Viết sự kiện mới nhớ gắn `tags` đúng để được ưu tiên đúng hoàn cảnh.

## Biên niên vương triều (`chronicle/*.yaml`)

```yaml
start_reign: Thuận Hòa              # niên hiệu lúc bắt đầu ván
entries:
  - id: nan_doi_lon
    years: [3, 9999]                # khoảng năm (tính từ năm bắt đầu) có thể xảy ra
    chance_per_year: 0.035          # xét mỗi đầu năm
    once: false                     # true: mỗi ván một lần
    cooldown_years: 10
    harvest_quality: mat_mua        # ép trời định năm nay (tùy chọn)
    military_alert: { id: chien_dich, years: 3 }   # khóa động tĩnh quân sự (tùy chọn)
    reign: Bảo An                   # đổi niên hiệu (tùy chọn)
    text: ['... {world.reign} ...'] # ghi vào nhật ký như tin thiên hạ
    effects: [{ type: set_flag, flag: nan_doi, years: 1, label: '...' }]
```

Token thêm: `{world.reign}` (niên hiệu), `{world.reign_year}` (năm thứ mấy của triều). Biên niên là **giả tưởng**, không trình bày như sử thật.

## Trọng tâm theo giai đoạn đời (`focuses/focuses.yaml`)

Mỗi trọng tâm khai báo `life_stages` (giai đoạn có lựa chọn này) và `condition` (lọc theo nghề nhà, nơi ở...). Mỗi lúc chỉ một trọng tâm. `life.yaml › life_stages[].default_focuses` và `careers/*.yaml › default_focus` quyết định trọng tâm tự chọn khi lớn sang giai đoạn mới. Gợi ý tác động dưới mỗi lựa chọn sinh tự động từ `skill_xp`, `income` và các chỉ số trong `display.yaml › focus_hints`.

## Nhà tự lo và chủ hộ

Chỉ chủ hộ mới chỉnh mức sống, mua bán, trả nợ. Đầu mỗi năm, nếu người chơi chưa làm chủ hộ (hoặc chủ hộ để tự động), mức sống chọn theo `living_standards.yaml › auto_rules` và có dư thì trả nợ (giữ lại `auto_repay_keep_months` tháng tiền tiêu).

## Chuyện nhỏ (`minor: true`)

Sự kiện có `minor: true` hiện thành thẻ nhỏ dưới cảnh và **dừng thời gian chờ chọn** như sự kiện thường; bật "Tự quyết chuyện nhỏ" thì game chọn phương án có `default: true` (không có thì phương án đầu). Nhịp xuất hiện ở `director.yaml › minor`: `max_per_year`, `min_months_between`, `min_months_after_decision` (giãn sau một quyết định), `max_repeats_per_life` (một chuyện gặp tối đa bao nhiêu lần mỗi đời). Chuyện của một người cụ thể (bạn cưới vợ, ông lão trong xóm mất…) đặt `once_per_life: true`. Mỗi chuyện nhỏ nên có 2–3 phương án ngắn, đúng một phương án `default`.

## Nghề riêng và nghề nhà (`careers/*.yaml`)

- `careers/*.yaml › kind`: `nghe` (nghề thật: bậc, lương, hành động) hoặc `trang_thai` (chưa có nghề riêng: `phu_gia_dinh`, `that_nghiep`). Người chơi không tự vào được nghề trạng thái, chỉ qua sự kiện / vòng đời.
- **Schema Nghề v2**:
  - `sector`: ngành nghề (`nong_nghiep`, `thu_cong`, `thuong_mai`, `quan_su`, `quan_lai`, `y_thuat`, `giang_ho`, `dich_vu`).
  - `depth`: độ sâu (`nhe`, `vua`, `sau`).
  - `settlement_types`: danh sách loại khu định cư có nghề này.
  - `skills`: kỹ năng gắn với nghề (`primary`, `secondary`).
  - `ranks[]`: mỗi bậc có `min_years` (thâm niên tối thiểu), `min_skill` (`{ skill, level }`), `min_reputation`, `min_merit`, `condition`, `income_month` hoặc `income_range: [min, max]`, `modifiers`.
  - `work_effects`: tác động mỗi tháng khi làm nghề (`health_month`, `stress_month`, `skill_xp: { <skill>: xp }`).
  - `exits`: danh sách đường chuyển nghề trực tiếp (`{ to, rank?, condition?, cost? }`).
  - `event_tags`: thẻ sự kiện gắn với nghề.
- **Việc nông nhàn (`side_jobs` trong `careers.yaml`)**: `id`, `name`, `description`, `seasons` (`xuan`, `ha`, `thu`, `dong`), `settlement_types`, `income_month`, `skill_xp`, `condition` — chỉ làm vào các mùa cho phép và ngoài tháng gặt nếu hộ tự cày.
- **Nghề người nhà**: mỗi người lớn trong hộ có `careerId`, `careerRankIndex`, `careerMonths` riêng và đóng góp thu nhập vào mục sổ `nguoi_nha_lam` (`Ledger.FamilyWork`). Chủ hộ có thể đổi nghề cho người nhà qua lệnh `setMemberCareer`.
- Đến tuổi trưởng thành: nghề nhà có `youth_career` thì bắt đầu bằng nghề đó (nhà nho: Nho sinh), không thì `life.yaml › career_start.helper` (phụ việc nhà) hoặc `.jobless` nếu nhà không có nghề.
- Phụ việc nhà tích `merit_month` công trạng mỗi tháng; làm chủ hộ thì **thừa kế** nghề nhà, công trạng nhân `inherit_merit_factor` rồi xét thăng bậc. Đã có nghề riêng thì nghề nhà đổi theo nghề của chủ hộ.
- Sự kiện chỉ hiện khi lọc xong còn ít nhất 2 phương án.

## Mốc đời bảo đảm (`priority: true`)

Sự kiện có `priority: true` đủ điều kiện là phát ngay ở lượt quyết định kế tiếp, không chờ may rủi (vẫn tôn trọng `min_months_between`). Dùng cho mốc đời ai cũng phải trải qua: chọn chí hướng, `gd_den_tuoi_lap_gia_that` (quá 21 tuổi chưa lập gia đình thì bà mối tìm đến; từ chối thì `cooldown_years` sau hỏi lại).

## Chạy chữa bệnh

- `diseases.yaml`: `cure_cost` (quan mỗi lần chữa), `cure_chance` (xác suất khỏi ngay).
- `life.yaml › treatment`: `retry_months` (chữa không khỏi thì chờ bao lâu mới chữa lại), `auto_severities` + `auto_keep_months` (chưa làm chủ hộ thì nhà tự bỏ tiền chữa bệnh mức nào, miễn còn đủ tiêu chừng ấy tháng).
- Chủ hộ chữa qua lệnh `treatDisease` (nút "Chạy chữa" ở thẻ Gia đình); tiền ghi sổ mục `thuoc_men`.
