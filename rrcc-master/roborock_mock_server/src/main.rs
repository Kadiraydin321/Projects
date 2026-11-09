mod config;
mod crypto;
mod inspector;
mod protocol;
mod rpc;
mod state;

use clap::Parser;
use config::ServerConfig;
use crypto::derive_key_iv;
use inspector::Inspector;
use protocol::miio::{build_encrypted_response, parse_and_decrypt_packet, MiioHeader};
use protocol::tcp::start_tcp_listener;
use rpc::handler::handle_rpc_command;
use rpc::types::RpcRequest;
use state::machine::RobotState;
use state::simulation::start_simulation_loop;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tokio::net::UdpSocket;
use tokio::sync::RwLock;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = ServerConfig::parse();
    let token = config
        .token_bytes()
        .map_err(|e| format!("Konfigürasyon Hatası: {}", e))?;
    let (key, iv) = derive_key_iv(&token);

    let did: u32 = 0x04e12345;
    let stamp_counter = Arc::new(AtomicU32::new(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as u32,
    ));

    // Paylaşımlı Durum Makinesi
    let state = Arc::new(RwLock::new(RobotState::default()));

    // Arka Plan Telemetri ve Davranış Simülatörü
    start_simulation_loop(Arc::clone(&state), config.sim_speed);

    // TCP 58867 Roborock LAN Dinleyicisi
    let tcp_addr = SocketAddr::new(config.bind_ip, config.tcp_port);
    if let Err(e) = start_tcp_listener(
        tcp_addr,
        Arc::clone(&state),
        config.model.clone(),
        config.token_hex.clone(),
        config.mac.clone(),
        config.log_file.clone(),
    )
    .await
    {
        eprintln!("Uyarı: TCP 58867 soketi başlatılamadı: {}", e);
    }

    // UDP 54321 miIO Dinleyicisi
    let udp_addr = SocketAddr::new(config.bind_ip, config.udp_port);
    let udp_socket = Arc::new(UdpSocket::bind(udp_addr).await?);

    Inspector::print_banner(
        config.udp_port,
        config.tcp_port,
        &config.model,
        did,
        &config.token_hex,
        &config.mac,
        &config.log_file,
    );

    let mut buf = [0u8; 4096];
    let key_arc = Arc::new(key);
    let iv_arc = Arc::new(iv);
    let token_arc = Arc::new(token);
    let token_hex_arc = Arc::new(config.token_hex.clone());
    let mac_arc = Arc::new(config.mac.clone());
    let log_file_arc = Arc::new(config.log_file.clone());

    loop {
        tokio::select! {
            res = udp_socket.recv_from(&mut buf) => {
                match res {
                    Ok((len, peer)) => {
                        let data = &buf[..len];

                        // 1. Handshake Paketi Kontrolü
                        if len == 32 {
                            if let Ok(header) = MiioHeader::parse(data) {
                                if header.is_handshake() {
                                    let current_stamp = stamp_counter.fetch_add(1, Ordering::SeqCst);
                                    let resp_bytes = MiioHeader::build_handshake_response(did, current_stamp);
                                    let _ = udp_socket.send_to(&resp_bytes, peer).await;
                                    Inspector::log_handshake(&peer, did, current_stamp, &config.log_file);
                                    continue;
                                }
                            }
                        }

                        // 2. Şifreli miIO RPC Paketi
                        if len > 32 {
                            let socket_clone = Arc::clone(&udp_socket);
                            let state_clone = Arc::clone(&state);
                            let token_clone = Arc::clone(&token_arc);
                            let token_hex_clone = Arc::clone(&token_hex_arc);
                            let mac_clone = Arc::clone(&mac_arc);
                            let log_file_clone = Arc::clone(&log_file_arc);
                            let key_clone = Arc::clone(&key_arc);
                            let iv_clone = Arc::clone(&iv_arc);
                            let model_clone = config.model.clone();
                            let stamp_clone = Arc::clone(&stamp_counter);
                            let packet_vec = data.to_vec();

                            tokio::spawn(async move {
                                let start_time = Instant::now();
                                match parse_and_decrypt_packet(&packet_vec, &token_clone, &key_clone, &iv_clone) {
                                    Ok((header, json_str)) => {
                                        if let Ok(req) = serde_json::from_str::<RpcRequest>(&json_str) {
                                            Inspector::log_rpc_request("UDP", &peer, &req.method, req.id, &json_str);

                                            let resp = handle_rpc_command(
                                                req.clone(),
                                                state_clone,
                                                &model_clone,
                                                &token_hex_clone,
                                                &mac_clone,
                                            )
                                            .await;
                                            let resp_json = serde_json::to_string(&resp).unwrap_or_else(|_| "{}".to_string());
                                            let elapsed = start_time.elapsed().as_micros();

                                            Inspector::log_rpc_response(
                                                "UDP",
                                                &peer,
                                                &req.method,
                                                req.id,
                                                elapsed,
                                                &json_str,
                                                &resp_json,
                                                &log_file_clone,
                                            );

                                            let resp_stamp = header.stamp.max(stamp_clone.fetch_add(1, Ordering::SeqCst));
                                            if let Ok(encrypted_resp) = build_encrypted_response(
                                                did,
                                                resp_stamp,
                                                &resp_json,
                                                &token_clone,
                                                &key_clone,
                                                &iv_clone,
                                            ) {
                                                let _ = socket_clone.send_to(&encrypted_resp, peer).await;
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("Paket şifre çözme hatası {}: {}", peer, e);
                                    }
                                }
                            });
                        }
                    }
                    Err(e) => {
                        eprintln!("UDP alma hatası: {}", e);
                    }
                }
            }

            _ = tokio::signal::ctrl_c() => {
                println!("\n>> Kapatma sinyali alındı. Mock sunucu güvenle durduruldu.");
                break;
            }
        }
    }

    Ok(())
}
