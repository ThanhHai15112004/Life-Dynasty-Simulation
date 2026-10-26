// Điểm khởi động bản đóng gói PC (Tauri v2) cho Dòng Đời v1.0.0
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Dòng Đời Tauri application");
}
