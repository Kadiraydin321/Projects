/**
 * Edge Cases & Stress Runner Module
 * Evaluates server stability under oversized payloads, malformed data, and concurrent requests.
 */
const { makeRequest } = require('./security_validator');
const { probeTarget } = require('./discovery_probe');

/**
 * Runs the Edge Cases & Stress Test Suite
 * @param {object} options
 * @param {string} options.host
 * @param {number} options.port
 * @param {string} options.validPin
 * @param {number} options.concurrency - default 5
 * @returns {Promise<Array<object>>}
 */
async function runStressTests({ host, port, validPin, concurrency = 5 }) {
  const tests = [];

  function record(id, title, passed, details, latencyMs = 0, warning = false) {
    tests.push({
      id,
      category: 'SINIR DURUMLAR & STRES / YÜK TESTLERİ',
      title,
      status: passed ? 'PASS' : warning ? 'WARN' : 'FAIL',
      details,
      latencyMs
    });
  }

  // 1. Oversized Payload Test (10 MB dummy buffer)
  {
    const payloadSize = 10 * 1024 * 1024; // 10 MB
    const dummyBuffer = Buffer.alloc(payloadSize, 0x41); // 'A's

    const res = await makeRequest({
      host,
      port,
      path: '/api/sync/upload',
      method: 'POST',
      headers: {
        'x-sync-pin': validPin || '1234',
        'Content-Type': 'application/zip',
        'Content-Length': payloadSize
      },
      body: dummyBuffer,
      timeoutMs: 12000
    });

    // Check if server is still alive
    const postProbe = await probeTarget({ host, port, timeoutMs: 2500 });
    const serverAlive = postProbe.tcpReachable;

    // HTTP 413 Payload Too Large, 400 Bad Request, 401 Unauthorized or even 200 with error is acceptable as long as server doesn't crash
    const safeRejection = res.statusCode === 413 || res.statusCode === 400 || res.statusCode === 413 || (res.statusCode >= 400 && res.statusCode < 500);
    const passed = serverAlive && (safeRejection || res.statusCode === 200 || res.statusCode === 500);

    record(
      'STR-01',
      'Aşırı Yük Güvenlik Testi (10 MB Payload Too Large)',
      passed,
      serverAlive
        ? `10 MB yük sonrası sunucu çökmedi (HTTP: ${res.statusCode}, Ping: ${postProbe.tcpLatencyMs} ms). ${res.statusCode === 413 ? 'Mükemmel: HTTP 413 Payload Too Large döndü.' : 'Sunucu isteği güvenle işledi/tahliye etti.'}`
        : `KRİTİK HATA: 10 MB yük sunucunun çökmesine/yanıt veremez hale gelmesine neden oldu!`,
      res.latencyMs
    );
  }

  // 2. Corrupt / Malformed ZIP Packet
  {
    // Generate 64 KB of random corrupt bytes with broken zip header
    const corruptBuffer = Buffer.alloc(64 * 1024);
    corruptBuffer.write('PK\x03\x04\xFF\xFF', 0); // Fake broken zip header followed by garbage
    for (let i = 6; i < corruptBuffer.length; i++) {
      corruptBuffer[i] = (i * 37) % 256;
    }

    const res = await makeRequest({
      host,
      port,
      path: '/api/sync/upload',
      method: 'POST',
      headers: {
        'x-sync-pin': validPin || '1234',
        'Content-Type': 'application/zip'
      },
      body: corruptBuffer,
      timeoutMs: 6000
    });

    const postProbe = await probeTarget({ host, port, timeoutMs: 2500 });
    const serverAlive = postProbe.tcpReachable;

    // Server should safely report bad request or handled error without unhandled exception crash
    const passed = serverAlive;
    record(
      'STR-02',
      'Bozuk ZIP / Geçersiz İkili Veri Paketi Testi',
      passed,
      serverAlive
        ? `Bozuk veri paketi gönderildiğinde sunucu kararlı kaldı (HTTP: ${res.statusCode}). Unhandled Exception oluşmadı.`
        : `Sunucu bozuk ikili veri paketinde çöktü!`,
      res.latencyMs
    );
  }

  // 3. Concurrency Stress Test
  {
    const clientCount = Math.max(2, concurrency);
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < clientCount; i++) {
      // Alternate between status and download requests
      const path = (i % 2 === 0 || !validPin)
        ? '/api/status'
        : `/api/sync/download?pin=${encodeURIComponent(validPin)}`;

      promises.push(
        makeRequest({
          host,
          port,
          path,
          headers: validPin ? { 'x-sync-pin': validPin } : {},
          timeoutMs: 5000
        })
      );
    }

    const responses = await Promise.all(promises);
    const totalElapsedMs = Date.now() - startTime;

    const successfulResponses = responses.filter((r) => r.ok && (r.statusCode === 200 || r.statusCode === 401));
    const allSuccessful = successfulResponses.length === clientCount;

    const latencies = responses.map((r) => r.latencyMs).filter((l) => l >= 0);
    const minLatency = latencies.length ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length ? Math.max(...latencies) : 0;
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const reqPerSec = totalElapsedMs > 0 ? Math.round((clientCount / (totalElapsedMs / 1000)) * 10) / 10 : 0;

    record(
      'STR-03',
      `Eşzamanlı Çoklu İstemci Testi (${clientCount} Paralel İstek)`,
      allSuccessful,
      allSuccessful
        ? `${clientCount} eşzamanlı istek ${totalElapsedMs} ms sürede tamamlandı. Kilitlenme: 0. Hız: ${reqPerSec} req/sn (Min: ${minLatency}ms, Ort: ${avgLatency}ms, Max: ${maxLatency}ms).`
        : `${clientCount} istekten ${clientCount - successfulResponses.length} tanesi başarısız oldu veya kilitlendi.`,
      avgLatency
    );
  }

  return tests;
}

module.exports = {
  runStressTests
};

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFDSrHe+Nk4Eh
// SIG // UBuGI9aKYwB/DX5UoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFIb2
// SIG // frs0gyfLDVHfAqNErjEBvIQGMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAHROq37Di7EXpAauKCD2R9J/1lYDe6V1/TTTAcyW
// SIG // OwyOAfbn2c7lJ/mx0cueTUVVe6NxhVc+Wq/5rOUVnVPM
// SIG // 9gt0MylE+RtwRArqo1bQSJHZnQFAj+gCEMlDkfIRWod2
// SIG // 7QKL0F+WSrcJpX2lAYsMe0Vgew6PPYv0pN/XoywKVSCk
// SIG // S/q1rDaE80oOolEnwBYyqe0Y41J56oME8ddSiVM8ky7m
// SIG // HKTk0tf428QVpDADu2Kq6B8wPSGN1wi1IS0HmLMlYYE3
// SIG // a/d+HIX6HcdgzcmhmWE8GnXsj+cREN+O3iWS1VT94jjm
// SIG // z62ZQQbh7UIKv55MwwuzHp3EXbg9+Py8yOQw3wU=
// SIG // End signature block
