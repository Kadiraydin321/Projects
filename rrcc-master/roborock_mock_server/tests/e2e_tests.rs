// E2E and RPC integration tests
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpStream, UdpSocket};
use tokio::sync::RwLock;

// Import crate modules
#[path = "../src/config.rs"]
mod config;
#[path = "../src/crypto.rs"]
mod crypto;
#[path = "../src/inspector.rs"]
mod inspector;
#[path = "../src/protocol/mod.rs"]
mod protocol;
#[path = "../src/rpc/mod.rs"]
mod rpc;
#[path = "../src/state/mod.rs"]
mod state;
#[path = "../src/proxy/mod.rs"]
pub mod proxy;

use config::{ServerConfig, ServerMode};
use proxy::capture::{CaptureEntry, CaptureLogger};
use proxy::tcp_proxy::start_tcp_proxy;
use proxy::udp_proxy::start_udp_proxy;

use crypto::derive_key_iv;
use protocol::miio::{build_encrypted_response, parse_and_decrypt_packet, MiioHeader};
use protocol::tcp::start_tcp_listener;
use rpc::handler::handle_rpc_command;
use rpc::types::RpcRequest;
use state::machine::{RobotState, RobotStateCode};

#[tokio::test]
async fn test_state_machine_transitions() {
    let mut state = RobotState::default();
    assert_eq!(state.state_code, RobotStateCode::Charging);

    state.start_cleaning().unwrap();
    assert_eq!(state.state_code, RobotStateCode::Cleaning);
    assert_eq!(state.in_cleaning, 1);

    state.pause_cleaning().unwrap();
    assert_eq!(state.state_code, RobotStateCode::Paused);

    state.resume_cleaning().unwrap();
    assert_eq!(state.state_code, RobotStateCode::Cleaning);

    state.return_to_dock().unwrap();
    assert_eq!(state.state_code, RobotStateCode::Returning);
    assert_eq!(state.in_cleaning, 0);

    // Consumable reset test
    state.consumables.main_brush_work_time = 12000;
    assert!(state.reset_consumable("main_brush_work_time"));
    assert_eq!(state.consumables.main_brush_work_time, 0);
}

#[tokio::test]
async fn test_rpc_handler_commands() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let model = "roborock.vacuum.ss09";
    let token = "0123456789abcdef0123456789abcdef";
    let mac = "54:48:E6:99:88:77";

    // 1. get_status
    let req = RpcRequest {
        id: 101,
        method: "get_status".to_string(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.id, 101);
    let res = resp.result.unwrap();
    let arr = res.as_array().unwrap();
    let status = &arr[0];
    assert_eq!(status["battery"], 98);
    assert_eq!(status["fan_power"], 102);

    // 2. set_custom_mode (fan power)
    let req = RpcRequest {
        id: 102,
        method: "set_custom_mode".to_string(),
        params: Some(serde_json::json!([104])), // Max
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.id, 102);
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));

    // Check state updated
    {
        let st = state.read().await;
        assert_eq!(st.fan_power, 104);
    }

    // 3. app_start
    let req = RpcRequest {
        id: 103,
        method: "app_start".to_string(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.id, 103);
    {
        let st = state.read().await;
        assert_eq!(st.state_code, RobotStateCode::Cleaning);
    }

    // 4. miIO.info contains dynamic token and mac
    let req = RpcRequest {
        id: 104,
        method: "miIO.info".to_string(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.id, 104);
    let info = resp.result.unwrap();
    assert_eq!(info["token"], token);
    assert_eq!(info["mac"], mac);
}

#[tokio::test]
async fn test_tcp_listener_json_rpc_e2e() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let bind_addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
    let token = "0123456789abcdef0123456789abcdef".to_string();
    let mac = "54:48:E6:99:88:77".to_string();
    let log_file = "test_tcp_traffic.jsonl".to_string();

    let bound_addr = start_tcp_listener(
        bind_addr,
        Arc::clone(&state),
        "roborock.vacuum.ss09".to_string(),
        token,
        mac,
        log_file,
    )
    .await
    .unwrap();

    // Give TCP listener a moment to bind
    tokio::time::sleep(Duration::from_millis(50)).await;

    let mut stream = TcpStream::connect(bound_addr).await.unwrap();
    let (read_half, mut write_half) = stream.split();
    let mut reader = BufReader::new(read_half);

    // Send RPC get_status
    let req = serde_json::json!({
        "id": 999,
        "method": "get_status",
        "params": []
    });
    let req_str = format!("{}\n", req);
    write_half.write_all(req_str.as_bytes()).await.unwrap();

    let mut resp_line = String::new();
    reader.read_line(&mut resp_line).await.unwrap();

    let resp_val: serde_json::Value = serde_json::from_str(&resp_line).unwrap();
    assert_eq!(resp_val["id"], 999);
    assert!(resp_val["result"].is_array());
}

#[tokio::test]
async fn test_udp_handshake_and_command_e2e() {
    let token = [0x99u8; 16];
    let (key, iv) = derive_key_iv(&token);
    let did: u32 = 0x04e12345;
    let stamp_counter = Arc::new(AtomicU32::new(1000));
    let state = Arc::new(RwLock::new(RobotState::default()));
    let token_hex = "99".repeat(16);
    let mac = "54:48:E6:11:22:33";

    let server_port = 54410;
    let server_addr: SocketAddr = format!("127.0.0.1:{}", server_port).parse().unwrap();
    let server_sock = Arc::new(UdpSocket::bind(server_addr).await.unwrap());

    // Server loop in background
    let s_sock = Arc::clone(&server_sock);
    let s_stamp = Arc::clone(&stamp_counter);
    let s_state = Arc::clone(&state);

    tokio::spawn(async move {
        let mut buf = [0u8; 2048];
        loop {
            if let Ok((len, peer)) = s_sock.recv_from(&mut buf).await {
                let data = &buf[..len];
                if len == 32 {
                    let stamp = s_stamp.fetch_add(1, Ordering::SeqCst);
                    let resp = MiioHeader::build_handshake_response(did, stamp);
                    let _ = s_sock.send_to(&resp, peer).await;
                } else if len > 32 {
                    if let Ok((hdr, json_str)) = parse_and_decrypt_packet(data, &token, &key, &iv) {
                        let req: RpcRequest = serde_json::from_str(&json_str).unwrap();
                        let resp = handle_rpc_command(
                            req,
                            Arc::clone(&s_state),
                            "roborock.vacuum.ss09",
                            &token_hex,
                            mac,
                        )
                        .await;
                        let resp_json = serde_json::to_string(&resp).unwrap();
                        let enc = build_encrypted_response(
                            did,
                            hdr.stamp + 1,
                            &resp_json,
                            &token,
                            &key,
                            &iv,
                        )
                        .unwrap();
                        let _ = s_sock.send_to(&enc, peer).await;
                    }
                }
            }
        }
    });

    // Client side
    let client_sock = UdpSocket::bind("127.0.0.1:0").await.unwrap();

    // 1. Handshake request: 32 bytes 0x2131 0020 ffff...
    let mut handshake_req = [0xffu8; 32];
    handshake_req[0..2].copy_from_slice(&0x2131u16.to_be_bytes());
    handshake_req[2..4].copy_from_slice(&32u16.to_be_bytes());
    handshake_req[4..8].copy_from_slice(&0u32.to_be_bytes());

    client_sock
        .send_to(&handshake_req, server_addr)
        .await
        .unwrap();

    let mut resp_buf = [0u8; 1024];
    let (n, _) = client_sock.recv_from(&mut resp_buf).await.unwrap();
    assert_eq!(n, 32);

    let header = MiioHeader::parse(&resp_buf[..n]).unwrap();
    assert_eq!(header.did, did);
    assert_eq!(header.stamp, 1000);

    // 2. Encrypted command request: get_status
    let cmd = "{\"id\":555,\"method\":\"get_status\",\"params\":[]}";
    let enc_req = build_encrypted_response(did, 1001, cmd, &token, &key, &iv).unwrap();

    client_sock.send_to(&enc_req, server_addr).await.unwrap();

    let (n, _) = client_sock.recv_from(&mut resp_buf).await.unwrap();
    assert!(n > 32);

    let (resp_hdr, resp_str) = parse_and_decrypt_packet(&resp_buf[..n], &token, &key, &iv).unwrap();
    assert_eq!(resp_hdr.did, did);
    assert!(resp_str.contains("\"id\":555"));
    assert!(resp_str.contains("\"battery\":98"));
}

#[tokio::test]
async fn test_unknown_method_is_not_silently_accepted() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let req = RpcRequest {
        id: 700,
        method: "not_a_robot_method".into(),
        params: Some(serde_json::json!([])),
    };
    let resp = handle_rpc_command(
        req,
        state,
        "mock.model",
        "00000000000000000000000000000000",
        "00:00:00:00:00:00",
    )
    .await;
    assert_eq!(resp.error.unwrap()["code"], -32601);
}

#[tokio::test]
async fn test_segment_clean_requires_valid_segment_ids() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let req = RpcRequest {
        id: 701,
        method: "app_segment_clean".into(),
        params: Some(serde_json::json!([[16, 18]])),
    };
    let resp = handle_rpc_command(
        req,
        Arc::clone(&state),
        "mock.model",
        "00000000000000000000000000000000",
        "00:00:00:00:00:00",
    )
    .await;
    assert!(resp.error.is_none());
    assert_eq!(state.read().await.active_segments, vec![16, 18]);
    let bad = RpcRequest {
        id: 702,
        method: "app_segment_clean".into(),
        params: Some(serde_json::json!([[999]])),
    };
    let resp = handle_rpc_command(
        bad,
        state,
        "mock.model",
        "00000000000000000000000000000000",
        "00:00:00:00:00:00",
    )
    .await;
    assert!(resp.error.is_some());
}

#[tokio::test]
async fn test_smart_get_prop_single_and_multi() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let model = "roborock.vacuum.ss09";
    let token = "0123456789abcdef0123456789abcdef";
    let mac = "54:48:E6:99:88:77";

    // 1. Single property: ["battery"] -> [98]
    let req = RpcRequest {
        id: 801,
        method: "get_prop".into(),
        params: Some(serde_json::json!(["battery"])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.id, 801);
    assert_eq!(resp.result.unwrap(), serde_json::json!([98]));

    // 2. Multi properties: ["battery", "state", "fan_power", "water_box_mode"] -> [98, 8, 102, 202]
    let req = RpcRequest {
        id: 802,
        method: "get_prop".into(),
        params: Some(serde_json::json!([
            "battery",
            "state",
            "fan_power",
            "water_box_mode"
        ])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.id, 802);
    assert_eq!(resp.result.unwrap(), serde_json::json!([98, 8, 102, 202]));

    // 3. Hermes ["get_status"] query -> full status array [{...}]
    let req = RpcRequest {
        id: 803,
        method: "get_prop".into(),
        params: Some(serde_json::json!(["get_status"])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.id, 803);
    let arr = resp.result.unwrap();
    assert!(arr.is_array());
    assert_eq!(arr[0]["battery"], 98);
    assert_eq!(arr[0]["state"], 8);
}

#[tokio::test]
async fn test_hermes_resume_and_dock_methods() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let model = "roborock.vacuum.ss09";
    let token = "0123456789abcdef0123456789abcdef";
    let mac = "54:48:E6:99:88:77";

    // 1. resume_segment_clean
    let req = RpcRequest {
        id: 810,
        method: "resume_segment_clean".into(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.state_code, RobotStateCode::SegmentClean);

    // 2. resume_zoned_clean
    let req = RpcRequest {
        id: 811,
        method: "resume_zoned_clean".into(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.state_code, RobotStateCode::ZonedClean);

    // 3. start_wash_then_charge
    let req = RpcRequest {
        id: 812,
        method: "start_wash_then_charge".into(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.state_code, RobotStateCode::WashingDuster);

    // 4. app_stop_wash
    let req = RpcRequest {
        id: 813,
        method: "app_stop_wash".into(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.state_code, RobotStateCode::Charging);

    // 5. set_dust_collection_mode
    let req = RpcRequest {
        id: 814,
        method: "set_dust_collection_mode".into(),
        params: Some(serde_json::json!([{"mode": 2}])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.dust_collection_mode, 2);

    // 6. set_wash_towel_mode
    let req = RpcRequest {
        id: 815,
        method: "set_wash_towel_mode".into(),
        params: Some(serde_json::json!([{"wash_mode": 2}])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.wash_towel_mode, 2);

    // 7. app_set_dryer_setting
    let req = RpcRequest {
        id: 816,
        method: "app_set_dryer_setting".into(),
        params: Some(serde_json::json!([{"dry_time": 10800}])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.dryer_duration, 10800);
}

#[tokio::test]
async fn test_settings_and_multi_maps() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let model = "roborock.vacuum.ss09";
    let token = "0123456789abcdef0123456789abcdef";
    let mac = "54:48:E6:99:88:77";

    // 1. get_multi_maps_list
    let req = RpcRequest {
        id: 820,
        method: "get_multi_maps_list".into(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    let res = resp.result.unwrap();
    assert_eq!(res[0]["max_multi_map"], 4);
    assert_eq!(res[0]["map_info"][0]["name"], "1. Kat");

    // 2. load_multi_map & save_map
    let req = RpcRequest {
        id: 821,
        method: "load_multi_map".into(),
        params: Some(serde_json::json!([0])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));

    // 3. get_network_info
    let req = RpcRequest {
        id: 822,
        method: "get_network_info".into(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    let net = resp.result.unwrap();
    assert_eq!(net["ssid"], "Roborock_Mock_Network");
    assert_eq!(net["ip"], "127.0.0.1");

    // 4. child lock & led
    let req = RpcRequest {
        id: 823,
        method: "set_child_lock_status".into(),
        params: Some(serde_json::json!([1])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.child_lock_status, 1);

    let req = RpcRequest {
        id: 824,
        method: "set_led_status".into(),
        params: Some(serde_json::json!([0])),
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    assert_eq!(resp.result.unwrap(), serde_json::json!(["ok"]));
    assert_eq!(state.read().await.led_status, 0);

    // 5. get_server_timer
    let req = RpcRequest {
        id: 825,
        method: "get_server_timer".into(),
        params: None,
    };
    let resp = handle_rpc_command(req, Arc::clone(&state), model, token, mac).await;
    let timer = resp.result.unwrap();
    assert!(timer.is_array());
    assert!(timer[0].as_i64().unwrap() > 1700000000);
}

#[tokio::test]
async fn test_tcp_no_newline_and_concatenated_json() {
    let state = Arc::new(RwLock::new(RobotState::default()));
    let bind_addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
    let token = "0123456789abcdef0123456789abcdef".to_string();
    let mac = "54:48:E6:99:88:77".to_string();
    let log_file = "test_tcp_stream.jsonl".to_string();

    let bound_addr = start_tcp_listener(
        bind_addr,
        Arc::clone(&state),
        "roborock.vacuum.ss09".to_string(),
        token,
        mac,
        log_file,
    )
    .await
    .unwrap();

    tokio::time::sleep(Duration::from_millis(50)).await;

    let stream = TcpStream::connect(bound_addr).await.unwrap();
    let (read_half, mut write_half) = stream.into_split();
    let mut reader = BufReader::new(read_half);

    // 1. Send JSON WITHOUT trailing newline
    let req1 = "{\"id\":901,\"method\":\"find_me\",\"params\":[]}";
    write_half.write_all(req1.as_bytes()).await.unwrap();

    let mut line1 = String::new();
    reader.read_line(&mut line1).await.unwrap();
    assert!(line1.contains("\"id\":901"));
    assert!(line1.contains("\"ok\""));

    // 2. Send TWO concatenated JSON packets in a single payload
    let req_concat = "{\"id\":902,\"method\":\"get_timer\",\"params\":[]}{\"id\":903,\"method\":\"get_network_info\",\"params\":[]}";
    write_half.write_all(req_concat.as_bytes()).await.unwrap();

    let mut line2 = String::new();
    reader.read_line(&mut line2).await.unwrap();
    assert!(line2.contains("\"id\":902"));

    let mut line3 = String::new();
    reader.read_line(&mut line3).await.unwrap();
    assert!(line3.contains("\"id\":903"));
    assert!(line3.contains("Roborock_Mock_Network"));
}

#[tokio::test]
async fn test_simulation_dock_state_auto_recovery() {
    let state = Arc::new(RwLock::new(RobotState::default()));

    // 50x sim speed (1 tick = 20ms)
    state::simulation::start_simulation_loop(Arc::clone(&state), 50.0);

    // 1. CollectingDust -> Charging
    {
        let mut st = state.write().await;
        st.state_code = RobotStateCode::CollectingDust;
    }
    tokio::time::sleep(Duration::from_millis(150)).await;
    {
        let st = state.read().await;
        assert!(
            st.state_code == RobotStateCode::Charging
                || st.state_code == RobotStateCode::FullyCharged
        );
    }

    // 2. WashingDuster -> Charging / FullyCharged
    {
        let mut st = state.write().await;
        st.state_code = RobotStateCode::WashingDuster;
    }
    tokio::time::sleep(Duration::from_millis(200)).await;
    {
        let st = state.read().await;
        assert!(
            st.state_code == RobotStateCode::Charging
                || st.state_code == RobotStateCode::FullyCharged
        );
    }
}


#[test]
fn test_proxy_config_mode() {
    let mock_cfg = ServerConfig {
        bind_ip: "0.0.0.0".parse().unwrap(),
        udp_port: 54321,
        tcp_port: 58867,
        token_hex: "0123456789abcdef0123456789abcdef".to_string(),
        duid: "dummy".to_string(),
        model: "roborock.vacuum.ss09".to_string(),
        mac: "00:11:22:33:44:55".to_string(),
        log_file: "log.jsonl".to_string(),
        sim_speed: 1.0,
        proxy_upstream: None,
        proxy_udp_port: 54321,
        proxy_tcp_port: 58867,
        capture_file: "mitm_capture.jsonl".to_string(),
        udp_timeout: 5,
    };
    assert_eq!(mock_cfg.mode(), ServerMode::Mock);

    let proxy_cfg = ServerConfig {
        proxy_upstream: Some("192.168.1.100".parse().unwrap()),
        proxy_udp_port: 54321,
        proxy_tcp_port: 58867,
        ..mock_cfg
    };
    assert_eq!(
        proxy_cfg.mode(),
        ServerMode::Proxy {
            upstream_ip: "192.168.1.100".parse().unwrap(),
            upstream_udp_port: 54321,
            upstream_tcp_port: 58867,
        }
    );
}

#[tokio::test]
async fn test_capture_logger_async() {
    let test_file = format!(
        "target/test_capture_{}.jsonl",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    let (logger, handle) = CaptureLogger::new(&test_file);

    let entry1 = CaptureEntry {
        timestamp: "2026-11-14T01:00:00Z".to_string(),
        direction: "client_to_robot".to_string(),
        protocol: "UDP_MIIO".to_string(),
        client_addr: "127.0.0.1:40001".to_string(),
        robot_addr: "127.0.0.1:54321".to_string(),
        method: Some("get_status".to_string()),
        id: Some(101),
        payload: Some(serde_json::json!({"id": 101, "method": "get_status"})),
        raw_len: 45,
        elapsed_us: None,
        status: "ok".to_string(),
    };

    let entry2 = CaptureEntry {
        timestamp: "2026-11-14T01:00:01Z".to_string(),
        direction: "robot_to_client".to_string(),
        protocol: "UDP_MIIO".to_string(),
        client_addr: "127.0.0.1:40001".to_string(),
        robot_addr: "127.0.0.1:54321".to_string(),
        method: Some("get_status".to_string()),
        id: Some(101),
        payload: Some(serde_json::json!({"id": 101, "result": ["charging"]})),
        raw_len: 55,
        elapsed_us: Some(1250),
        status: "ok".to_string(),
    };

    logger.log(entry1);
    logger.log(entry2);

    drop(logger);
    let _ = handle.await;

    let content = tokio::fs::read_to_string(&test_file).await.unwrap();
    let lines: Vec<&str> = content.lines().filter(|l| !l.is_empty()).collect();
    assert_eq!(lines.len(), 2);

    let parsed1: serde_json::Value = serde_json::from_str(lines[0]).unwrap();
    assert_eq!(parsed1["method"], "get_status");
    assert_eq!(parsed1["direction"], "client_to_robot");

    let parsed2: serde_json::Value = serde_json::from_str(lines[1]).unwrap();
    assert_eq!(parsed2["elapsed_us"], 1250);
    assert_eq!(parsed2["direction"], "robot_to_client");

    let _ = tokio::fs::remove_file(&test_file).await;
}

#[tokio::test]
async fn test_tcp_proxy_bidirectional_and_capture() {
    let test_file = format!(
        "target/test_tcp_proxy_{}.jsonl",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    let logger = CaptureLogger::start(&test_file);

    // 1. Mock upstream robot TCP listener
    let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_addr = upstream_listener.local_addr().unwrap();

    tokio::spawn(async move {
        if let Ok((mut stream, _)) = upstream_listener.accept().await {
            use tokio::io::{AsyncReadExt, AsyncWriteExt};
            let mut buf = vec![0u8; 1024];
            let n = stream.read(&mut buf).await.unwrap();
            let req_str = std::str::from_utf8(&buf[..n]).unwrap();
            assert!(req_str.contains("app_start"));

            let resp = "{\"id\":777,\"result\":[\"ok\"]}\n";
            stream.write_all(resp.as_bytes()).await.unwrap();
        }
    });

    // 2. Start TCP proxy
    let proxy_addr = start_tcp_proxy("127.0.0.1:0".parse().unwrap(), upstream_addr, logger.clone())
        .await
        .unwrap();

    // 3. Connect client to TCP proxy
    let mut client = TcpStream::connect(proxy_addr).await.unwrap();
    let client_req = "{\"id\":777,\"method\":\"app_start\",\"params\":[]}\n";
    client.write_all(client_req.as_bytes()).await.unwrap();

    // 4. Read reply from TCP proxy
    let mut reader = BufReader::new(client);
    let mut line = String::new();
    reader.read_line(&mut line).await.unwrap();
    assert!(line.contains("\"result\":[\"ok\"]"));
    assert!(line.contains("\"id\":777"));

    tokio::time::sleep(Duration::from_millis(50)).await;
    // Flushed automatically

    let content = tokio::fs::read_to_string(&test_file).await.unwrap();
    assert!(content.contains("client_to_robot"));
    assert!(content.contains("robot_to_client"));
    assert!(content.contains("app_start"));
    assert!(content.contains("777"));

    let _ = tokio::fs::remove_file(&test_file).await;
}

#[tokio::test]
async fn test_tcp_proxy_large_map() {
    let test_file = format!(
        "target/test_tcp_map_{}.jsonl",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    let logger = CaptureLogger::start(&test_file);

    let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_addr = upstream_listener.local_addr().unwrap();

    let large_map_data = "x".repeat(300_000);
    let large_map_json = format!("{{\"id\":888,\"result\":\"{}\"}}\n", large_map_data);
    let large_map_clone = large_map_json.clone();

    tokio::spawn(async move {
        if let Ok((mut stream, _)) = upstream_listener.accept().await {
            use tokio::io::{AsyncReadExt, AsyncWriteExt};
            let mut buf = vec![0u8; 1024];
            let _ = stream.read(&mut buf).await.unwrap();
            stream.write_all(large_map_clone.as_bytes()).await.unwrap();
        }
    });

    let proxy_addr = start_tcp_proxy("127.0.0.1:0".parse().unwrap(), upstream_addr, logger.clone())
        .await
        .unwrap();

    let mut client = TcpStream::connect(proxy_addr).await.unwrap();
    client.write_all(b"{\"id\":888,\"method\":\"get_map_v1\",\"params\":[]}\n").await.unwrap();

    let mut reader = BufReader::new(client);
    let mut resp = String::new();
    reader.read_line(&mut resp).await.unwrap();
    assert_eq!(resp.len(), large_map_json.len());
    assert!(resp.contains("\"id\":888"));

    tokio::time::sleep(Duration::from_millis(50)).await;
    // Flushed automatically

    let content = tokio::fs::read_to_string(&test_file).await.unwrap();
    assert!(content.contains("get_map_v1"));
    assert!(content.contains("888"));

    let _ = tokio::fs::remove_file(&test_file).await;
}

#[tokio::test]
async fn test_udp_proxy_handshake_and_encrypted_rpc() {
    let test_file = format!(
        "target/test_udp_proxy_{}.jsonl",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    let logger = CaptureLogger::start(&test_file);

    let token = [0x42u8; 16];
    let (key, iv) = derive_key_iv(&token);

    let upstream_socket = UdpSocket::bind("127.0.0.1:0").await.unwrap();
    let upstream_addr = upstream_socket.local_addr().unwrap();

    let upstream_key = key;
    let upstream_iv = iv;
    let upstream_token = token;

    tokio::spawn(async move {
        let mut buf = [0u8; 4096];
        // Handle handshake
        let (n, peer) = upstream_socket.recv_from(&mut buf).await.unwrap();
        assert_eq!(n, 32);
        let resp_hs = MiioHeader::build_handshake_response(0x04e12345, 9999);
        upstream_socket.send_to(&resp_hs, peer).await.unwrap();

        // Handle encrypted RPC
        let (n2, peer2) = upstream_socket.recv_from(&mut buf).await.unwrap();
        let (header, json_req) = parse_and_decrypt_packet(&buf[..n2], &upstream_token, &upstream_key, &upstream_iv).unwrap();
        assert!(json_req.contains("get_status"));

        let resp_json = "{\"id\":456,\"result\":[\"charging\"]}";
        let enc_resp = build_encrypted_response(
            header.did,
            header.stamp + 1,
            resp_json,
            &upstream_token,
            &upstream_key,
            &upstream_iv,
        ).unwrap();
        upstream_socket.send_to(&enc_resp, peer2).await.unwrap();
    });

    let proxy_addr = start_udp_proxy("127.0.0.1:0".parse().unwrap(), upstream_addr, token, logger.clone(), 5)
        .await
        .unwrap();

    let client_sock = UdpSocket::bind("127.0.0.1:0").await.unwrap();
    client_sock.connect(proxy_addr).await.unwrap();

    // Send handshake
    let hs_pkt = MiioHeader::build_handshake_request();
    client_sock.send(&hs_pkt).await.unwrap();

    let mut resp_buf = [0u8; 4096];
    let n = client_sock.recv(&mut resp_buf).await.unwrap();
    assert_eq!(n, 32);
    let hs_resp = MiioHeader::parse(&resp_buf[..n]).unwrap();
    assert_eq!(hs_resp.did, 0x04e12345);
    assert_eq!(hs_resp.stamp, 9999);

    // Send encrypted RPC
    let enc_req = build_encrypted_response(
        hs_resp.did,
        hs_resp.stamp,
        "{\"id\":456,\"method\":\"get_status\",\"params\":[]}",
        &token,
        &key,
        &iv,
    ).unwrap();
    client_sock.send(&enc_req).await.unwrap();

    let n2 = client_sock.recv(&mut resp_buf).await.unwrap();
    let (_, dec_resp) = parse_and_decrypt_packet(&resp_buf[..n2], &token, &key, &iv).unwrap();
    assert!(dec_resp.contains("\"result\":[\"charging\"]"));
    assert!(dec_resp.contains("\"id\":456"));

    tokio::time::sleep(Duration::from_millis(50)).await;
    // Flushed automatically

    let content = tokio::fs::read_to_string(&test_file).await.unwrap();
    assert!(content.contains("miio_handshake"));
    assert!(content.contains("get_status"));
    assert!(content.contains("456"));

    let _ = tokio::fs::remove_file(&test_file).await;
}

#[tokio::test]
async fn test_udp_proxy_fail_open_raw() {
    let test_file = format!(
        "target/test_udp_failopen_{}.jsonl",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    let logger = CaptureLogger::start(&test_file);

    let token = [0x42u8; 16];

    let upstream_socket = UdpSocket::bind("127.0.0.1:0").await.unwrap();
    let upstream_addr = upstream_socket.local_addr().unwrap();

    tokio::spawn(async move {
        let mut buf = [0u8; 1024];
        let (n, peer) = upstream_socket.recv_from(&mut buf).await.unwrap();
        let mut echo = b"ECHO:".to_vec();
        echo.extend_from_slice(&buf[..n]);
        upstream_socket.send_to(&echo, peer).await.unwrap();
    });

    let proxy_addr = start_udp_proxy("127.0.0.1:0".parse().unwrap(), upstream_addr, token, logger.clone(), 5)
        .await
        .unwrap();

    let client = UdpSocket::bind("127.0.0.1:0").await.unwrap();
    client.connect(proxy_addr).await.unwrap();

    // Send arbitrary undecryptable data
    client.send(b"arbitrary non-miio bytes 12345").await.unwrap();

    let mut buf = [0u8; 1024];
    let n = client.recv(&mut buf).await.unwrap();
    assert_eq!(&buf[..n], b"ECHO:arbitrary non-miio bytes 12345");

    tokio::time::sleep(Duration::from_millis(50)).await;
    // Flushed automatically

    let content = tokio::fs::read_to_string(&test_file).await.unwrap();
    assert!(content.contains("raw_forward"));

    let _ = tokio::fs::remove_file(&test_file).await;
}

