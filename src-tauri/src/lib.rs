use std::net::TcpStream;
use std::io::{Read, Write};
use std::time::Duration;

const START_PORT: u16 = 6969;
const END_PORT: u16 = 7069;
const SECRET_PATH: &str = "/secret";
const EXECUTE_PATH: &str = "/execute";
const SECRET_VALUE: &str = "0xdeadbeef";
const TIMEOUT_MS: u64 = 100; 

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
        .invoke_handler(tauri::generate_handler![execute])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
