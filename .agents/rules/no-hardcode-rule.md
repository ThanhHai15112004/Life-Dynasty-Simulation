---
trigger: always_on
---

# Quy Tắc Cấm Hard-code (Dòng Đời)

Rule bắt buộc cho mọi thay đổi mã nguồn. **Code chỉ chứa cơ chế (cách tính), không chứa nội dung (con số, chữ, danh sách).** Mọi thứ người làm game muốn chỉnh để cân bằng, viết thêm hoặc dịch đều phải nằm trong dữ liệu.

---

## 1. Phải nằm trong `src/data/` (YAML/JSON, có Zod schema)

| Loại | Vị trí | Ví dụ CẤM viết trong code |
| :--- | :--- | :--- |
| Con số cân bằng | `src/data/balance/*.yaml` | Tỷ lệ tử vong, XP mỗi tháng, giá lúa, lãi suất, thuế, ngưỡng sức khỏe, số sự kiện/năm |
| Thời gian, lịch | `src/data/balance/time.yaml`, `calendar.yaml` | Tốc độ `1× 2× 4×`, mili-giây mỗi tháng, tháng thu hoạch, mùa theo tháng |
| Nội dung gameplay | `src/data/focuses/`, `src/data/skills/`, `src/data/traits/`, `src/data/properties/`, `src/data/origins/` | Danh sách Focus, kỹ năng, tính cách, loại tài sản, xuất thân |
| Sự kiện, nhật ký | `src/data/events/**` | Tiêu đề, lời kể, phương án, điều kiện, trọng số, hậu quả |
| Văn hóa, tên gọi | `src/data/cultures/` | Danh sách họ, tên, chức danh |
| Chữ hiển thị UI | `src/data/lang/vi.json` (+ `en.json`) | Nhãn nút, tiêu đề bảng, tên tháng, Can Chi, mô tả mức sức khỏe |
| Luật suy ra cảnh | `src/data/balance/scene.yaml` | Khi nào cảnh là "nghèo đói", "thịnh vượng" |

## 2. Phải nằm trong `public/assets/`

- Bảng màu, kích thước, bố cục hình vẽ tạm (placeholder) của cảnh pixel: `public/assets/common/placeholder/*.json`.
- Hình ảnh, âm thanh, font.

## 3. Được phép trong code

- **Cơ chế**: công thức tổng quát (`tổng modifier`, `nội suy bảng`, `chọn theo trọng số`), vòng lặp tick, máy trạng thái.
- **Khóa tham chiếu** (key/id) dùng để nối code với dữ liệu, gom vào một file hằng số của phân hệ (ví dụ `src/core/events/systemLogKeys.ts`, `src/core/engine/statTargets.ts`). Không rải chuỗi id khắp nơi.
- **Đường dẫn biến của DSL** (`character.age`, `household.money`...) trong bộ phân giải biến của `RuleEvaluator` — đây là API của engine, không phải nội dung.
- Giá trị kỹ thuật thuần (chỉ số mảng, `0`, `1`, phiên bản save, kích thước buffer RNG).
- Thông báo lỗi kỹ thuật cho lập trình viên (`throw new Error(...)`, `ContentError`, `SaveError`) — người chơi không thấy. Lỗi hiển thị cho người chơi phải là mã lỗi tra trong `src/data/lang` (`error.<mã>`).

## 4. Cách kiểm tra trước khi báo xong

1. Tự hỏi: *"Người thiết kế muốn đổi con số/chữ này có phải sửa code không?"* — Nếu có → chuyển ra `src/data/`.
2. Không có chuỗi tiếng Việt hiển thị cho người chơi trong `src/` (trừ comment). Kiểm nhanh:
   ```bash
   grep -rnP "['\"\`][^'\"\`]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][^'\"\`]*['\"\`]" src --include=*.ts --include=*.tsx | grep -v "^\s*//"
   ```
3. Không có "số ma thuật" về cân bằng trong `src/core/systems/` — mọi hệ số đọc từ `content.balance`.
4. Thêm trường dữ liệu mới thì phải thêm vào Zod schema tương ứng ở `src/content/schemas/` và chạy `npm run validate`.
