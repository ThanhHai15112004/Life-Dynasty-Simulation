---
trigger: always_on
---

# Quy Tắc Phát Triển Cốt Lõi Dự Án Game (Dòng Đời)

Rule này chứa các nguyên tắc thực thi toàn cục cho dự án **Dòng Đời** (`legacyOfAce`). Mọi thay đổi mã nguồn bắt buộc tuân thủ trình tự: **Đọc & Đối chiếu → Phân tích theo cấp → Tái sử dụng → Triển khai tối thiểu & đúng tầng → Kiểm tra & Báo cáo**.

---

## 1. Nguyên tắc chung

- Hiểu phần code liên quan trước khi sửa; không đọc toàn bộ repository nếu task không cần.
- Dựa trên codebase thực tế của dự án (TypeScript + Pure Sim Core + Phaser + React + Vite + Zod); không tự bịa tệp, API, schema hoặc luồng.
- Sửa nhỏ nhất nhưng đầy đủ, giữ nguyên hành vi và tính liên kết không liên quan.
- **Tôn trọng tuyệt đối ranh giới 5 tầng**: `@core` (Lõi mô phỏng thuần TS) ↔ `@content` (Zod/Data Loader) ↔ `@bridge` (GameStore/Notifications) ↔ `@game` (Phaser chỉ vẽ) & `@ui` (React chỉ hiển thị bảng/menu).
- Không tự ý phá vỡ schema dữ liệu trong `src/data/`, hợp đồng `GameSession` / `commands` / `queries`, định dạng `SceneDescriptor`, hoặc cấu trúc lưu game (`SaveSystem`).
- Tất cả ghi chú code (comments) và tài liệu kỹ thuật viết bằng **Tiếng Việt** rõ ràng, súc tích.
- Không chạy lệnh Git làm thay đổi repository nếu người dùng chưa yêu cầu.
- Chỉ báo kiểm tra thành công khi đã thực sự chạy lệnh (`typecheck`, `build`, `simulate`...) và quan sát kết quả.

Yêu cầu sửa/thêm/xóa/triển khai cho phép chỉnh mã nguồn. Yêu cầu review, giải thích, lập kế hoạch hoặc viết tài liệu không cho phép sửa mã nguồn nếu chưa được nói rõ.

---

## 2. Phân cấp Task

Luôn chọn cấp thấp nhất phù hợp. Nếu phạm vi tăng trong lúc làm, dừng lại và phân loại lại.

### Cấp 0 — Chỉ đọc
Review, giải thích, tư vấn thiết kế hệ thống mô phỏng, cân bằng chỉ số (game balance), lập kế hoạch, tài liệu.
- Không sửa code, không chạy build/test/lint nếu không cần.

### Cấp 1 — Task nhỏ
Ví dụ: chỉnh thông số trong `src/data/*.yaml` / `src/data/lang/*.json`, đổi nhãn UI, màu sắc, CSS, vị trí sprite/layer nhỏ, sửa 1–3 tệp cục bộ không làm thay đổi công thức lõi hay hợp đồng API giữa `@core` và `@ui`/`@game`.

Trước khi code:
```markdown
## Phân tích nhanh
- Mục tiêu:
- Phạm vi tệp/tầng (`@core` / `@game` / `@ui` / `data`):
- Thành phần có thể tái sử dụng:
- Cách kiểm tra:
```

### Cấp 2 — Task thông thường
Áp dụng khi triển khai logic trong 1 phân hệ (`src/core/systems/*`), thêm loại sự kiện/nghề mới kèm Zod schema (`src/content/schemas/`), thêm màn hình UI (`src/ui/screens/*`) hoặc cảnh Phaser (`src/game/scenes/*`).

Trước khi code:
```markdown
## Phân tích trước khi code
- Mục tiêu và hành vi mong muốn:
- Luồng hiện tại đã kiểm tra:
- Phạm vi tệp/module:
- Thành phần hoặc logic sẽ tái sử dụng:
- Ảnh hưởng, rủi ro và cách kiểm tra:
```

### Cấp 3 — Task lớn hoặc rủi ro cao
Áp dụng khi thay đổi kiến trúc nhiều phân hệ trong `src/core/`, sửa `GameClock`/`Rng`/`ModifierSystem`/`RuleEvaluator`/`SaveSystem`, thay đổi cấu trúc `SceneDescriptor`, hoặc refactor diện rộng.
- Phải phân tích chi tiết mục tiêu, luồng dữ liệu, ảnh hưởng cân bằng game, tương thích savefile và tiêu chí hoàn thành.
- Nếu có thay đổi phá vỡ cấu trúc hoặc chưa được duyệt, phải **dừng lại xin phép trước**.

---

## 3. Tái sử dụng trước khi tạo mới

Trước khi tạo Entity, System, UI Component, Phaser Object hoặc Helper mới:
1. Kiểm tra phân hệ hiện tại (`src/core/systems/<phân_hệ>/`, `src/ui/screens/<màn_hình>/`, `src/game/objects/`).
2. Kiểm tra khu vực dùng chung:
   - Tầng lõi: `src/core/engine/` (`Rng`, `GameClock`, `ModifierSystem`, `RuleEvaluator`, `SaveSystem`).
   - Tầng tiện ích dùng chung: `src/shared/`.
   - Tầng UI dùng chung: `src/ui/components/` (`EventCard`, `StatBar`, `Tooltip`, `ModifierList`, `TimeBar`).

Thứ tự ưu tiên:
```text
1. Dùng lại nguyên trạng → 2. Kết hợp sẵn có → 3. Mở rộng sẵn có → 4. Tách dùng chung mới (≥ 2 nơi dùng) → 5. Tạo mới cục bộ
```

---

## 4. Điều kiện bắt buộc DỪNG LẠI XIN DUYỆT

Dừng và xin ý kiến người dùng nếu giải pháp cần:
- Đưa bất kỳ thư viện hiển thị/DOM nào vào `src/core/`.
- Thay đổi cấu trúc thư mục gốc đã quy hoạch trong `.agents/rules/project-architecture-rule.md`.
- Thay đổi định dạng lưu trữ của `SaveSystem.ts` gây mất tương thích save cũ.
- Thay đổi schema cốt lõi trong `src/content/schemas/` làm hỏng hàng loạt tệp dữ liệu trong `src/data/`.
- Xóa tài nguyên đồ họa/âm thanh trong `public/assets/` hoặc dữ liệu gốc trong `src/data/`.

---

## 5. Kiểm tra theo phạm vi & Báo cáo

- **Cấp 1**: Kiểm tra tệp vừa sửa hoặc chạy `npm run typecheck`.
- **Cấp 2**: Chạy `npm run typecheck` (và `tools/validate-content` hoặc test phân hệ liên quan). Chỉ chạy `npm run build` khi thay đổi cấu hình Vite/TS, alias hoặc tích hợp lớn.
- **Cấp 3**: Chạy kiểm tra toàn diện (`npm run typecheck && npm run build` + chạy mô phỏng headless nếu ảnh hưởng cân bằng lõi).
- **Quy tắc chống lặp**: Không chạy lại cùng một lệnh nếu code chưa thay đổi; không chạy lặp một lệnh quá 2 lần.

### Mẫu báo cáo sau khi code (Cấp 1 & 2)
```markdown
## Kết quả thực hiện
- Tệp đã thêm/sửa:
- Thay đổi chính:
- Thành phần đã tái sử dụng:
- Kiểm tra đã chạy & kết quả:
- Rủi ro hoặc lưu ý (nếu có):
```

