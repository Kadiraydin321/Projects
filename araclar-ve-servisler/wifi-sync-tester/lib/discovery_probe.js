/**
 * Discovery & Ping Probe Module
 * Probes target IP/port, checks latency, parses server identity and discovers LAN servers.
 */
const http = require('http');
const net = require('net');
const os = require('os');

/**
 * Performs low-level TCP Ping to measure raw socket connect latency
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<{reachable: boolean, latencyMs: number, error?: string}>}
 */
function tcpPing(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const diffNs = process.hrtime.bigint() - start;
      const latencyMs = Number(diffNs) / 1e6;
      socket.destroy();
      resolve({ reachable: true, latencyMs: Math.round(latencyMs * 100) / 100 });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ reachable: false, latencyMs: -1, error: 'Connection timed out' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ reachable: false, latencyMs: -1, error: err.message });
    });

    socket.connect(port, host);
  });
}

/**
 * Sends HTTP GET request with timeout and custom headers
 * @param {string} urlStr
 * @param {object} headers
 * @param {number} timeoutMs
 * @returns {Promise<{statusCode: number, headers: object, body: Buffer, latencyMs: number}>}
 */
function httpGet(urlStr, headers = {}, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const url = new URL(urlStr);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'SyncTester-Probe/1.0',
          'Accept': '*/*',
          ...headers
        },
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const diffNs = process.hrtime.bigint() - start;
          const latencyMs = Math.round((Number(diffNs) / 1e6) * 100) / 100;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
            latencyMs
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTP isteği zaman aşımına uğradı (${timeoutMs} ms)`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Probes the target server for status, identity and latency.
 * Checks /api/status first, then fallbacks to /status if needed.
 * @param {object} options
 * @param {string} options.host
 * @param {number} options.port
 * @param {number} options.timeoutMs
 * @returns {Promise<object>}
 */
async function probeTarget({ host = '127.0.0.1', port = 8765, timeoutMs = 3000 } = {}) {
  const result = {
    host,
    port,
    tcpReachable: false,
    tcpLatencyMs: -1,
    httpStatus: null,
    httpLatencyMs: -1,
    serverInfo: null,
    isSyncServer: false,
    error: null
  };

  // 1. TCP Ping Probe
  const ping = await tcpPing(host, port, timeoutMs);
  result.tcpReachable = ping.reachable;
  result.tcpLatencyMs = ping.latencyMs;

  if (!ping.reachable) {
    result.error = `TCP bağlantısı kurulamadı: ${ping.error}`;
    return result;
  }

  // 2. HTTP Status Probe
  const endpoints = ['/api/status', '/status'];
  for (const ep of endpoints) {
    try {
      const res = await httpGet(`http://${host}:${port}${ep}`, {}, timeoutMs);
      result.httpStatus = res.statusCode;
      result.httpLatencyMs = res.latencyMs;

      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(res.body.toString('utf-8'));
          result.serverInfo = {
            appName: json.appName || 'Unknown Sync Service',
            status: json.status || 'ok',
            notesCount: typeof json.notesCount === 'number' ? json.notesCount : null,
            requiresPin: typeof json.requiresPin === 'boolean' ? json.requiresPin : true,
            version: json.version || '1.0',
            raw: json
          };
          result.isSyncServer = true;
          result.endpoint = ep;
          return result;
        } catch (_) {
          // not JSON, but 200 OK
          result.serverInfo = { rawText: res.body.toString('utf-8').slice(0, 100) };
        }
      }
    } catch (err) {
      result.error = err.message;
    }
  }

  return result;
}

/**
 * Gets local IPv4 addresses and candidate subnets
 * @returns {Array<{interface: string, ip: string, baseSubnet: string}>}
 */
function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.');
        if (parts.length === 4) {
          const baseSubnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
          results.push({
            interface: name,
            ip: addr.address,
            baseSubnet
          });
        }
      }
    }
  }

  return results;
}

/**
 * Scans a subnet or default local networks for active Wi-Fi Sync Servers
 * @param {object} options
 * @param {string} options.subnet - e.g. "192.168.1" (if empty, scans all local subnets + localhost)
 * @param {number} options.port - default 8765
 * @param {number} options.timeoutMs - per-host timeout (default 800)
 * @param {number} options.concurrency - max parallel connections (default 30)
 * @param {function} options.onProgress - progress callback
 * @returns {Promise<Array<object>>}
 */
async function scanSubnet({
  subnet = null,
  port = 8765,
  timeoutMs = 800,
  concurrency = 30,
  onProgress = null
} = {}) {
  const targetIps = new Set();

  // Always check loopback and Android emulator alias
  targetIps.add('127.0.0.1');
  targetIps.add('10.0.2.2');

  const subnetsToScan = [];
  if (subnet) {
    subnetsToScan.push(subnet);
  } else {
    const locals = getLocalSubnets();
    for (const l of locals) {
      subnetsToScan.push(l.baseSubnet);
    }
  }

  for (const s of subnetsToScan) {
    for (let i = 1; i <= 254; i++) {
      targetIps.add(`${s}.${i}`);
    }
  }

  const ipList = Array.from(targetIps);
  const discovered = [];
  let processed = 0;

  // Worker queue
  let currentIndex = 0;
  async function worker() {
    while (currentIndex < ipList.length) {
      const myIndex = currentIndex++;
      const ip = ipList[myIndex];

      try {
        const ping = await tcpPing(ip, port, timeoutMs);
        if (ping.reachable) {
          const probe = await probeTarget({ host: ip, port, timeoutMs: 1500 });
          if (probe.isSyncServer) {
            discovered.push(probe);
          }
        }
      } catch (_) {}

      processed++;
      if (typeof onProgress === 'function' && (processed % 10 === 0 || processed === ipList.length)) {
        onProgress({ current: processed, total: ipList.length, found: discovered.length });
      }
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, ipList.length); w++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return discovered;
}

module.exports = {
  tcpPing,
  httpGet,
  probeTarget,
  getLocalSubnets,
  scanSubnet
};

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFMCoQUpT65u7
// SIG // YUL2GchbwQ4I0M1eoIIDGDCCAxQwggH8oAMCAQICECO+
// SIG // hXVV+mywSC4lkmKyRmIwDQYJKoZIhvcNAQELBQAwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMw
// SIG // HhcNMjYxMTA4MDk0NDE1WhcNMzYxMTA4MDk1NDE1WjAi
// SIG // MSAwHgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0
// SIG // czCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
// SIG // ALVYf1oFZ+beC823GUw/yiFUsl2ZhDf63Sw7QSsQIRVi
// SIG // MW2Rw6LTiIx6yMI38a9WZZ8ahXBYzaO/TGi0CVFnzt2k
// SIG // 7uwbB/03/pr1EBGrKERJFcHcJ6er1x38W8jMZDlxNMtt
// SIG // oNKv/S8xRVwbVC5fgvf63B/tMj6nfXunysARotCNe8MY
// SIG // d8lrdZfhxyhfDrAYD4has6tKJTFfqZtxWGfN/TBnQFGB
// SIG // zozhZBsbQJHZJZEwIrQX4iFSNU4zGnG57FbqIPap83OE
// SIG // uoXU9FR2diXWr7D1njVNxD6M3RwJIB5QMtlBKimKAqwL
// SIG // b0ii5jT7+uNgRv8H4xb+YKU+96pCNE54dqECAwEAAaNG
// SIG // MEQwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsG
// SIG // AQUFBwMDMB0GA1UdDgQWBBTSFBrNRdyMOGEM9VQ5lS2m
// SIG // CvSzZjANBgkqhkiG9w0BAQsFAAOCAQEAJF3bNWKL9NJV
// SIG // a/dn1dHylI79o1oUOawP/4M7vVU8iJZLIpfWC8Mb335d
// SIG // Jr6zpAMwKsAbN5nvoFeQtGFjkMzKPoUlWF0mVbeKLATi
// SIG // lk7//BV9JeXheD3V6xu0q5HuS0CA/u2yJw+TT8nuErZJ
// SIG // 2JLO4O8OghdIv2Xj6FUS0C47ebQRTUgt4Xtgr+no3QPV
// SIG // Sp4NXGxoj0KbDX1gxvrmQ3NuyWJ+nw1IR6pimzZvKXIV
// SIG // wgmBwo0udXB/na//NhpO07XX2J1T9GNOfUuc2rtuFocB
// SIG // Gog4j1dz+k4e2naHoGJ54/OFzAK20C38phicGH0EKnmf
// SIG // ZoEKnlGBoPSwBnYzbJPjuzGCAdcwggHTAgEBMDYwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMC
// SIG // ECO+hXVV+mywSC4lkmKyRmIwCQYFKw4DAhoFAKB4MBgG
// SIG // CisGAQQBgjcCAQwxCjAIoAKAAKECgAAwGQYJKoZIhvcN
// SIG // AQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFJrR
// SIG // B0f97cCS1uAk9rfZMhwQuZygMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAK0Y/L1OyewjKiBD14mqFRnC25OoPMVk8FvM2N3K
// SIG // KgjgLQJh1XfRYW6+HMl7lV5jeLgQ1zI3k4xJmhcvvKmQ
// SIG // W3vdrgj+2RDiGY+qouBd7dTTFgrFLX5YZMZ8moCp2ASd
// SIG // u2PLr/IzVrHfmYyPC1IW0ELuAjvH1KBUaGgGJIRe4ycI
// SIG // Rt0MyzHNWBrHB4FP8N5Oy6V0CnRs5ddiUiARQBAeYMTQ
// SIG // ejnq48JUHJ/lyKC5KkxWuBWG4HqW64XUmWRG5brI3X/N
// SIG // 9HcHeyy4b4s/fR+iasMOGrshDTHlTIY7ri9eqBCjAYSC
// SIG // nkliJeJB5/25KLdEKpzzEEQ5d+MBultl+K3NxiM=
// SIG // End signature block
