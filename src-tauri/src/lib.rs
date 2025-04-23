use std::net::TcpStream;
use std::io::{Read, Write};
use std::time::Duration;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::thread;
use tauri::Emitter;
use tauri::Window;

const START_PORT: u16 = 6969;
const END_PORT: u16 = 7069;
const SECRET_PATH: &str = "/secret";
const EXECUTE_PATH: &str = "/execute";
const SECRET_VALUE: &str = "0xdeadbeef";
const TIMEOUT_MS: u64 = 100; 
use dirs_next as dirs;

#[tauri::command]
fn get_roblox_logs(window: Window) -> Result<String, String> {
    let log_dir = match dirs::home_dir() {
        Some(home) => home.join("Library/Logs/Roblox"),
        None => return Err("Could not get home directory".to_string())
    };
    
    if !log_dir.exists() {
        return Err(format!("Roblox log directory not found at {:?}", log_dir));
    }
    
    let newest_log = match fs::read_dir(&log_dir) {
        Ok(entries) => {
            let mut newest: Option<(std::path::PathBuf, std::time::SystemTime)> = None;
            for entry in entries.filter_map(Result::ok) {
                let file_name = entry.file_name().to_string_lossy().to_string();
                if file_name.contains("Player") && file_name.ends_with(".log") {
                    match entry.metadata() {
                        Ok(metadata) => {
                            match metadata.modified() {
                                Ok(modified_time) => {
                                    if newest.is_none() || 
                                       newest.as_ref().unwrap().1 < modified_time {
                                        newest = Some((entry.path(), modified_time));
                                    }
                                },
                                Err(_) => continue
                            }
                        },
                        Err(_) => continue
                    }
                }
            }
            newest.map(|(path, _)| path)
        },
        Err(e) => return Err(format!("Could not read Roblox log directory: {}", e))
    };

    if let Some(log_path) = newest_log {
        println!("Tailing log file: {:?}", log_path);
        
        let window_clone = window.clone();
        
        thread::spawn(move || {
            match File::open(&log_path) {
                Ok(file) => {
                    let mut reader = BufReader::new(file);
                    if let Err(e) = reader.seek(SeekFrom::End(0)) {
                        let _ = window_clone.emit("roblox-log", format!("Error seeking log file: {}", e));
                        return;
                    }
                    
                    let _ = window_clone.emit("roblox-log", format!("Successfully connected to log file: {:?}", log_path));
                    
                    loop {
                        let mut line = String::new();
                        match reader.read_line(&mut line) {
                            Ok(0) => {
                                thread::sleep(Duration::from_millis(500));
                            },
                            Ok(_) => {
                                let line = line.trim();
                                if !line.is_empty() && 
                                   (line.contains("FLog::Error") || 
                                    line.contains("FLog::Warning") || 
                                    line.contains("FLog::Output")) {
                                    let formatted_line = if let Some(msg_start) = line.find("] ") {
                                        let msg = &line[msg_start + 2..];
                                        if line.contains("FLog::Error") {
                                            format!("error {}", msg)
                                        } else if line.contains("FLog::Warning") {
                                            format!("warning {}", msg)
                                        } else {
                                            format!("info {}", msg)
                                        }
                                    } else {
                                        line.to_string()
                                    };
                                    
                                    if let Err(e) = window_clone.emit("roblox-log", formatted_line) {
                                        println!("Failed to emit log event: {}", e);
                                        break;
                                    }
                                }
                            },
                            Err(e) => {
                                let _ = window_clone.emit("roblox-log", format!("Error reading log file: {}", e));
                                println!("Error reading log file: {}", e);
                                break;
                            }
                        }
                    }
                },
                Err(e) => {
                    let _ = window_clone.emit("roblox-log", format!("Could not open log file: {}", e));
                }
            }
        });
        
        Ok(format!("Started monitoring Roblox logs at"))
    } else {
        Err("No Roblox Player logs found.".to_string())
    }
}


#[tauri::command]
async fn execute(code: Option<String>) -> Result<String, String> {
    let code = code.ok_or("No valid script to execute.")?;

    let mut server_port: Option<u16> = None;
    let mut last_error = String::new();

    for port in START_PORT..=END_PORT {
        let address = format!("127.0.0.1:{}", port);
        match TcpStream::connect_timeout(&address.parse().unwrap(), Duration::from_millis(TIMEOUT_MS)) {
            Ok(mut stream) => {
                let request = format!("GET {} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\n\r\n", SECRET_PATH, port);
                if stream.write_all(request.as_bytes()).is_ok() {
                    let mut response = String::new();
                    if stream.read_to_string(&mut response).is_ok() {
                        if response.contains(SECRET_VALUE) {
                            server_port = Some(port);
                            println!("Found server on port {}", port);
                            break;
                        }
                    } else {
                        last_error = "Failed to read response from server.".into();
                    }
                } else {
                    last_error = "Failed to write request to server.".into();
                }
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }
    }

    let server_port = server_port.ok_or(format!("Could not locate HTTP server on ports {}-{}. Last error: {}", START_PORT, END_PORT, last_error))?;

    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}{}", server_port, EXECUTE_PATH);

    let response = client.post(&url)
        .header("Content-Type", "text/plain")
        .body(code)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if response.status().is_success() {
        response.text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(format!("HTTP {}: {}", status, body))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![execute, get_roblox_logs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
