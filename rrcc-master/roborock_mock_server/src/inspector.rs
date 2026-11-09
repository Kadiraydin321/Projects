use colored::*;
use serde_json::Value;
use std::io::Write;

pub struct Inspector;

impl Inspector {
    pub fn print_banner(
        udp_port: u16,
        tcp_port: u16,
        model: &str,
        did: u32,
        token_hex: &str,
        mac: &str,
        log_file: &str,
    ) {
        println!(
            "{}",
            "╔═══════════════════════════════════════════════════════════════════════╗"
                .bright_cyan()
        );
        println!(
            "{}",
            "║              ROBOROCK MOCK ROBOT SERVER (Rust Engine)                ║"
                .bright_cyan()
                .bold()
        );
        println!(
            "{}",
            "╠═══════════════════════════════════════════════════════════════════════╣"
                .bright_cyan()
        );
        println!(
            "║  {} {:<54}║",
            "Model:".bright_yellow(),
            model.bright_white().bold()
        );
        println!(
            "║  {} {:<54}║",
            "MAC:  ".bright_yellow(),
            mac.bright_magenta().bold()
        );
        println!(
            "║  {} {:<54}║",
            "DID:  ".bright_yellow(),
            format!("0x{:08x} ({})", did, did).bright_white()
        );
        println!(
            "║  {} {:<54}║",
            "Token:".bright_yellow(),
            token_hex.bright_green()
        );
        println!(
            "║  {} {:<54}║",
            "UDP:  ".bright_yellow(),
            format!("0.0.0.0:{} (miIO Handshake & RPC)", udp_port).bright_white()
        );
        println!(
            "║  {} {:<54}║",
            "TCP:  ".bright_yellow(),
            format!("0.0.0.0:{} (LocalClientService LAN)", tcp_port).bright_white()
        );
        println!(
            "║  {} {:<54}║",
            "Log:  ".bright_yellow(),
            format!("{} (Yapılandırılmış JSONL Dosyası)", log_file).bright_blue()
        );
        println!(
            "{}",
            "╚═══════════════════════════════════════════════════════════════════════╝"
                .bright_cyan()
        );
        println!(
            "{}",
            "  >> Canlı Paket Denetçisi ve JSONL Kayıtçısı aktif...\n"
                .bright_green()
                .italic()
        );
    }

    pub fn log_handshake(peer: &std::net::SocketAddr, did: u32, stamp: u32, log_file: &str) {
        let time_str = chrono::Local::now().format("%H:%M:%S%.3f").to_string();
        println!(
            "[{}] {} {} -> DID: 0x{:08x}, Stamp: {}",
            time_str.dimmed(),
            "🤝 [UDP MIIO HANDSHAKE]".bright_yellow().bold(),
            peer.to_string().bright_blue(),
            did,
            stamp
        );

        let record = serde_json::json!({
            "timestamp": chrono::Local::now().to_rfc3339(),
            "protocol": "UDP",
            "event": "handshake",
            "peer": peer.to_string(),
            "did": format!("0x{:08x}", did),
            "stamp": stamp
        });
        if let Ok(line) = serde_json::to_string(&record) {
            if let Ok(mut f) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(log_file)
            {
                let _ = writeln!(f, "{}", line);
            }
        }
    }

    pub fn log_rpc_request(
        proto: &str,
        peer: &std::net::SocketAddr,
        method: &str,
        id: u64,
        raw_json: &str,
    ) {
        let time_str = chrono::Local::now().format("%H:%M:%S%.3f").to_string();
        let proto_tag = if proto == "UDP" {
            "[UDP miIO]".bright_cyan().bold()
        } else {
            "[TCP LAN ]".bright_magenta().bold()
        };

        println!(
            "[{}] {} {} {} (id={})",
            time_str.dimmed(),
            proto_tag,
            peer.to_string().bright_blue(),
            format!("⚡ {}", method).bright_green().bold(),
            id
        );

        if let Ok(val) = serde_json::from_str::<Value>(raw_json) {
            if let Ok(pretty) = serde_json::to_string_pretty(&val) {
                for line in pretty.lines().take(12) {
                    println!("    {}", line.dimmed());
                }
            }
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn log_rpc_response(
        proto: &str,
        peer: &std::net::SocketAddr,
        method: &str,
        id: u64,
        elapsed_micros: u128,
        raw_request: &str,
        resp_json: &str,
        log_file: &str,
    ) {
        let time_str = chrono::Local::now().format("%H:%M:%S%.3f").to_string();
        let proto_tag = if proto == "UDP" {
            "[UDP RESP]".cyan()
        } else {
            "[TCP RESP]".magenta()
        };

        let elapsed_str = if elapsed_micros < 1000 {
            format!("{} µs", elapsed_micros)
        } else {
            format!("{:.2} ms", elapsed_micros as f64 / 1000.0)
        };

        println!(
            "[{}] {} (id={}) Gecikme: {} -> {}",
            time_str.dimmed(),
            proto_tag,
            id,
            elapsed_str.bright_yellow(),
            resp_json.dimmed()
        );

        // JSONL kalıcı log dosyasına kaydet
        let record = serde_json::json!({
            "timestamp": chrono::Local::now().to_rfc3339(),
            "protocol": proto,
            "peer": peer.to_string(),
            "method": method,
            "id": id,
            "request": serde_json::from_str::<Value>(raw_request).unwrap_or(serde_json::json!(raw_request)),
            "response": serde_json::from_str::<Value>(resp_json).unwrap_or(serde_json::json!(resp_json)),
            "elapsed_us": elapsed_micros
        });
        if let Ok(line) = serde_json::to_string(&record) {
            if let Ok(mut f) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(log_file)
            {
                let _ = writeln!(f, "{}", line);
            }
        }
    }
}
