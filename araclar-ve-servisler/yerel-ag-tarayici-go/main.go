package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"html/template"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// Windows iphlpapi.dll SendARP definition
var (
	modiphlpapi = syscall.NewLazyDLL("iphlpapi.dll")
	procSendARP = modiphlpapi.NewProc("SendARP")
)

type PortInfo struct {
	Port        int    `json:"port"`
	ServiceName string `json:"service_name"`
	State       string `json:"state"`
}

type Device struct {
	IP             string     `json:"ip"`
	MAC            string     `json:"mac"`
	Vendor         string     `json:"vendor"`
	Hostname       string     `json:"hostname"`
	DeviceType     string     `json:"device_type"`
	IsServer       bool       `json:"is_server"`
	ResponseTimeMS float64    `json:"response_time_ms"`
	OpenPorts      []PortInfo `json:"open_ports"`
}

type ServerState struct {
	ActiveServerPort int
	ActiveServerMsg  string
	ServerRunning    bool
	serverInstance   *http.Server
	sync.Mutex
}

var (
	scannedDevices   []Device
	scannedLock      sync.RWMutex
	isScanning       bool
	scanProgress     int
	scanTotal        int
	scanStatusMsg    string
	scanLock         sync.Mutex
	localServerState ServerState
)

// Common Server Ports
var commonServerPorts = map[int]string{
	21:    "FTP Server",
	22:    "SSH Secure Shell",
	80:    "HTTP Web Server",
	443:   "HTTPS Web Server",
	445:   "SMB Dosya Paylaşımı",
	1433:  "Microsoft SQL Server",
	3306:  "MySQL / MariaDB",
	3389:  "RDP Uzak Masaüstü",
	5432:  "PostgreSQL Server",
	6379:  "Redis Server",
	8000:  "HTTP Dev Server",
	8080:  "HTTP Web App",
	8443:  "HTTPS Web App",
	9000:  "Portainer / SonarQube",
	27017: "MongoDB Database",
}

// OUI Table for Vendors
var ouiVendors = map[string]string{
	"E0:9D:1E": "TP-Link Corporation",
	"26:77:D8": "Xiaomi Communications",
	"00:15:5D": "Microsoft Hyper-V Virtual",
	"00:50:56": "VMware Virtual Server",
	"08:00:27": "Oracle VirtualBox",
	"52:54:00": "QEMU/KVM Virtual NIC",
	"B8:27:EB": "Raspberry Pi Foundation",
	"DC:A6:32": "Raspberry Pi Trading",
	"00:1E:67": "Intel Corporation Server",
	"00:25:90": "Super Micro Computer Server",
	"18:66:DA": "Dell PowerEdge Server",
	"00:1A:64": "HP ProLiant Enterprise Server",
	"48:0F:CF": "Cisco Systems",
	"2C:3F:0B": "Synology NAS Server",
	"00:08:9B": "QNAP NAS Server",
	"04:42:1A": "Apple Inc.",
	"00:03:93": "Apple Inc.",
	"00:23:24": "Giga-Byte Technology",
	"04:D4:C4": "ASUSTek Computer",
	"EC:FA:BC": "Espressif IoT (ESP32/ESP8266)",
}

func getVendor(mac string) string {
	parts := strings.Split(mac, ":")
	if len(parts) >= 3 {
		prefix := fmt.Sprintf("%s:%s:%s", parts[0], parts[1], parts[2])
		if v, ok := ouiVendors[prefix]; ok {
			return v
		}
	}
	return "Bilinmeyen Üretici"
}

func sendARP(ipStr string) (string, float64, error) {
	ip := net.ParseIP(ipStr).To4()
	if ip == nil {
		return "", 0, fmt.Errorf("invalid ipv4")
	}

	destIP := *(*uint32)(unsafe.Pointer(&ip[0]))
	mac := make([]byte, 6)
	macLen := uint32(len(mac))

	t0 := time.Now()
	ret, _, _ := procSendARP.Call(
		uintptr(destIP),
		0,
		uintptr(unsafe.Pointer(&mac[0])),
		uintptr(unsafe.Pointer(&macLen)),
	)
	elapsed := float64(time.Since(t0).Microseconds()) / 1000.0

	if ret == 0 {
		macStr := fmt.Sprintf("%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5])
		return macStr, elapsed, nil
	}
	return "", 0, fmt.Errorf("no arp reply")
}

func resolveHostname(ipStr string) string {
	names, err := net.LookupAddr(ipStr)
	if err == nil && len(names) > 0 {
		return strings.TrimSuffix(names[0], ".")
	}
	return "Bilinmiyor"
}

func scanPorts(ipStr string) []PortInfo {
	var results []PortInfo
	for port, name := range commonServerPorts {
		target := fmt.Sprintf("%s:%d", ipStr, port)
		conn, err := net.DialTimeout("tcp", target, 200*time.Millisecond)
		if err == nil {
			conn.Close()
			results = append(results, PortInfo{
				Port:        port,
				ServiceName: name,
				State:       "Açık",
			})
		}
	}
	return results
}

func getDefaultSubnet() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err == nil {
		defer conn.Close()
		localAddr := conn.LocalAddr().(*net.UDPAddr)
		parts := strings.Split(localAddr.IP.String(), ".")
		if len(parts) == 4 {
			return fmt.Sprintf("%s.%s.%s.0/24", parts[0], parts[1], parts[2])
		}
	}
	return "192.168.1.0/24"
}

func startScanTask(cidr string) {
	scanLock.Lock()
	if isScanning {
		scanLock.Unlock()
		return
	}
	isScanning = true
	scanProgress = 0
	scanTotal = 254
	scanStatusMsg = "Tarama başlatılıyor..."
	scanLock.Unlock()

	scannedLock.Lock()
	scannedDevices = make([]Device, 0)
	scannedLock.Unlock()

	go func() {
		parts := strings.Split(cidr, "/")
		baseIP := parts[0]
		ipParts := strings.Split(baseIP, ".")
		if len(ipParts) != 4 {
			scanLock.Lock()
			isScanning = false
			scanStatusMsg = "Geçersiz CIDR formatı!"
			scanLock.Unlock()
			return
		}
		prefix := fmt.Sprintf("%s.%s.%s", ipParts[0], ipParts[1], ipParts[2])

		var wg sync.WaitGroup
		sem := make(chan struct{}, 50) // 50 eşzamanlı Go rutini

		for i := 1; i <= 254; i++ {
			targetIP := fmt.Sprintf("%s.%d", prefix, i)
			wg.Add(1)
			sem <- struct{}{}

			go func(ip string, idx int) {
				defer wg.Done()
				defer func() { <-sem }()

				mac, rtt, err := sendARP(ip)
				if err == nil {
					vendor := getVendor(mac)
					hostname := resolveHostname(ip)
					ports := scanPorts(ip)

					isServer := len(ports) > 0 || strings.Contains(vendor, "Server") || strings.Contains(vendor, "NAS")
					devType := "İstemci / Bilgisayar"
					if isServer {
						devType = "Sunucu"
					} else if strings.HasSuffix(ip, ".1") {
						devType = "Yönlendirici / Ağ Cihazı"
					}

					dev := Device{
						IP:             ip,
						MAC:            mac,
						Vendor:         vendor,
						Hostname:       hostname,
						DeviceType:     devType,
						IsServer:       isServer,
						ResponseTimeMS: rtt,
						OpenPorts:      ports,
					}

					scannedLock.Lock()
					scannedDevices = append(scannedDevices, dev)
					scannedLock.Unlock()
				}

				scanLock.Lock()
				scanProgress++
				scannedLock.RLock()
				count := len(scannedDevices)
				scannedLock.RUnlock()
				scanStatusMsg = fmt.Sprintf("Taranıyor: %d/254 IP (%d Cihaz Bulundu)", scanProgress, count)
				scanLock.Unlock()
			}(targetIP, i)
		}

		wg.Wait()

		scanLock.Lock()
		isScanning = false
		scannedLock.RLock()
		serverCount := 0
		for _, d := range scannedDevices {
			if d.IsServer {
				serverCount++
			}
		}
		scanStatusMsg = fmt.Sprintf("Tarama Tamamlandı! %d Cihaz, %d Sunucu Tespit Edildi.", len(scannedDevices), serverCount)
		scannedLock.RUnlock()
		scanLock.Unlock()
	}()
}

// Embedded HTML, CSS & JavaScript UI
const uiHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Yerel Ağ ve Sunucu Yönetim Konsolu (Go Core)</title>
  <style>
    :root {
      --bg-main: #0F1117;
      --bg-card: #181B24;
      --bg-surface: #222634;
      --border: #2D3345;
      --text: #E6EDF3;
      --text-muted: #8B949E;
      --accent: #00ADB5;
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
    
    .nav-tabs { display: flex; gap: 8px; margin-bottom: 15px; }
    .tab-btn { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
    .tab-btn.active { background: var(--bg-surface); color: var(--accent); border-color: var(--accent); }
    
    .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    input[type="text"] { background: var(--bg-surface); border: 1px solid var(--border); color: var(--text); padding: 8px 14px; border-radius: 8px; font-size: 14px; outline: none; }
    input[type="text"]:focus { border-color: var(--accent); }
    .btn { background: var(--accent); color: #000; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-green { background: var(--accent-green); color: #fff; }
    .btn-danger { background: var(--accent-danger); color: #fff; }
    
    .progress-bar-container { width: 100%; height: 6px; background: var(--bg-surface); border-radius: 4px; overflow: hidden; margin-bottom: 15px; }
    .progress-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.3s; }
    .status-text { font-size: 13px; color: var(--text-muted); margin-bottom: 15px; }
    
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--border); }
    th { background: var(--bg-surface); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag-server { background: rgba(255, 123, 84, 0.15); color: var(--accent-server); border: 1px solid var(--accent-server); }
    .tag-client { background: rgba(0, 173, 181, 0.15); color: var(--accent); border: 1px solid var(--accent); }
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
      <h1>🚀 Yerel Ağ ve Sunucu Yönetim Konsolu</h1>
      <p>Yüksek Performanslı Go Motoru & Windows Hibrit SendARP Mimarisi</p>
    </div>
    <div class="stats">
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
      <input type="text" id="cidrInput" value="{{.Subnet}}" style="width: 170px;" placeholder="Alt Ağ (CIDR)">
      <button class="btn" onclick="startScan()">Ağı Tara</button>
      <input type="text" id="searchInput" onkeyup="filterTable()" style="flex: 1;" placeholder="🔍 IP, MAC, Üretici veya Cihaz Adına göre canlı filtrele...">
      <button class="btn" style="background:var(--bg-surface); color:var(--text);" onclick="exportData('csv')">CSV İndir</button>
      <button class="btn" style="background:var(--bg-surface); color:var(--text);" onclick="exportData('json')">JSON İndir</button>
    </div>

    <div class="progress-bar-container"><div id="progressFill" class="progress-fill"></div></div>
    <div id="statusText" class="status-text">Hazır. Ağı taramak için 'Ağı Tara' butonuna tıklayın.</div>

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
        <input type="text" id="serverMsgInput" value="🚀 Merhaba! Bu sunucu Yerel Ag Yoneticisi tarafindan baslatildi." style="width: 100%;">
      </div>
      <button class="btn btn-green" id="btnToggleServer" onclick="toggleLocalServer()">Sunucuyu Başlat</button>

      <div class="server-status-box" id="serverStatusBox">
        <strong>Sunucu Durumu:</strong> <span id="serverRunningStatus" style="color:var(--text-muted)">Kapalı</span>
        <div id="serverUrlBox" style="margin-top: 8px; font-size: 13px; color: var(--accent); display: none;"></div>
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
            setTimeout(pollStatus, 400);
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
        updateServerUI(data);
      });
    }

    function updateServerUI(data) {
      const statusLbl = document.getElementById('serverRunningStatus');
      const urlBox = document.getElementById('serverUrlBox');
      const btn = document.getElementById('btnToggleServer');

      if (data.running) {
        statusLbl.innerText = 'Çalışıyor (Port: ' + data.port + ')';
        statusLbl.style.color = 'var(--accent-green)';
        btn.innerText = 'Sunucuyu Durdur';
        btn.className = 'btn btn-danger';
        urlBox.style.display = 'block';
        urlBox.innerHTML = 'Erişim Adresi: <a href="http://localhost:' + data.port + '" target="_blank" style="color:var(--accent);">http://localhost:' + data.port + '</a>';
      } else {
        statusLbl.innerText = 'Kapalı';
        statusLbl.style.color = 'var(--text-muted)';
        btn.innerText = 'Sunucuyu Başlat';
        btn.className = 'btn btn-green';
        urlBox.style.display = 'none';
      }
    }
  </script>
</body>
</html>
`

func openBrowser(url string) {
	time.Sleep(300 * time.Millisecond)
	switch runtime.GOOS {
	case "windows":
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	}
}

func main() {
	subnet := getDefaultSubnet()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl, err := template.New("index").Parse(uiHTML)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		tmpl.Execute(w, map[string]string{"Subnet": subnet})
	})

	http.HandleFunc("/api/scan", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			CIDR string `json:"cidr"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.CIDR == "" {
			req.CIDR = subnet
		}
		startScanTask(req.CIDR)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"started": true})
	})

	http.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		scanLock.Lock()
		defer scanLock.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"is_scanning":    isScanning,
			"current":        scanProgress,
			"total":          scanTotal,
			"status_message": scanStatusMsg,
		})
	})

	http.HandleFunc("/api/devices", func(w http.ResponseWriter, r *http.Request) {
		scannedLock.RLock()
		defer scannedLock.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(scannedDevices)
	})

	http.HandleFunc("/api/export", func(w http.ResponseWriter, r *http.Request) {
		format := r.URL.Query().Get("format")
		scannedLock.RLock()
		defer scannedLock.RUnlock()

		if format == "json" {
			w.Header().Set("Content-Disposition", "attachment; filename=yerel_ag_cihazlari.json")
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(scannedDevices)
			return
		}

		w.Header().Set("Content-Disposition", "attachment; filename=yerel_ag_cihazlari.csv")
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Write([]byte("\xEF\xBB\xBF")) // UTF-8 BOM for Excel

		writer := csv.NewWriter(w)
		writer.Write([]string{"IP", "MAC", "Üretici", "Hostname", "Tür", "Sunucu Mu", "Gecikme (ms)", "Portlar"})
		for _, d := range scannedDevices {
			var ports []string
			for _, p := range d.OpenPorts {
				ports = append(ports, fmt.Sprintf("%d (%s)", p.Port, p.ServiceName))
			}
			isSrv := "Hayır"
			if d.IsServer {
				isSrv = "Evet"
			}
			writer.Write([]string{
				d.IP,
				d.MAC,
				d.Vendor,
				d.Hostname,
				d.DeviceType,
				isSrv,
				fmt.Sprintf("%.1f", d.ResponseTimeMS),
				strings.Join(ports, ", "),
			})
		}
		writer.Flush()
	})

	http.HandleFunc("/api/server/toggle", func(w http.ResponseWriter, r *http.Request) {
		localServerState.Lock()
		defer localServerState.Unlock()

		if localServerState.ServerRunning {
			if localServerState.serverInstance != nil {
				go localServerState.serverInstance.Close()
			}
			localServerState.ServerRunning = false
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"running": false})
			return
		}

		var req struct {
			Port    int    `json:"port"`
			Message string `json:"message"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Port <= 0 {
			req.Port = 8088
		}
		if req.Message == "" {
			req.Message = "Merhaba! Yerel test sunucusu devrede."
		}

		mux := http.NewServeMux()
		mux.HandleFunc("/", func(sw http.ResponseWriter, sr *http.Request) {
			sw.Header().Set("Content-Type", "text/html; charset=utf-8")
			fmt.Fprintf(sw, "<h2>%s</h2><p>Calisma Zamani: %s</p>", req.Message, time.Now().Format("15:04:05"))
		})

		srv := &http.Server{
			Addr:    fmt.Sprintf(":%d", req.Port),
			Handler: mux,
		}

		localServerState.serverInstance = srv
		localServerState.ActiveServerPort = req.Port
		localServerState.ServerRunning = true

		go func() {
			srv.ListenAndServe()
		}()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"running": true,
			"port":    req.Port,
		})
	})

	port := "4321"
	url := "http://localhost:" + port
	fmt.Printf("\n======================================================\n")
	fmt.Printf(" [Go Core] Yerel Ag ve Sunucu Tarayici Baslatildi!\n")
	fmt.Printf(" Arayuz Adresi: %s\n", url)
	fmt.Printf("======================================================\n\n")

	go openBrowser(url)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Fprintf(os.Stderr, "Hata: %v\n", err)
	}
}
