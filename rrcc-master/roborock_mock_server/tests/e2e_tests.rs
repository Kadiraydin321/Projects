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
    let token = "6457713532704e374b56505062715362";
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
    let test_port = 58910;
    let bind_addr: SocketAddr = format!("127.0.0.1:{}", test_port).parse().unwrap();
    let token = "6457713532704e374b56505062715362".to_string();
    let mac = "54:48:E6:99:88:77".to_string();
    let log_file = "test_tcp_traffic.jsonl".to_string();

    start_tcp_listener(
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
    tokio::time::sleep(Duration::from_millis(100)).await;

    let mut stream = TcpStream::connect(bind_addr).await.unwrap();
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
    let token = "6457713532704e374b56505062715362";
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
    let token = "6457713532704e374b56505062715362";
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
    let token = "6457713532704e374b56505062715362";
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
    assert_eq!(net["ip"], "192.168.1.44");

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
    let test_port = 58920;
    let bind_addr: SocketAddr = format!("127.0.0.1:{}", test_port).parse().unwrap();
    let token = "6457713532704e374b56505062715362".to_string();
    let mac = "54:48:E6:99:88:77".to_string();
    let log_file = "test_tcp_stream.jsonl".to_string();

    start_tcp_listener(
        bind_addr,
        Arc::clone(&state),
        "roborock.vacuum.ss09".to_string(),
        token,
        mac,
        log_file,
    )
    .await
    .unwrap();

    tokio::time::sleep(Duration::from_millis(100)).await;

    let stream = TcpStream::connect(bind_addr).await.unwrap();
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
