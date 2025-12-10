use tauri_plugin_sql::{Migration, MigrationKind};

// // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE pinned_emojis (id INTEGER PRIMARY KEY, emoji_name TEXT);
                CREATE TABLE used_emojis (id INTEGER PRIMARY KEY, emoji_name TEXT);
                
                CREATE TABLE settings (id INTEGER PRIMARY KEY, name TEXT, value TEXT);
                INSERT INTO settings (name, value) VALUES ('theme', 'system');
                INSERT INTO settings (name, value) VALUES ('emoji_size', 'medium');
                INSERT INTO settings (name, value) VALUES ('max_used_emojis', '10');
                INSERT INTO settings (name, value) VALUES ('remember_used_emojis', 'true');
                INSERT INTO settings (name, value) VALUES ('show_unsupported_emojis', 'false');
                INSERT INTO settings (name, value) VALUES ('close_on_copy', 'true');
                INSERT INTO settings (name, value) VALUES ('st1', 'false');
                INSERT INTO settings (name, value) VALUES ('st2', 'false');
                INSERT INTO settings (name, value) VALUES ('hair', 'false');
                INSERT INTO settings (name, value) VALUES ('dir', 'false');
                
                CREATE TABLE extra_searchable_texts (id INTEGER PRIMARY KEY, emoji_name TEXT, searchable_text TEXT);
                INSERT INTO extra_searchable_texts (emoji_name, searchable_text) VALUES ('waving hand', 'wave');
            ",
            kind: MigrationKind::Up,
        }
    ];
    
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:clemoji.db", migrations)
            .build()
        )
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        // .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
