use clap::Parser;
use std::net::IpAddr;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ServerMode {
    Mock,
    Proxy {
        upstream_ip: IpAddr,
        upstream_udp_port: u16,
        upstream_tcp_port: u16,
    },
}

#[derive(Parser, Debug, Clone)]
#[command(
    author = "Antigravity Engineering",
    version = "0.1.0",
    about = "Roborock Mock & MITM Proxy Robot Server"
)]
pub struct ServerConfig {
    #[arg(short, long, default_value = "0.0.0.0")]
    pub bind_ip: IpAddr,

    #[arg(long, default_value_t = 54321)]
    pub udp_port: u16,

    #[arg(short = 'p', long, default_value_t = 58867)]
    pub tcp_port: u16,

    #[arg(short = 'k', long, default_value = "0123456789abcdef0123456789abcdef")]
    pub token_hex: String,

    #[arg(short, long, default_value = "MOCK_ROBOROCK_DUID")]
    pub duid: String,

    #[arg(short, long, default_value = "roborock.vacuum.ss09")]
    pub model: String,

    #[arg(short = 'a', long, default_value = "54:48:E6:99:88:77")]
    pub mac: String,

    #[arg(short = 'l', long, default_value = "traffic_log.jsonl")]
    pub log_file: String,

    #[arg(long, default_value_t = 1.0)]
    pub sim_speed: f32,

    #[arg(short = 'u', long = "proxy-upstream")]
    pub proxy_upstream: Option<IpAddr>,

    #[arg(long = "proxy-udp-port", default_value_t = 54321)]
    pub proxy_udp_port: u16,

    #[arg(long = "proxy-tcp-port", default_value_t = 58867)]
    pub proxy_tcp_port: u16,

    #[arg(short = 'c', long = "capture-file", default_value = "mitm_capture.jsonl")]
    pub capture_file: String,

    #[arg(long = "udp-timeout", default_value_t = 5)]
    pub udp_timeout: u64,
}

impl ServerConfig {
    pub fn mode(&self) -> ServerMode {
        match self.proxy_upstream {
            Some(upstream_ip) => ServerMode::Proxy {
                upstream_ip,
                upstream_udp_port: self.proxy_udp_port,
                upstream_tcp_port: self.proxy_tcp_port,
            },
            None => ServerMode::Mock,
        }
    }

    #[allow(dead_code)]
    pub fn token_bytes(&self) -> Result<[u8; 16], String> {
        let bytes =
            hex::decode(&self.token_hex).map_err(|e| format!("Geçersiz token hex: {}", e))?;
        if bytes.len() != 16 {
            return Err(format!(
                "Token tam 16 bayt (32 hex karakter) olmalıdır! Alınan: {} bayt",
                bytes.len()
            ));
        }
        let mut arr = [0u8; 16];
        arr.copy_from_slice(&bytes);
        Ok(arr)
    }
}

