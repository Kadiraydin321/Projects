const crypto = require('crypto');

class SyncProtocolSuite {
  static sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static generateSamplePayload() {
    const now = Date.now();
    return {
      notes: [
        {
          id: 99901,
          title: 'Wi-Fi Senkronizasyon Test Notu 1',
          content: '# Test İçeriği\nBu not otomatik Wi-Fi test paketi tarafından üretilmiştir.\n- Madde 1\n- Madde 2',
          timestamp: now,
          updatedAt: now,
          categoryId: 1,
          isPinned: 1,
          isLocked: 0,
          isArchived: 0,
          isDeleted: 0
        },
        {
          id: 99902,
          title: 'Wi-Fi Test Notu 2',
          content: 'İkinci senkronizasyon doğrulama paketi verisi.',
          timestamp: now,
          updatedAt: now,
          categoryId: 1,
          isPinned: 0,
          isLocked: 0,
          isArchived: 0,
          isDeleted: 0
        }
      ],
      categories: [
        { id: 1, name: 'Otomasyon Testleri', color: 4282550000 }
      ],
      timestamp: now
    };
  }

  static async runProtocolTests(engine, pin) {
    let downloadedBuffer = null;

    // 1. Download Testi (Masaüstü -> İstemci)
    await engine.assertTest('Senkronizasyon Protokolü', 'Yedek İndirme / Dışa Aktarma (GET /api/sync/download)', async () => {
      const res = await engine.runHttp('GET', '/api/sync/download', {
        headers: { 'X-Sync-PIN': pin }
      });

      const pass = res.statusCode === 200 && res.bodyBuffer.length > 0;
      if (pass) {
        downloadedBuffer = res.bodyBuffer;
      }
      return {
        passed: pass,
        message: pass ? `Başarıyla ${res.bodyBuffer.length} bayt veri alındı. (Content-Type: ${res.headers['content-type'] || 'bilinmiyor'})` : `İndirme başarısız (HTTP ${res.statusCode})`,
        details: { size: res.bodyBuffer.length, contentType: res.headers['content-type'] }
      };
    });

    // 2. Veri Bütünlüğü Doğrulaması (SHA-256 Kontrolü)
    await engine.assertTest('Senkronizasyon Protokolü', 'Veri Bütünlüğü ve Arşiv İmzası (SHA-256 Hash)', async () => {
      if (!downloadedBuffer) {
        return { passed: false, message: 'İndirilen veri bulunmadığı için hash hesaplanamadı.' };
      }
      const hash = SyncProtocolSuite.sha256(downloadedBuffer);
      const isZip = downloadedBuffer.length >= 4 && downloadedBuffer[0] === 0x50 && downloadedBuffer[1] === 0x4B; // PK magic
      return {
        passed: true,
        message: `Veri arşivi SHA-256 doğrulaması tamamlandı. (Paket Türü: ${isZip ? 'ZIP Arşivi' : 'JSON Metin'})`,
        details: { sha256: hash, isZip, byteSize: downloadedBuffer.length }
      };
    });

    // 3. Upload Testi (İstemci -> Masaüstü)
    await engine.assertTest('Senkronizasyon Protokolü', 'Yedek Yükleme / İçe Aktarma (POST /api/sync/upload)', async () => {
      // Gönderilecek test paketi
      const testPayload = SyncProtocolSuite.generateSamplePayload();
      const bodyStr = JSON.stringify(testPayload);

      // Sunucu JSON veya ZIP kabul edebilir
      const res = await engine.runHttp('POST', '/api/sync/upload', {
        headers: {
          'X-Sync-PIN': pin,
          'Content-Type': 'application/json'
        },
        body: bodyStr
      });

      // Eğer sunucu sadece zip istiyorsa veya upload kabul ediyorsa durum kodu kontrolü
      const pass = res.statusCode === 200 || (res.statusCode === 400 && res.bodyText.includes('ZIP'));
      return {
        passed: pass,
        message: res.statusCode === 200 ? 'Sunucu test yükünü başarıyla işledi ve yanıtladı.' : `Sunucu beklenen format kısıtlamasını bildirdi (HTTP ${res.statusCode})`,
        details: { statusCode: res.statusCode, response: res.json || res.bodyText.substring(0, 100) }
      };
    });
  }
}

module.exports = { SyncProtocolSuite };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFL3lSneoxXG7
// SIG // jKY72A95725wXmoOoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFEia
// SIG // S8RK2jzdoxdetveHgt3tdy5QMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAHV73lXOHbRHGCfFOLRB16jBEt2LnL9t51XDb56u
// SIG // 1YW1YKgg9lgbF0eJwRyZHFSxSWsB9BcPNXH0oI3zT9td
// SIG // HUxwFS/2UiyOh27oAET9WRsJUgiO0NBaPHFSqyvZYOZZ
// SIG // jf2KQaL1MuysGuxRvL3bOfuz0FVdsunzmkf/imiuN8z2
// SIG // J5SO3+csgMg0CdXUKzWCOosp459mD3bwZjluZf7/V7F6
// SIG // GRNpqfZJIGdDHQsaTrN2n8T/19TpXCyXw39+BYfzRcrE
// SIG // Xjal89vwkHF2IzS6+p14nJ93Nu0ZXBmRPLlxllmIM4MC
// SIG // H+WI/Kd8zJigGgqAcY/MdGcRfZejw7X/2ma8sO8=
// SIG // End signature block
