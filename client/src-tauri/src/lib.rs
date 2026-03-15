use std::env;
use std::fs;
use std::process::Command;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// 全局变量存储服务器进程
static SERVER_PROCESS: Mutex<Option<std::process::Child>> = Mutex::new(None);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            // 启动后端服务
            thread::spawn(move || {
                // 等待一点时间让应用准备好
                thread::sleep(Duration::from_secs(2));

                // 获取可执行文件所在目录
                let exe_dir = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()));

                if let Some(base_dir) = exe_dir {
                    println!("[INFO] exe 目录: {:?}", base_dir);

                    // 优先查找打包后的 server.exe
                    let server_exe = base_dir.join("server.exe");
                    println!("[INFO] 检查 server.exe: {:?}", server_exe);

                    if server_exe.exists() {
                        println!("[INFO] 找到 server.exe, 尝试启动...");

                        // 启动 server.exe，不显示命令行窗口
                        #[cfg(target_os = "windows")]
                        let result = Command::new(&server_exe)
                            .creation_flags(0x08000000) // CREATE_NO_WINDOW
                            .spawn();

                        #[cfg(not(target_os = "windows"))]
                        let result = Command::new(&server_exe).spawn();

                        match result {
                            Ok(child) => {
                                println!("[INFO] Server 启动成功 (独立可执行文件)");
                                // 保存进程句柄
                                if let Ok(mut process) = SERVER_PROCESS.lock() {
                                    *process = Some(child);
                                }
                            }
                            Err(e) => println!("[ERROR] Server 启动失败: {}", e),
                        }
                    } else {
                        // 兼容方案：尝试找 node + src/index.js
                        println!("[WARN] server.exe 不存在，尝试使用 node 模式...");

                        let server_path = base_dir.join("server");
                        let server_index = server_path.join("src").join("index.js");

                        if server_index.exists() {
                            let server_dir = server_path.to_string_lossy().to_string();

                            // 检查 node 是否可用
                            let node_check = Command::new("node").args(["--version"]).output();

                            match node_check {
                                Ok(output) if output.status.success() => {
                                    let node_version = String::from_utf8_lossy(&output.stdout);
                                    println!(
                                        "[INFO] 使用 node 模式, Node.js 版本: {}",
                                        node_version
                                    );

                                    // 启动 node 进程，不显示窗口
                                    #[cfg(target_os = "windows")]
                                    let result = Command::new("cmd")
                                        .creation_flags(0x08000000) // CREATE_NO_WINDOW
                                        .args([
                                            "/C",
                                            &format!(
                                                "cd /D \"{}\" && node src\\index.js",
                                                server_dir
                                            ),
                                        ])
                                        .spawn();

                                    #[cfg(not(target_os = "windows"))]
                                    let result = Command::new("cmd")
                                        .args([
                                            "/C",
                                            &format!(
                                                "cd /D \"{}\" && node src\\index.js",
                                                server_dir
                                            ),
                                        ])
                                        .spawn();

                                    match result {
                                        Ok(child) => {
                                            println!("[INFO] Server (node模式) 启动成功");
                                            if let Ok(mut process) = SERVER_PROCESS.lock() {
                                                *process = Some(child);
                                            }
                                        }
                                        Err(e) => println!("[ERROR] Server 启动失败: {}", e),
                                    }
                                }
                                _ => {
                                    println!("[ERROR] 未找到 server.exe 且系统未安装 Node.js");
                                }
                            }
                        } else {
                            println!("[ERROR] server.exe 和 server/src/index.js 都不存在!");
                        }

                        // 列出当前目录内容帮助调试
                        if let Ok(entries) = fs::read_dir(&base_dir) {
                            println!("[DEBUG] {} 目录内容:", base_dir.display());
                            for entry in entries.flatten() {
                                println!("  - {:?}", entry.file_name());
                            }
                        }
                    }
                } else {
                    println!("[ERROR] 无法获取 exe 目录");
                }
            });

            // 注意：服务器进程会随着主应用退出而自动终止
            // 不需要额外的清理代码

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
