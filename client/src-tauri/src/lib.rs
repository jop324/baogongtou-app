use std::process::Command;
use std::thread;
use std::time::Duration;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            // 启动后端服务
            thread::spawn(|| {
                // 等待一点时间让应用准备好
                thread::sleep(Duration::from_secs(3));

                // 获取可执行文件所在目录
                let exe_dir = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()));

                if let Some(base_dir) = exe_dir {
                    // 尝试从相对路径启动后端 (Windows)
                    let server_path = base_dir.join("server");
                    let server_index = server_path.join("src").join("index.js");

                    if server_index.exists() {
                        println!("[INFO] 找到 server, 尝试启动...");
                        // 使用 cmd /c 在 Windows 上启动
                        let server_dir = server_path.to_string_lossy().to_string();
                        let result = Command::new("cmd")
                            .args([
                                "/C",
                                &format!("cd /D \"{}\" && node src\\index.js", server_dir),
                            ])
                            .spawn();

                        match result {
                            Ok(_) => println!("[INFO] Server 启动成功"),
                            Err(e) => println!("[ERROR] Server 启动失败: {}", e),
                        }
                    } else {
                        println!("[ERROR] server/index.js 不存在: {:?}", server_index);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
