use crate::rpc::types::{RpcRequest, RpcResponse};
use crate::state::machine::{RobotState, RobotStateCode};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::RwLock;

pub async fn handle_rpc_command(
    req: RpcRequest,
    state: Arc<RwLock<RobotState>>,
    model: &str,
    token_hex: &str,
    mac: &str,
) -> RpcResponse {
    let id = req.id;
    let method = req.method.as_str();

    if let Some(resp) = handle_status_and_consumables(method, id, &state, &req.params).await {
        return resp;
    }

    if let Some(resp) = handle_cleaning_controls(method, id, &state, &req.params).await {
        return resp;
    }

    if let Some(resp) = handle_vacuum_modes(method, id, &state, &req.params).await {
        return resp;
    }

    if let Some(resp) = handle_device_settings(method, id, &state, &req.params).await {
        return resp;
    }

    if let Some(resp) = handle_info_and_meta(method, id, model, token_hex, mac) {
        return resp;
    }

    // Gerçek robot gibi: bilinmeyen metod -> hata (yanlış metod adları fark edilsin)
    RpcResponse::error(id, -32601, "unknown method")
}

async fn handle_status_and_consumables(
    method: &str,
    id: u64,
    state: &Arc<RwLock<RobotState>>,
    params: &Option<Value>,
) -> Option<RpcResponse> {
    match method {
        "get_status" => {
            let st = state.read().await;
            Some(RpcResponse::ok(id, make_status_obj(&st)))
        }

        "get_prop" => {
            let st = state.read().await;
            let req_props = params.as_ref().and_then(|p| p.as_array());

            let is_full_status = match req_props {
                None => true,
                Some(arr) if arr.is_empty() => true,
                Some(arr) => arr.iter().any(|v| v.as_str() == Some("get_status")),
            };

            if is_full_status {
                Some(RpcResponse::ok(id, make_status_obj(&st)))
            } else {
                let arr = req_props.unwrap();
                let values: Vec<Value> = arr
                    .iter()
                    .filter_map(|v| v.as_str())
                    .map(|prop| extract_single_prop(&st, prop))
                    .collect();
                Some(RpcResponse::ok(id, Value::Array(values)))
            }
        }

        "get_consumable" => {
            let st = state.read().await;
            let consumable_obj = json!([{
                "main_brush_work_time": st.consumables.main_brush_work_time,
                "side_brush_work_time": st.consumables.side_brush_work_time,
                "filter_work_time": st.consumables.filter_work_time,
                "sensor_dirty_time": st.consumables.sensor_dirty_time,
                "filter_element_work_time": 0
            }]);
            Some(RpcResponse::ok(id, consumable_obj))
        }

        "reset_consumable" => {
            if let Some(arr) = params.as_ref().and_then(|p| p.as_array()) {
                if let Some(name) = arr.first().and_then(|v| v.as_str()) {
                    let mut st = state.write().await;
                    st.reset_consumable(name);
                }
            }
            Some(RpcResponse::ok_simple(id))
        }

        _ => None,
    }
}

async fn handle_cleaning_controls(
    method: &str,
    id: u64,
    state: &Arc<RwLock<RobotState>>,
    params: &Option<Value>,
) -> Option<RpcResponse> {
    let mut st = state.write().await;
    match method {
        "app_start" => match st.start_cleaning() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_pause" => match st.pause_cleaning() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_resume" => match st.resume_cleaning() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "resume_segment_clean" => match st.resume_segment_clean() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "resume_zoned_clean" => match st.resume_zoned_clean() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_wakeup_robot" => match st.wakeup_robot() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_stop" => match st.stop_cleaning() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_charge" => match st.return_to_dock() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_spot" => match st.start_spot_clean() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_segment_clean" => match parse_segments(params) {
            Some(segs) => match st.start_segment_clean(&segs) {
                Ok(_) => Some(RpcResponse::ok_simple(id)),
                Err(err) => Some(RpcResponse::error(id, -5001, err)),
            },
            None => Some(RpcResponse::error(id, -32602, "invalid params")),
        },
        "app_zoned_clean" => match st.start_zoned_clean() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "app_goto_target" => {
            st.state_code = RobotStateCode::GotoTarget;
            Some(RpcResponse::ok_simple(id))
        }
        "app_start_collect_dust" => {
            st.state_code = RobotStateCode::CollectingDust;
            Some(RpcResponse::ok_simple(id))
        }
        "app_start_wash" => {
            st.state_code = RobotStateCode::WashingDuster;
            Some(RpcResponse::ok_simple(id))
        }
        "app_stop_wash" => match st.stop_wash() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "start_wash_then_charge" => match st.start_wash_then_charge() {
            Ok(_) => Some(RpcResponse::ok_simple(id)),
            Err(err) => Some(RpcResponse::error(id, -1, err)),
        },
        "set_dust_collection_mode" => {
            if let Some(m) = extract_first_u64(params) {
                st.dust_collection_mode = m as u8;
            }
            Some(RpcResponse::ok_simple(id))
        }
        "set_wash_towel_mode" => {
            if let Some(m) = extract_first_u64(params) {
                st.wash_towel_mode = m as u8;
            }
            Some(RpcResponse::ok_simple(id))
        }
        "app_set_dryer_setting" => {
            if let Some(d) = extract_first_u64(params) {
                st.dryer_duration = d as u32;
            }
            Some(RpcResponse::ok_simple(id))
        }
        _ => None,
    }
}

async fn handle_vacuum_modes(
    method: &str,
    id: u64,
    state: &Arc<RwLock<RobotState>>,
    params: &Option<Value>,
) -> Option<RpcResponse> {
    match method {
        "set_custom_mode" => {
            if let Some(val) = extract_first_u64(params) {
                let mut st = state.write().await;
                st.fan_power = val as u16;
            }
            Some(RpcResponse::ok_simple(id))
        }

        "set_water_box_custom_mode" => {
            if let Some(val) = extract_first_u64(params) {
                let mut st = state.write().await;
                st.water_box_mode = val as u16;
            }
            Some(RpcResponse::ok_simple(id))
        }

        "set_mop_mode" => {
            if let Some(val) = extract_first_u64(params) {
                let mut st = state.write().await;
                st.mop_mode = val as u16;
            }
            Some(RpcResponse::ok_simple(id))
        }

        "set_clean_motor_mode" => {
            if let Some(obj) = extract_first_object(params) {
                let mut st = state.write().await;
                if let Some(fan) = obj.get("fan_power").and_then(|v| v.as_u64()) {
                    st.fan_power = fan as u16;
                }
                if let Some(water) = obj.get("water_box_mode").and_then(|v| v.as_u64()) {
                    st.water_box_mode = water as u16;
                }
                if let Some(mop) = obj.get("mop_mode").and_then(|v| v.as_u64()) {
                    st.mop_mode = mop as u16;
                }
            }
            Some(RpcResponse::ok_simple(id))
        }

        _ => None,
    }
}

async fn handle_device_settings(
    method: &str,
    id: u64,
    state: &Arc<RwLock<RobotState>>,
    params: &Option<Value>,
) -> Option<RpcResponse> {
    match method {
        "get_child_lock_status" => {
            let st = state.read().await;
            Some(RpcResponse::ok(id, json!([st.child_lock_status])))
        }
        "set_child_lock_status" => {
            if let Some(val) = extract_first_u64(params) {
                let mut st = state.write().await;
                st.child_lock_status = val as u8;
            }
            Some(RpcResponse::ok_simple(id))
        }
        "get_led_status" => {
            let st = state.read().await;
            Some(RpcResponse::ok(id, json!([st.led_status])))
        }
        "set_led_status" => {
            if let Some(val) = extract_first_u64(params) {
                let mut st = state.write().await;
                st.led_status = val as u8;
            }
            Some(RpcResponse::ok_simple(id))
        }
        "get_carpet_clean_mode" | "get_carpet_mode" => {
            let st = state.read().await;
            Some(RpcResponse::ok(
                id,
                json!([{"enable": st.carpet_clean_mode}]),
            ))
        }
        "set_carpet_clean_mode" | "set_carpet_mode" => {
            if let Some(val) = extract_first_u64(params) {
                let mut st = state.write().await;
                st.carpet_clean_mode = val as u8;
            }
            Some(RpcResponse::ok_simple(id))
        }
        "get_voice_locale" | "get_current_sound" => Some(RpcResponse::ok(
            id,
            json!([{"location": "tr", "bom": "A.03.0001"}]),
        )),
        "get_timer" => Some(RpcResponse::ok(id, json!([]))),
        "get_server_timer" => {
            let now = chrono::Utc::now().timestamp();
            Some(RpcResponse::ok(id, json!([now])))
        }
        "get_network_info" => Some(RpcResponse::ok(
            id,
            json!({
                "ssid": "Roborock_Mock_Network",
                "bssid": "00:11:22:33:44:55",
                "rssi": -42,
                "ip": "127.0.0.1",
                "gw": "192.168.1.1",
                "mask": "255.255.255.0"
            }),
        )),
        _ => None,
    }
}

fn handle_info_and_meta(
    method: &str,
    id: u64,
    model: &str,
    token_hex: &str,
    mac: &str,
) -> Option<RpcResponse> {
    match method {
        "get_room_mapping" => {
            let mapping = json!([
                [16, "538910"],
                [17, "538911"],
                [18, "538912"],
                [19, "538913"],
                [20, "538914"],
                [21, "538915"]
            ]);
            Some(RpcResponse::ok(id, mapping))
        }

        "get_multi_maps_list" => {
            let map_info = json!([{
                "max_multi_map": 4,
                "max_bak_map": 1,
                "multi_map_count": 1,
                "map_info": [{
                    "mapFlag": 0,
                    "add_time": 1682594000,
                    "length": 0,
                    "name": "1. Kat",
                    "bak_maps": []
                }]
            }]);
            Some(RpcResponse::ok(id, map_info))
        }

        "load_multi_map" | "save_map" => Some(RpcResponse::ok_simple(id)),

        "get_clean_summary" => {
            let summary = json!([36000, 150000000, 24, [1682597877, 1682594277]]);
            Some(RpcResponse::ok(id, summary))
        }

        "get_map_v1" => Some(RpcResponse::ok(id, json!(["retry"]))),

        "miIO.info" => {
            let info = json!({
                "hw_ver": "Linux",
                "fw_ver": "4.3.5_1234",
                "ap": {
                    "ssid": "Roborock_Mock_Network",
                    "bssid": "00:11:22:33:44:55",
                    "rssi": -42
                },
                "netif": {
                    "localIp": "127.0.0.1",
                    "mask": "255.255.255.0",
                    "gw": "192.168.1.1"
                },
                "model": model,
                "mac": mac,
                "token": token_hex
            });
            Some(RpcResponse::ok(id, info))
        }

        "find_me" => Some(RpcResponse::ok_simple(id)),
        "get_serial_number" => Some(RpcResponse::ok(
            id,
            json!([{"serial_number": "MOCK0000001"}]),
        )),
        "get_timezone" => Some(RpcResponse::ok(id, json!(["Europe/Istanbul"]))),
        "get_sound_volume" => Some(RpcResponse::ok(id, json!([60]))),
        "get_dnd_timer" => Some(RpcResponse::ok(
            id,
            json!([{"start_hour":22,"start_minute":0,"end_hour":8,"end_minute":0,"enabled":0}]),
        )),
        "get_clean_record" => Some(RpcResponse::ok(
            id,
            json!([[1682597877, 1682594277, 3600, 24000000, 0, 1]]),
        )),

        _ => None,
    }
}

fn make_status_obj(st: &RobotState) -> Value {
    json!([{
        "msg_ver": 2,
        "msg_seq": 10,
        "state": st.state_code as u8,
        "battery": st.battery,
        "clean_time": st.clean_time,
        "clean_area": st.clean_area,
        "error_code": st.error_code,
        "map_present": st.map_present,
        "in_cleaning": st.in_cleaning,
        "in_returning": if st.state_code == RobotStateCode::Returning { 1 } else { 0 },
        "in_fresh_state": 1,
        "lab_status": 1,
        "water_box_status": 1,
        "fan_power": st.fan_power,
        "water_box_mode": st.water_box_mode,
        "water_box_carriage_status": 1,
        "mop_mode": st.mop_mode,
        "dnd_enabled": st.dnd_enabled,
        "lock_status": st.lock_status,
        "child_lock_status": st.child_lock_status,
        "led_status": st.led_status,
        "carpet_clean_mode": st.carpet_clean_mode,
        "is_locating": st.is_locating,
        "clean_strategy": 1
    }])
}

fn extract_single_prop(st: &RobotState, prop: &str) -> Value {
    match prop {
        "state" => json!(st.state_code as u8),
        "battery" => json!(st.battery),
        "clean_time" => json!(st.clean_time),
        "clean_area" => json!(st.clean_area),
        "error_code" => json!(st.error_code),
        "fan_power" => json!(st.fan_power),
        "water_box_mode" => json!(st.water_box_mode),
        "mop_mode" => json!(st.mop_mode),
        "in_cleaning" => json!(st.in_cleaning),
        "in_returning" => json!(if st.state_code == RobotStateCode::Returning {
            1
        } else {
            0
        }),
        "map_present" => json!(st.map_present),
        "dnd_enabled" => json!(st.dnd_enabled),
        "lock_status" => json!(st.lock_status),
        "child_lock_status" => json!(st.child_lock_status),
        "led_status" => json!(st.led_status),
        "carpet_clean_mode" => json!(st.carpet_clean_mode),
        "is_locating" => json!(st.is_locating),
        "lab_status" => json!(1),
        "water_box_status" => json!(1),
        "water_box_carriage_status" => json!(1),
        "clean_strategy" => json!(1),
        "in_fresh_state" => json!(1),
        "msg_ver" => json!(2),
        "msg_seq" => json!(10),
        _ => Value::Null,
    }
}

/// Kabul edilen biçimler: [16,17] veya [{"segments":[16,17],"repeat":1}] veya [[16,17]]
fn parse_segments(params: &Option<Value>) -> Option<Vec<u32>> {
    let arr = params.as_ref()?.as_array()?;
    let mut out = Vec::new();
    for v in arr {
        match v {
            Value::Number(n) => out.push(n.as_u64()? as u32),
            Value::Array(a) => {
                for x in a {
                    out.push(x.as_u64()? as u32);
                }
            }
            Value::Object(o) => {
                for x in o.get("segments")?.as_array()? {
                    out.push(x.as_u64()? as u32);
                }
            }
            _ => return None,
        }
    }
    if out.is_empty() {
        None
    } else {
        Some(out)
    }
}

fn extract_first_u64(params: &Option<Value>) -> Option<u64> {
    let arr = params.as_ref()?.as_array()?;
    match arr.first()? {
        Value::Number(n) => n.as_u64(),
        Value::Object(o) => o.values().find_map(|v| v.as_u64()),
        Value::Bool(b) => Some(if *b { 1 } else { 0 }),
        _ => None,
    }
}

fn extract_first_object(params: &Option<Value>) -> Option<&serde_json::Map<String, Value>> {
    params.as_ref()?.as_array()?.first()?.as_object()
}
