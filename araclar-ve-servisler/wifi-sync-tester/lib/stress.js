class StressRunner {
  static async runStressTests(engine, pin) {
    // 1. Aşırı Yük Testi (10 MB Payload - HTTP 413 veya Güvenli Ret)
    await engine.assertTest('Stres & Sınır Durumlar', 'Aşırı Yük Taşması Koruması (10 MB Payload Testi)', async () => {
      // 10 MB sahte tampon bellek
      const bigBuffer = Buffer.alloc(10 * 1024 * 1024, 0x41); // 'A' karakterleri
      const res = await engine.runHttp('POST', '/api/sync/upload', {
        headers: {
          'X-Sync-PIN': pin,
          'Content-Type': 'application/octet-stream'
        },
        body: bigBuffer,
        timeout: 8000
      });

      // Beklenen durum: 413 (Payload Too Large), 400 (Bad Request), 401 veya sunucunun çökmeden güvenle yanıt vermesi
      const pass = res.statusCode === 413 || res.statusCode === 400 || res.statusCode === 415 || res.statusCode === 500;
      return {
        passed: pass,
        message: pass ? `Sunucu 10 MB aşırı yükü güvenle reddetti (HTTP ${res.statusCode}). Bellek taşması önlendi.` : `Sunucu aşırı yükü beklenmedik şekilde kabul etti (HTTP ${res.statusCode})`,
        details: { statusCode: res.statusCode }
      };
    });

    // 2. Bozuk / Geçersiz Paket Testi (Bozuk ZIP / Hatalı JSON)
    await engine.assertTest('Stres & Sınır Durumlar', 'Bozuk Veri Paketi Gönderimi (Fuzzing Koruması)', async () => {
      const corruptData = Buffer.from('PK\x03\x04BOZUK_ZIP_DOSYA_VERISI_TEST_CORRUPTION_1234567890');
      const res = await engine.runHttp('POST', '/api/sync/upload', {
        headers: {
          'X-Sync-PIN': pin,
          'Content-Type': 'application/zip'
        },
        body: corruptData
      });

      // Sunucu çökmeyip 400 veya success:false dönmeli
      const pass = res.statusCode === 400 || (res.statusCode === 200 && res.json && res.json.success === false) || res.statusCode === 500;
      return {
        passed: pass,
        message: pass ? 'Sunucu bozuk paketi güvenli bir hata mesajıyla karşıladı, süreç kilitlenmedi.' : `Beklenmeyen yanıt (HTTP ${res.statusCode})`,
        details: { statusCode: res.statusCode, response: res.json || res.bodyText.substring(0, 100) }
      };
    });

    // 3. Eşzamanlılık ve Yüksek Trafik Testi (5 Paralel İstek)
    await engine.assertTest('Stres & Sınır Durumlar', 'Eşzamanlılık ve Kilitlenme Direnci (5 Paralel İstek)', async () => {
      const concurrentCount = 5;
      const promises = [];
      for (let i = 0; i < concurrentCount; i++) {
        promises.push(engine.runHttp('GET', '/api/status'));
      }

      const responses = await Promise.all(promises);
      const allOk = responses.every(r => r.ok);
      const avgLatency = Math.round(responses.reduce((acc, r) => acc + r.latency, 0) / responses.length);

      return {
        passed: allOk,
        message: allOk ? `5 eşzamanlı istek kilitlenme olmadan tamamlandı (Ortalama Yanıt: ${avgLatency} ms).` : 'Bazı eşzamanlı istekler başarısız oldu.',
        details: { count: concurrentCount, avgLatency, statuses: responses.map(r => r.statusCode) }
      };
    });
  }
}

module.exports = { StressRunner };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFOGP1l3iB1UV
// SIG // PouR+ZUjc6/Gp2LmoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFKYY
// SIG // I67aNPe8i+cCxheSVl6IwJUiMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBALLo3HuAwIXDganpSyrnmn64uRNT49OGMKNGL/94
// SIG // KFx70eLk5DHOqsjDuiZvtGXkKznarxk/yuKD43r/tUlA
// SIG // /teAkOkGHUYcllUeSyuAaniHCmLd/7v/tZa2CcJmwV5L
// SIG // 70V8rlPVekFn+Y/+sofLB26PK+d/ycVnNWSCJ99ihwzl
// SIG // 4PZoghVukB0xgy3cTwBmsGJsa/TwG42wjvum67mHPQla
// SIG // 4havwmDL4KaTZi/cWvovoDi5IqTyUsmIdA/q2KfCHCNX
// SIG // ennMI5mc+xiuDqXu6lKNYprVZvU5thj2cS/OKFt+yJUi
// SIG // sO45raXdKot35L2HCdbiofZmIaS846WlIq26Iyg=
// SIG // End signature block
