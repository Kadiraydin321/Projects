use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcRequest {
    pub id: u64,
    pub method: String,
    #[serde(default)]
    pub params: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcResponse {
    pub id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exe_time: Option<u32>,
}

impl RpcResponse {
    pub fn ok(id: u64, result: Value) -> Self {
        Self {
            id,
            result: Some(result),
            error: None,
            exe_time: Some(10),
        }
    }

    pub fn ok_simple(id: u64) -> Self {
        Self::ok(id, serde_json::json!(["ok"]))
    }

    #[allow(dead_code)]
    pub fn error(id: u64, code: i32, message: &str) -> Self {
        Self {
            id,
            result: None,
            error: Some(serde_json::json!({
                "code": code,
                "message": message
            })),
            exe_time: Some(5),
        }
    }
}
