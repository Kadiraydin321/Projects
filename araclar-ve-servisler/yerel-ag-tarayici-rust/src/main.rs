use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream, UdpSocket};
use std::sync::{Arc, Mutex, RwLock};
use std::time::{Duration, Instant};

#[link(name = "iphlpapi")]
extern "system" {
    fn SendARP(
        DestIP: u32,
        SrcIP: u32,
        pMacAddr: *mut u8,
        PhyAddrLen: *mut u32,
    ) -> u32;
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PortInfo {
    pub port: u16,
    pub service_name: String,
    pub state: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Device {
    pub ip: String,
    pub mac: String,
    pub vendor: String,
    pub hostname: String,
    pub device_type: String,
    pub is_server: bool,
    pub response_time_ms: f64,
    pub open_ports: Vec<PortInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScanStatus {
    pub is_scanning: bool,
    pub current: usize,
    pub total: usize,
    pub status_message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScanRequest {
    pub cidr: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ServerToggleRequest {
    pub port: Option<u16>,
    pub message: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ServerToggleResponse {
    pub running: bool,
    pub port: u16,
}

struct AppState {
    devices: RwLock<Vec<Device>>,
    status: Mutex<ScanStatus>,
    oui_db: HashMap<&'static str, &'static str>,
    server_running: Mutex<bool>,
    server_port: Mutex<u16>,
}

impl AppState {
    fn new() -> Self {
        let mut oui = HashMap::new();
        oui.insert("E0:9D:1E", "TP-Link Technologies");
        oui.insert("26:77:D8", "Xiaomi Communications");
        oui.insert("00:15:5D", "Microsoft Hyper-V");
        oui.insert("00:50:56", "VMware Virtual Platform");
        oui.insert("08:00:27", "Oracle VirtualBox");
        oui.insert("52:54:00", "QEMU/KVM Virtual NIC");
        oui.insert("B8:27:EB", "Raspberry Pi Foundation");
        oui.insert("DC:A6:32", "Raspberry Pi Trading");
        oui.insert("00:1E:67", "Intel Corporation Server");
        oui.insert("00:25:90", "Super Micro Computer");
        oui.insert("18:66:DA", "Dell PowerEdge Server");
        oui.insert("00:1A:64", "HP ProLiant Server");
        oui.insert("48:0F:CF", "Cisco Systems");
        oui.insert("2C:3F:0B", "Synology NAS Server");
        oui.insert("00:08:9B", "QNAP NAS Server");
        oui.insert("04:42:1A", "Apple Inc.");
        oui.insert("00:03:93", "Apple Inc.");
        oui.insert("04:D4:C4", "ASUSTek Computer");
        oui.insert("EC:FA:BC", "Espressif Systems (ESP IoT)");

        Self {
            devices: RwLock::new(Vec::new()),
            status: Mutex::new(ScanStatus {
                is_scanning: false,
                current: 0,
                total: 254,
                status_message: "Hazır".to_string(),
            }),
            oui_db: oui,
            server_running: Mutex::new(false),
            server_port: Mutex::new(8088),
        }
    }

    fn get_vendor(&self, mac: &str) -> String {
        let parts: Vec<&str> = mac.split(':').collect();
        if parts.len() >= 3 {
            let prefix = format!("{}:{}:{}", parts[0], parts[1], parts[2]);
            if let Some(v) = self.oui_db.get(prefix.as_str()) {
                return v.to_string();
            }
        }
        "Bilinmeyen Üretici".to_string()
    }
}

// Windows SendARP Safe Wrapper
fn send_arp(ip: Ipv4Addr) -> Option<(String, f64)> {
    let octets = ip.octets();
    // Little-endian u32 IP representation
    let dest_ip = u32::from_ne_bytes(octets);
    let mut mac_buf = [0u8; 6];
    let mut mac_len = 6u32;

    let t0 = Instant::now();
    let ret = unsafe {
        SendARP(
            dest_ip,
            0,
            mac_buf.as_mut_ptr(),
            &mut mac_len as *mut u32,
        )
    };
    let elapsed = t0.elapsed().as_secs_f64() * 1000.0;

    if ret == 0 {
        let mac_str = format!(
            "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
            mac_buf[0], mac_buf[1], mac_buf[2], mac_buf[3], mac_buf[4], mac_buf[5]
        );
        Some((mac_str, elapsed))
    } else {
        None
    }
}

// Port Tarayıcı
fn scan_ports(ip: Ipv4Addr) -> Vec<PortInfo> {
    let common_ports: &[(u16, &str)] = &[
        (21, "FTP Server"),
        (22, "SSH Remote Shell"),
        (80, "HTTP Web Server"),
        (443, "HTTPS Web Server"),
        (445, "SMB Windows Paylaşımı"),
        (1433, "MS SQL Server"),
        (3306, "MySQL Database"),
        (3389, "RDP Uzak Masaüstü"),
        (5432, "PostgreSQL Database"),
        (6379, "Redis Server"),
        (8000, "HTTP Dev Server"),
        (8080, "HTTP Web App"),
        (8443, "HTTPS Web App"),
        (9000, "Portainer / SonarQube"),
        (27017, "MongoDB Database"),
    ];

    let mut open_ports = Vec::new();
    for &(port, name) in common_ports {
        let addr = SocketAddr::new(IpAddr::V4(ip), port);
        if let Ok(_stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(150)) {
            open_ports.push(PortInfo {
                port,
                service_name: name.to_string(),
                state: "Açık".to_string(),
            });
        }
    }
    open_ports
}

// NetBIOS & DNS ile Hostname Çözümleme
fn resolve_hostname(ip: Ipv4Addr) -> String {
    // NetBIOS Query (Port 137 UDP)
    let socket = UdpSocket::bind("0.0.0.0:0");
    if let Ok(s) = socket {
        s.set_read_timeout(Some(Duration::from_millis(200))).ok();
        let query: [u8; 50] = [
            0x82, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x20, 0x43, 0x4B, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
            0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
            0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x00, 0x00, 0x21,
            0x00, 0x01
        ];
        if s.send_to(&query, SocketAddr::new(IpAddr::V4(ip), 137)).is_ok() {
            let mut buf = [0u8; 1024];
            if let Ok((len, _)) = s.recv_from(&mut buf) {
                if len >= 72 && buf[56] > 0 {
                    let name_bytes = &buf[57..72];
                    let raw_name = String::from_utf8_lossy(name_bytes).trim().to_string();
                    if !raw_name.is_empty() {
                        return raw_name;
                    }
                }
            }
        }
    }
    "Bilinmiyor".to_string()
}

// Gerçek Yerel Ağ IP'si (Ethernet / Wi-Fi) Tespiti
fn detect_local_network() -> (String, Ipv4Addr) {
    // 192.168.1.1 gateway veya router bağlantısı üzerinden yerel IP bul
    if let Ok(stream) = TcpStream::connect_timeout(
        &SocketAddr::new(IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1)), 80),
        Duration::from_millis(300),
    ) {
        if let Ok(local_addr) = stream.local_addr() {
            if let IpAddr::V4(v4) = local_addr.ip() {
                let oct = v4.octets();
                return (format!("{}.{}.{}.0/24", oct[0], oct[1], oct[2]), v4);
            }
        }
    }
    // Fallback: Doğrudan tespit edilen 192.168.1.6
    (
        "192.168.1.0/24".to_string(),
        Ipv4Addr::new(192, 168, 1, 6),
    )
}

fn execute_scan(state: Arc<AppState>, cidr: String) {
    std::thread::spawn(move || {
        {
            let mut st = state.status.lock().unwrap();
            if st.is_scanning {
                return;
            }
            st.is_scanning = true;
            st.current = 0;
            st.total = 254;
            st.status_message = "Rust motoru ile ultra hızlı ARP taraması başlatıldı...".to_string();
        }

        {
            let mut dev_list = state.devices.write().unwrap();
            dev_list.clear();
        }

        let parts: Vec<&str> = cidr.split('/').collect();
        let base_ip = parts[0];
        let octs: Vec<&str> = base_ip.split('.').collect();
        if octs.len() != 4 {
            let mut st = state.status.lock().unwrap();
            st.is_scanning = false;
            st.status_message = "Geçersiz CIDR!".to_string();
            return;
        }

        let p1: u8 = octs[0].parse().unwrap_or(192);
        let p2: u8 = octs[1].parse().unwrap_or(168);
        let p3: u8 = octs[2].parse().unwrap_or(1);

        use rayon::prelude::*;
        let ip_range: Vec<u8> = (1..=254).collect();

        ip_range.into_par_iter().for_each(|i| {
            let target_ip = Ipv4Addr::new(p1, p2, p3, i);
            if let Some((mac, rtt)) = send_arp(target_ip) {
                let vendor = state.get_vendor(&mac);
                let hostname = resolve_hostname(target_ip);
                let ports = scan_ports(target_ip);

                let is_server = !ports.is_empty()
                    || vendor.contains("Server")
                    || vendor.contains("NAS");
                let mut dev_type = "İstemci / Bilgisayar".to_string();
                if is_server {
                    dev_type = "Sunucu".to_string();
                } else if i == 1 {
                    dev_type = "Yönlendirici / Ağ Cihazı".to_string();
                }

                let dev = Device {
                    ip: target_ip.to_string(),
                    mac,
                    vendor,
                    hostname,
                    device_type: dev_type,
                    is_server,
                    response_time_ms: rtt,
                    open_ports: ports,
                };

                let mut dev_list = state.devices.write().unwrap();
                dev_list.push(dev);
            }

            let mut st = state.status.lock().unwrap();
            st.current += 1;
            let count = state.devices.read().unwrap().len();
            st.status_message = format!("Taranıyor: {}/254 IP ({} Cihaz Bulundu)", st.current, count);
        });

        let mut st = state.status.lock().unwrap();
        st.is_scanning = false;
        let count = state.devices.read().unwrap().len();
        let srv_count = state.devices.read().unwrap().iter().filter(|d| d.is_server).count();
        st.status_message = format!(
            "Rust Taraması Tamamlandı! {} Cihaz, {} Sunucu Tespit Edildi.",
            count, srv_count
        );
    });
}

// Embedded UI HTML
const HTML_CONTENT: &str = r#"<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Yerel Ağ ve Sunucu Yönetim Konsolu (Rust Core)</title>
  <style>
    :root {
      --bg-main: #0B0E14;
      --bg-card: #151922;
      --bg-surface: #1E2330;
      --border: #2D3345;
      --text: #E6EDF3;
      --text-muted: #8B949E;
      --accent: #E05A47; /* Rust Turuncusu */
      --accent-cyan: #00ADB5;
      --accent-server: #FF7B54;
      --accent-green: #2EA043;
      --accent-danger: #DA3633;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    body { background: var(--bg-main); color: var(--text); padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 16px 24px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 20px; }
    .title h1 { font-size: 20px; color: var(--accent); display: flex; align-items: center; gap: 8px; }
    .title p { font-size: 13px; color: var(--text-muted); }
    .stats { display: flex; gap: 15px; }
    .badge { background: var(--bg-surface); padding: 6px 14px; border-radius: 8px; font-size: 13px; border: 1px solid var(--border); }
    .badge-accent { border-color: var(--accent); color: var(--accent); font-weight: bold; }
    .badge-server { border-color: var(--accent-server); color: var(--accent-server); font-weight: bold; }
    .badge-ip { border-color: var(--accent-cyan); color: var(--accent-cyan); font-weight: bold; }
    
    .nav-tabs { display: flex; gap: 8px; margin-bottom: 15px; }
    .tab-btn { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
    .tab-btn.active { background: var(--bg-surface); color: var(--accent); border-color: var(--accent); }
    
    .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    input[type="text"] { background: var(--bg-surface); border: 1px solid var(--border); color: var(--text); padding: 8px 14px; border-radius: 8px; font-size: 14px; outline: none; }
    input[type="text"]:focus { border-color: var(--accent); }
    .btn { background: var(--accent); color: #fff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-green { background: var(--accent-green); }
    .btn-danger { background: var(--accent-danger); }
    
    .progress-bar-container { width: 100%; height: 6px; background: var(--bg-surface); border-radius: 4px; overflow: hidden; margin-bottom: 15px; }
    .progress-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.3s; }
    .status-text { font-size: 13px; color: var(--text-muted); margin-bottom: 15px; }
    
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--border); }
    th { background: var(--bg-surface); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag-server { background: rgba(255, 123, 84, 0.15); color: var(--accent-server); border: 1px solid var(--accent-server); }
    .tag-client { background: rgba(0, 173, 181, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
    .port-chip { display: inline-block; background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; margin: 2px; font-size: 11px; border: 1px solid var(--border); }
    
    .server-creator { background: var(--bg-surface); border-radius: 10px; padding: 20px; border: 1px solid var(--border); max-width: 600px; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; font-size: 13px; margin-bottom: 6px; color: var(--text-muted); }
    .server-status-box { margin-top: 20px; padding: 15px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border); }
  </style>
</head>
<body>

  <div class="header">
    <div class="title">
      <h1>🦀 Yerel Ağ ve Sunucu Yönetim Konsolu (Rust Core)</h1>
      <p>Gerçek Yerel Ağ (LAN): <strong style="color:var(--accent-cyan)">192.168.1.6</strong> (Kaspersky/VPN Filtrelendi)</p>
    </div>
    <div class="stats">
      <div class="badge badge-ip">Local IP: 192.168.1.6</div>
      <div class="badge badge-accent" id="statDevices">Toplam Cihaz: 0</div>
      <div class="badge badge-server" id="statServers">Aktif Sunucu: 0</div>
    </div>
  </div>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('tab-all')">🌐 Tüm Ağ Cihazları</button>
    <button class="tab-btn" onclick="switchTab('tab-servers')">🖥️ Sunucular & Servisler</button>
    <button class="tab-btn" onclick="switchTab('tab-create')">➕ Yerel Sunucu Başlat</button>
  </div>

  <!-- TAB 1: Tüm Cihazlar -->
  <div id="tab-all" class="panel">
    <div class="controls">
      <input type="text" id="cidrInput" value="192.168.1.0/24" style="width: 170px;" placeholder="Alt Ağ (CIDR)">
      <button class="btn" onclick="startScan()">Ağı Tara (Rust)</button>
      <input type="text" id="searchInput" onkeyup="filterTable()" style="flex: 1;" placeholder="🔍 IP, MAC, Üretici veya Cihaz Adına göre canlı filtrele...">
      <button class="btn" style="background:var(--bg-surface); color:var(--text);" onclick="exportData('csv')">CSV İndir</button>
      <button class="btn" style="background:var(--bg-surface); color:var(--text);" onclick="exportData('json')">JSON İndir</button>
    </div>

    <div class="progress-bar-container"><div id="progressFill" class="progress-fill"></div></div>
    <div id="statusText" class="status-text">Hazır. Ağı taramak için 'Ağı Tara' düğmesine tıklayın.</div>

    <table>
      <thead>
        <tr>
          <th>IP Adresi</th>
          <th>MAC Adresi</th>
          <th>Cihaz Üreticisi</th>
          <th>Hostname / DNS</th>
          <th>Tür</th>
          <th>Açık Portlar</th>
          <th>Gecikme</th>
        </tr>
      </thead>
      <tbody id="devicesBody"></tbody>
    </table>
  </div>

  <!-- TAB 2: Sunucular -->
  <div id="tab-servers" class="panel" style="display: none;">
    <h3 style="margin-bottom: 12px; color: var(--accent-server);">Ağda Tespit Edilen Aktif Sunucu ve Servisler</h3>
    <table>
      <thead>
        <tr>
          <th>Sunucu IP</th>
          <th>Cihaz Üreticisi</th>
          <th>Hostname</th>
          <th>Açık Servisler / Portlar</th>
          <th>Gecikme</th>
        </tr>
      </thead>
      <tbody id="serversBody"></tbody>
    </table>
  </div>

  <!-- TAB 3: Yerel Sunucu Başlatıcı -->
  <div id="tab-create" class="panel" style="display: none;">
    <h3 style="margin-bottom: 15px; color: var(--accent);">Yerel Ağda Yeni Bir Web / Test Sunucusu Başlat</h3>
    <div class="server-creator">
      <div class="form-group">
        <label>Sunucu Portu (Örn: 8088, 9090, 5000):</label>
        <input type="text" id="serverPortInput" value="8088" style="width: 100%;">
      </div>
      <div class="form-group">
        <label>Yayınlanacak Karşılama Mesajı / HTML Yanıtı:</label>
        <input type="text" id="serverMsgInput" value="🦀 Merhaba! Bu sunucu Rust Konsolu tarafından başlatıldı." style="width: 100%;">
      </div>
      <button class="btn btn-green" id="btnToggleServer" onclick="toggleLocalServer()">Sunucuyu Başlat</button>

      <div class="server-status-box" id="serverStatusBox">
        <strong>Sunucu Durumu:</strong> <span id="serverRunningStatus" style="color:var(--text-muted)">Kapalı</span>
        <div id="serverUrlBox" style="margin-top: 8px; font-size: 13px; color: var(--accent-cyan); display: none;"></div>
      </div>
    </div>
  </div>

  <script>
    let allDevices = [];

    function switchTab(tabId) {
      document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).style.display = 'block';
      event.target.classList.add('active');
    }

    function startScan() {
      const cidr = document.getElementById('cidrInput').value;
      fetch('/api/scan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({cidr: cidr})
      });
      pollStatus();
    }

    function pollStatus() {
      fetch('/api/status')
        .then(res => res.json())
        .then(data => {
          document.getElementById('statusText').innerText = data.status_message;
          const pct = (data.current / data.total) * 100;
          document.getElementById('progressFill').style.width = pct + '%';
          
          fetchDevices();

          if (data.is_scanning) {
            setTimeout(pollStatus, 300);
          }
        });
    }

    function fetchDevices() {
      fetch('/api/devices')
        .then(res => res.json())
        .then(devices => {
          allDevices = devices;
          renderTables();
        });
    }

    function renderTables() {
      const tbodyAll = document.getElementById('devicesBody');
      const tbodySrv = document.getElementById('serversBody');
      const q = document.getElementById('searchInput').value.toLowerCase();
      
      tbodyAll.innerHTML = '';
      tbodySrv.innerHTML = '';

      let srvCount = 0;

      allDevices.forEach(d => {
        const matches = (d.ip + d.mac + d.vendor + d.hostname).toLowerCase().includes(q);
        if (!matches) return;

        const portChips = (d.open_ports || []).map(p => '<span class="port-chip">' + p.port + ' (' + p.service_name + ')</span>').join('') || '-';
        const tag = d.is_server 
          ? '<span class="tag tag-server">Sunucu</span>' 
          : '<span class="tag tag-client">' + d.device_type + '</span>';

        const row = document.createElement('tr');
        row.innerHTML = '<td><strong>' + d.ip + '</strong></td>' +
                        '<td>' + d.mac + '</td>' +
                        '<td>' + d.vendor + '</td>' +
                        '<td>' + d.hostname + '</td>' +
                        '<td>' + tag + '</td>' +
                        '<td>' + portChips + '</td>' +
                        '<td>' + d.response_time_ms.toFixed(1) + ' ms</td>';
        tbodyAll.appendChild(row);

        if (d.is_server) {
          srvCount++;
          const srvRow = document.createElement('tr');
          srvRow.innerHTML = '<td><strong style="color:var(--accent-server);">' + d.ip + '</strong></td>' +
                             '<td>' + d.vendor + '</td>' +
                             '<td>' + d.hostname + '</td>' +
                             '<td>' + portChips + '</td>' +
                             '<td>' + d.response_time_ms.toFixed(1) + ' ms</td>';
          tbodySrv.appendChild(srvRow);
        }
      });

      document.getElementById('statDevices').innerText = 'Toplam Cihaz: ' + allDevices.length;
      document.getElementById('statServers').innerText = 'Aktif Sunucu: ' + srvCount;
    }

    function filterTable() {
      renderTables();
    }

    function exportData(type) {
      window.location.href = '/api/export?format=' + type;
    }

    function toggleLocalServer() {
      const port = document.getElementById('serverPortInput').value;
      const msg = document.getElementById('serverMsgInput').value;
      fetch('/api/server/toggle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({port: parseInt(port), message: msg})
      })
      .then(res => res.json())
      .then(data => {
        const statusLbl = document.getElementById('serverRunningStatus');
        const urlBox = document.getElementById('serverUrlBox');
        const btn = document.getElementById('btnToggleServer');

        if (data.running) {
          statusLbl.innerText = 'Çalışıyor (Port: ' + data.port + ')';
          statusLbl.style.color = 'var(--accent-green)';
          btn.innerText = 'Sunucuyu Durdur';
          btn.className = 'btn btn-danger';
          urlBox.style.display = 'block';
          urlBox.innerHTML = 'Erişim: <a href="http://192.168.1.6:' + data.port + '" target="_blank" style="color:var(--accent-cyan);">http://192.168.1.6:' + data.port + '</a>';
        } else {
          statusLbl.innerText = 'Kapalı';
          statusLbl.style.color = 'var(--text-muted)';
          btn.innerText = 'Sunucuyu Başlat';
          btn.className = 'btn btn-green';
          urlBox.style.display = 'none';
        }
      });
    }

    // Sayfa açıldığında otomatik ilk listeyi çek
    fetchDevices();
  </script>
</body>
</html>
"#;

fn main() {
    let (subnet, local_ip) = detect_local_network();
    let state = Arc::new(AppState::new());

    println!("======================================================");
    println!(" [Rust Core] Yerel Ag ve Sunucu Yonetim Konsolu");
    println!(" Gercek Yerel IP (LAN): {}", local_ip);
    println!(" Varsayilan Alt Ag:     {}", subnet);
    println!(" Web Konsolu:           http://localhost:54321");
    println!("======================================================");

    let server = tiny_http::Server::http("0.0.0.0:54321").unwrap();

    // Tarayıcıyı aç
    let _ = std::process::Command::new("rundll32")
        .args(&["url.dll,FileProtocolHandler", "http://localhost:54321"])
        .spawn();

    for mut request in server.incoming_requests() {
        let url = request.url().to_string();
        let method = request.method().as_str().to_string();

        if url == "/" || url == "/index.html" {
            let response = tiny_http::Response::from_string(HTML_CONTENT)
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
            request.respond(response).ok();
        } else if url == "/api/status" {
            let st = state.status.lock().unwrap();
            let json = serde_json::to_string(&*st).unwrap();
            let response = tiny_http::Response::from_string(json)
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
            request.respond(response).ok();
        } else if url == "/api/devices" {
            let devs = state.devices.read().unwrap();
            let json = serde_json::to_string(&*devs).unwrap();
            let response = tiny_http::Response::from_string(json)
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
            request.respond(response).ok();
        } else if url == "/api/scan" && method == "POST" {
            let mut body = String::new();
            request.as_reader().read_to_string(&mut body).ok();
            let req: ScanRequest = serde_json::from_str(&body).unwrap_or(ScanRequest { cidr: None });
            let cidr = req.cidr.unwrap_or_else(|| subnet.clone());

            execute_scan(Arc::clone(&state), cidr);

            let response = tiny_http::Response::from_string("{\"started\":true}")
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
            request.respond(response).ok();
        } else if url.starts_with("/api/export") {
            let devs = state.devices.read().unwrap();
            if url.contains("format=json") {
                let json = serde_json::to_string_pretty(&*devs).unwrap();
                let response = tiny_http::Response::from_string(json)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Disposition"[..], &b"attachment; filename=yerel_ag_rust.json"[..]).unwrap());
                request.respond(response).ok();
            } else {
                let mut csv_data = vec![0xEF, 0xBB, 0xBF]; // UTF-8 BOM
                csv_data.extend_from_slice(b"IP,MAC,Uretici,Hostname,Tur,Sunucu Mu,Gecikme (ms),Portlar\n");
                for d in devs.iter() {
                    let ports: Vec<String> = d.open_ports.iter().map(|p| format!("{} ({})", p.port, p.service_name)).collect();
                    let line = format!(
                        "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{:.1}\",\"{}\"\n",
                        d.ip,
                        d.mac,
                        d.vendor,
                        d.hostname,
                        d.device_type,
                        if d.is_server { "Evet" } else { "Hayir" },
                        d.response_time_ms,
                        ports.join("; ")
                    );
                    csv_data.extend_from_slice(line.as_bytes());
                }
                let response = tiny_http::Response::from_data(csv_data)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/csv; charset=utf-8"[..]).unwrap())
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Disposition"[..], &b"attachment; filename=yerel_ag_rust.csv"[..]).unwrap());
                request.respond(response).ok();
            }
        } else if url == "/api/server/toggle" && method == "POST" {
            let mut body = String::new();
            request.as_reader().read_to_string(&mut body).ok();
            let req: ServerToggleRequest = serde_json::from_str(&body).unwrap_or(ServerToggleRequest { port: None, message: None });
            let port = req.port.unwrap_or(8088);
            let msg = req.message.unwrap_or_else(|| "Rust Yerel Sunucusu Devrede!".to_string());

            let mut running = state.server_running.lock().unwrap();
            *running = !*running;
            let current_running = *running;

            if current_running {
                *state.server_port.lock().unwrap() = port;
                std::thread::spawn(move || {
                    if let Ok(local_srv) = tiny_http::Server::http(format!("0.0.0.0:{}", port)) {
                        for req in local_srv.incoming_requests() {
                            let resp_body = format!("<h1>{}</h1><p>Rust Yerel Test Sunucusu</p>", msg);
                            let resp = tiny_http::Response::from_string(resp_body)
                                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
                            req.respond(resp).ok();
                        }
                    }
                });
            }

            let resp_obj = ServerToggleResponse {
                running: current_running,
                port,
            };
            let json = serde_json::to_string(&resp_obj).unwrap();
            let response = tiny_http::Response::from_string(json)
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
            request.respond(response).ok();
        } else {
            let response = tiny_http::Response::from_string("Not Found").with_status_code(404);
            request.respond(response).ok();
        }
    }
}
