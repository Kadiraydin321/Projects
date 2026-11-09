use crate::inspector::Inspector;
use crate::rpc::handler::handle_rpc_command;
use crate::rpc::types::RpcRequest;
use crate::state::machine::RobotState;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::RwLock;

const MAX_BUFFER_BYTES: usize = 65_536;

pub async fn start_tcp_listener(
    bind_addr: SocketAddr,
    state: Arc<RwLock<RobotState>>,
    model: String,
    token_hex: String,
    mac: String,
    log_file: String,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = TcpListener::bind(bind_addr).await?;

    tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((socket, peer)) => {
                    let state_clone = Arc::clone(&state);
                    let model_clone = model.clone();
                    let token_clone = token_hex.clone();
                    let mac_clone = mac.clone();
                    let log_file_clone = log_file.clone();

                    tokio::spawn(async move {
                        let (mut read_half, mut write_half) = socket.into_split();
                        let mut buffer = Vec::new();
                        let mut chunk = [0u8; 4096];

                        loop {
                            match read_half.read(&mut chunk).await {
                                Ok(0) => break, // EOF
                                Ok(n) => {
                                    buffer.extend_from_slice(&chunk[..n]);

                                    if buffer.len() > MAX_BUFFER_BYTES {
                                        eprintln!(
                                            "TCP DoS tampon aşımı ({}), soket kapatılıyor",
                                            peer
                                        );
                                        break;
                                    }

                                    // Tamponda biriken tüm geçerli ve tamamlanmış JSON nesnelerini sırayla ayrıştır
                                    while let Some((start, end)) = find_next_json_object(&buffer) {
                                        let json_slice = &buffer[start..end];
                                        if let Ok(raw_str) = std::str::from_utf8(json_slice) {
                                            let trimmed = raw_str.trim();
                                            if !trimmed.is_empty() {
                                                if let Ok(req) =
                                                    serde_json::from_str::<RpcRequest>(trimmed)
                                                {
                                                    let start_time = std::time::Instant::now();
                                                    Inspector::log_rpc_request(
                                                        "TCP",
                                                        &peer,
                                                        &req.method,
                                                        req.id,
                                                        trimmed,
                                                    );

                                                    let resp = handle_rpc_command(
                                                        req.clone(),
                                                        Arc::clone(&state_clone),
                                                        &model_clone,
                                                        &token_clone,
                                                        &mac_clone,
                                                    )
                                                    .await;

                                                    let resp_json = serde_json::to_string(&resp)
                                                        .unwrap_or_else(|_| "{}".to_string());
                                                    let elapsed = start_time.elapsed().as_micros();

                                                    Inspector::log_rpc_response(
                                                        "TCP",
                                                        &peer,
                                                        &req.method,
                                                        req.id,
                                                        elapsed,
                                                        trimmed,
                                                        &resp_json,
                                                        &log_file_clone,
                                                    );

                                                    let out_line = format!("{}\n", resp_json);
                                                    if let Err(e) = write_half
                                                        .write_all(out_line.as_bytes())
                                                        .await
                                                    {
                                                        eprintln!(
                                                            "TCP yazma hatası {}: {}",
                                                            peer, e
                                                        );
                                                        return;
                                                    }
                                                }
                                            }
                                        }

                                        buffer.drain(..end);
                                    }
                                }
                                Err(e) => {
                                    eprintln!("TCP soket okuma hatası {}: {}", peer, e);
                                    break;
                                }
                            }
                        }
                    });
                }
                Err(e) => {
                    eprintln!("TCP bağlantı kabul hatası: {}", e);
                }
            }
        }
    });

    Ok(())
}

/// Akış tamponu içinde ilk tamamlanmış JSON nesnesinin başlangıç ve bitiş indekslerini bulur.
/// Tırnak içi (`"..."`), kaçış karakterleri (`\"`) ve parantez derinliğini (`{}`) tam olarak izler.
pub fn find_next_json_object(bytes: &[u8]) -> Option<(usize, usize)> {
    let start = bytes.iter().position(|&b| b == b'{')?;

    let mut depth: u32 = 0;
    let mut in_string = false;
    let mut escaped = false;

    for (idx, &b) in bytes[start..].iter().enumerate() {
        if in_string {
            if escaped {
                escaped = false;
            } else if b == b'\\' {
                escaped = true;
            } else if b == b'"' {
                in_string = false;
            }
        } else {
            match b {
                b'"' => in_string = true,
                b'{' => depth += 1,
                b'}' if depth > 0 => {
                    depth -= 1;
                    if depth == 0 {
                        return Some((start, start + idx + 1));
                    }
                }
                _ => {}
            }
        }
    }

    None
}
