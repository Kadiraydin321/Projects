use clap::Parser;
use std::net::IpAddr;

#[derive(Parser, Debug, Clone)]
#[command(
    author = "Antigravity Engineering",
    version = "0.1.0",
    about = "Roborock Mock Robot Server"
)]
pub struct ServerConfig {
    #[arg(short, long, default_value = "0.0.0.0")]
    pub bind_ip: IpAddr,

    #[arg(short, long, default_value_t = 54321)]
    pub udp_port: u16,

    #[arg(short = 'p', long, default_value_t = 58867)]
    pub tcp_port: u16,

    #[arg(short = 'k', long, default_value = "6457713532704e374b56505062715362")]
    pub token_hex: String,

    #[arg(short, long, default_value = "4EDlM4fJ272Mg9kP98f1ST")]
    pub duid: String,

    #[arg(short, long, default_value = "roborock.vacuum.ss09")]
    pub model: String,

    #[arg(short = 'a', long, default_value = "54:48:E6:99:88:77")]
    pub mac: String,

    #[arg(short = 'l', long, default_value = "traffic_log.jsonl")]
    pub log_file: String,

    #[arg(long, default_value_t = 1.0)]
    pub sim_speed: f32,
}

impl ServerConfig {
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
