class AuthValidator {
  static async runAuthTests(engine, pin) {
    // 1. PIN olmadan erişim denemesi (401 beklenir)
    await engine.assertTest('Güvenlik & Yetkilendirme', 'Eksik PIN Koruması (HTTP 401 Doğrulaması)', async () => {
      const res = await engine.runHttp('GET', '/api/sync/download');
      const pass = res.statusCode === 401;
      return {
        passed: pass,
        message: pass ? 'Sunucu eksik PIN ile erişimi HTTP 401 ile başarıyla engelledi.' : `Beklenen HTTP 401, Alınan: ${res.statusCode}`,
        details: { statusCode: res.statusCode }
      };
    });

    // 2. Yanlış PIN ile erişim denemesi (401 beklenir)
    await engine.assertTest('Güvenlik & Yetkilendirme', 'Hatalı PIN Koruması (HTTP 401 Doğrulaması)', async () => {
      const fakePin = '9999' === pin ? '0000' : '9999';
      const res = await engine.runHttp('GET', '/api/sync/download', {
        headers: { 'X-Sync-PIN': fakePin }
      });
      const pass = res.statusCode === 401;
      return {
        passed: pass,
        message: pass ? 'Sunucu hatalı PIN denemesini HTTP 401 ile reddetti.' : `Beklenen HTTP 401, Alınan: ${res.statusCode}`,
        details: { fakePin, statusCode: res.statusCode }
      };
    });

    // 3. Geçerli PIN - 'X-Sync-PIN' Başlığı Testi
    if (pin) {
      await engine.assertTest('Güvenlik & Yetkilendirme', "Geçerli PIN - 'X-Sync-PIN' Header Doğrulaması", async () => {
        const res = await engine.runHttp('GET', '/api/sync/download', {
          headers: { 'X-Sync-PIN': pin }
        });
        const pass = res.statusCode === 200;
        return {
          passed: pass,
          message: pass ? "Sunucu 'X-Sync-PIN' başlığı ile başarıyla yetkilendirdi (HTTP 200)." : `Hata kodu: ${res.statusCode}`,
          details: { statusCode: res.statusCode }
        };
      });

      // 4. Geçerli PIN - 'X-Pairing-PIN' Başlığı Testi
      await engine.assertTest('Güvenlik & Yetkilendirme', "Geçerli PIN - 'X-Pairing-PIN' Alternatif Başlık Desteği", async () => {
        const res = await engine.runHttp('GET', '/api/sync/download', {
          headers: { 'X-Pairing-PIN': pin }
        });
        const pass = res.statusCode === 200;
        return {
          passed: pass,
          message: pass ? "Sunucu 'X-Pairing-PIN' başlığı ile başarıyla yetkilendirdi (HTTP 200)." : `Hata kodu: ${res.statusCode}`,
          details: { statusCode: res.statusCode }
        };
      });

      // 5. Geçerli PIN - URL Parametresi Testi (?pin=...)
      await engine.assertTest('Güvenlik & Yetkilendirme', 'Geçerli PIN - URL Sorgu Parametresi (?pin=...) Desteği', async () => {
        const res = await engine.runHttp('GET', `/api/sync/download?pin=${pin}`);
        const pass = res.statusCode === 200;
        return {
          passed: pass,
          message: pass ? 'Sunucu URL parametresindeki PIN ile başarıyla yetkilendirdi (HTTP 200).' : `Hata kodu: ${res.statusCode}`,
          details: { statusCode: res.statusCode }
        };
      });
    }
  }
}

module.exports = { AuthValidator };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFExBzVINpcCG
// SIG // vUFuFfbwlGSlGinOoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFHJF
// SIG // ItwkBjUGsAnUdO38B2eacbTuMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAH2pjaAFf+JT0x/K5GyyNtzougiUAOxJ1uhtiCbx
// SIG // o5WqsAwkz+vsQvB8sgl4Bko6FixnTbrl+SKnpqEQPxEp
// SIG // 0g0mjNE+uxJEY1nmpDuzZJhKlpnYRgzvWvQzFznbH1eX
// SIG // cHBHVJj5Iy02E8+rtXB0CyTBxvM0TR+jHa3YyGgs3yx2
// SIG // Eu6eUgjoISNrbtBm9vhPew0ygW79WP3lXemKfaUtcgF9
// SIG // +1w/CRLaA6r7ix2KjmnofI6K4TO0zMUBrhTOGhfLX9mC
// SIG // I2p5RsK1XNnXenN95all8Hi74XGG6sefTUimlR2EaXL/
// SIG // iL70JBNLnCVGxJ/ZlWM/m/UYDJpr4Q7YQHmznMg=
// SIG // End signature block
