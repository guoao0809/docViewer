use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMeta {
    pub size: u64,
    pub modified: u64,
    #[serde(rename = "type")]
    pub file_type: String,
}

fn detect_file_type(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.ends_with(".md") || lower.ends_with(".markdown") {
        "markdown".to_string()
    } else if lower.ends_with(".json")
        || lower.ends_with(".yaml")
        || lower.ends_with(".yml")
        || lower.ends_with(".toml")
        || lower.ends_with(".xml")
        || lower.ends_with(".csv")
    {
        "code".to_string()
    } else {
        "text".to_string()
    }
}

fn is_supported_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    let exts = ["md", "markdown", "txt", "json", "yaml", "yml", "toml", "xml", "csv"];
    exts.iter().any(|e| lower.ends_with(&format!(".{}", e)))
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileMeta, String> {
    let path = Path::new(&path);
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;

    let size = metadata.len();
    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    Ok(FileMeta {
        size,
        modified,
        file_type: detect_file_type(file_name),
    })
}

#[tauri::command]
fn read_document(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    let bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let (decoded, _encoding, _had_errors) = encoding_rs::Encoding::for_bom(&bytes)
        .map(|(enc, _)| enc.decode(&bytes))
        .unwrap_or_else(|| encoding_rs::UTF_8.decode(&bytes));

    Ok(decoded.into_owned())
}

#[tauri::command]
fn scan_directory(path: String) -> Result<Vec<serde_json::Value>, String> {
    let path = Path::new(&path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", path.display()));
    }
    scan_dir_recursive(path, 0)
}

fn scan_dir_recursive(path: &Path, depth: u32) -> Result<Vec<serde_json::Value>, String> {
    let mut entries: Vec<serde_json::Value> = Vec::new();

    if depth > 10 {
        return Ok(entries);
    }

    let dir_entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in dir_entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and directories
        if file_name.starts_with('.') {
            continue;
        }

        let file_type = entry.file_type().map_err(|e| e.to_string())?;

        if file_type.is_dir() {
            let children = scan_dir_recursive(&entry_path, depth + 1)?;
            entries.push(serde_json::json!({
                "id": entry_path.to_string_lossy().to_string(),
                "name": file_name,
                "path": entry_path.to_string_lossy().to_string(),
                "type": "text",
                "size": 0,
                "modified": 0,
                "favorite": false,
                "tags": [],
                "lastOpen": null,
                "visitCount": 0,
                "children": children
            }));
        } else if file_type.is_file() && is_supported_file(&file_name) {
            let metadata = fs::metadata(&entry_path).ok();
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified = metadata
                .as_ref()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            entries.push(serde_json::json!({
                "id": entry_path.to_string_lossy().to_string(),
                "name": file_name,
                "path": entry_path.to_string_lossy().to_string(),
                "type": detect_file_type(&file_name),
                "size": size,
                "modified": modified,
                "favorite": false,
                "tags": [],
                "lastOpen": null,
                "visitCount": 0
            }));
        }
    }

    // Sort: directories first, then by name (case-insensitive)
    entries.sort_by(|a, b| {
        let a_is_dir = a.get("children").is_some();
        let b_is_dir = b.get("children").is_some();
        let a_name = a.get("name").and_then(|n| n.as_str()).unwrap_or("");
        let b_name = b.get("name").and_then(|n| n.as_str()).unwrap_or("");

        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a_name.to_lowercase().cmp(&b_name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
fn write_document(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 托盘菜单
            let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&quit_item)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("DocViewer")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 拦截关闭事件，改为隐藏到托盘
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            read_document,
            get_file_metadata,
            write_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
