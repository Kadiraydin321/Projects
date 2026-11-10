/**
 * Cross-Platform LAN / Wi-Fi Sync Test Engine
 * Sıfır harici bağımlılık - Tamamen yerleşik Node.js modülleri ile çalışır.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class SyncTestEngine {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 8765;
    this.pin = options.pin || null;
    this.timeout = options.timeout || 6000;
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  get baseUrl() {
    return `http://${this.host}:${this.port}`;
  }

  async runHttp(method, path, options = {}) {
    const urlStr = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    const parsed = new URL(urlStr);
    const postData = options.body ? (Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body)) : null;

    const headers = { ...options.headers };
    if (postData && !headers['Content-Length'] && !headers['content-length']) {
      headers['Content-Length'] = postData.length;
    }

    const t0 = Date.now();
    return new Promise((resolve) => {
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: method.toUpperCase(),
        headers: headers,
        timeout: options.timeout || this.timeout,
      }, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const latency = Date.now() - t0;
          const bodyBuffer = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(bodyBuffer.toString('utf8'));
          } catch (_) {}

          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            headers: res.headers,
            bodyBuffer,
            bodyText: bodyBuffer.toString('utf8'),
            json,
            latency
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          ok: false,
          statusCode: 0,
          error: 'TIMEOUT',
          latency: Date.now() - t0
        });
      });

      req.on('error', (err) => {
        resolve({
          ok: false,
          statusCode: 0,
          error: err.code || err.message,
          latency: Date.now() - t0
        });
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  async assertTest(category, name, testFn) {
    const t0 = Date.now();
    try {
      const outcome = await testFn();
      const duration = Date.now() - t0;
      const result = {
        category,
        name,
        passed: outcome.passed,
        message: outcome.message || (outcome.passed ? 'Başarılı' : 'Beklenen koşul sağlanamadı'),
        duration,
        details: outcome.details || null
      };
      this.results.push(result);
      return result;
    } catch (err) {
      const duration = Date.now() - t0;
      const result = {
        category,
        name,
        passed: false,
        message: `Hata: ${err.message}`,
        duration,
        error: err.stack
      };
      this.results.push(result);
      return result;
    }
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const totalDuration = this.results.reduce((acc, r) => acc + r.duration, 0);

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      totalDuration,
      results: this.results
    };
  }
}

module.exports = { SyncTestEngine };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFEj3D/PkyCi4
// SIG // EVNCBG/n2BKrXXU7oIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFJTH
// SIG // +bQvHL/KL/abvOm+r9y2Ql3EMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAGYRAgylf3oxNYSLz4QwFY7NfxAkYsFhVCrS8dlB
// SIG // XNZP3un/r9mGBtmiD3JlX93qXVzKsvphzQMwKOo63P9s
// SIG // u/CrrkQ8IVnOkFN9wGe11qg1Of2VSfKR2WrlYV7m2ih/
// SIG // QJ90Tzx4hO/Eikt/nIzWRnkTTelQXVgO4GQqILBYgEi6
// SIG // 5hGaDGubT1iAns+VQt60O1oDNmtiV1UVxUsPEtbFxuk+
// SIG // fS4jSKcz1mh/erPmeSb/yAACIjsYTX/jh8qyHZgNZbF+
// SIG // v44ge6kkulYWmXKfbXZ7syFUWuKfV/CkWCfxNFCWQOjR
// SIG // OXRVrJNyUdVVuESk5WXixKjC/DUbvXCUqvny/sw=
// SIG // End signature block
