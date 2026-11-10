const net = require('net');

class DiscoveryProbe {
  static async checkPortOpen(host, port, timeout = 2000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  static async probeServer(engine) {
    const res = await engine.runHttp('GET', '/api/status');
    if (res.ok && res.json) {
      return {
        online: true,
        endpoint: '/api/status',
        info: res.json,
        latency: res.latency
      };
    }

    // Fallback: /status
    const fallback = await engine.runHttp('GET', '/status');
    if (fallback.ok && fallback.json) {
      return {
        online: true,
        endpoint: '/status',
        info: fallback.json,
        latency: fallback.latency
      };
    }

    return {
      online: false,
      statusCode: res.statusCode || fallback.statusCode,
      error: res.error || fallback.error
    };
  }
}

module.exports = { DiscoveryProbe };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFDXuS3tOK4fm
// SIG // env3F1EdRdwBJbItoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFKi/
// SIG // dIVf3T5H1cfzrmKCUwspI+UWMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAFQl5MkeeTNrgaHfF2+ASU1DUIYumpYlveF1sPlV
// SIG // InlhvCe6ANoInW+CG8upk/4bTSvIc1iyMqv6JEARD6vk
// SIG // atAiVQ17grCYouYwcAS38Yg7cfTpjiiUFUPJRBtyTNwE
// SIG // L4EBfjDzmIc/KLGfCgZrmUWsA8ebrqUdWB0zHuTIHVm6
// SIG // DfKRE1BvRm0jcXe6X0e+6yZRSHKl7Y0a7QHCucnw+uov
// SIG // k+NfRfeC0+3hW+BIWyUp/Bs9ivjJunprGeSD7K9vJ0TW
// SIG // +Z/CW0n1dp5a/qCrTSgaVSAVpYn3MCi2CBMVKC7AwkeA
// SIG // kxvL8WQT0MYg495ZSVQWNvQPpGgndtTs2P1dGJk=
// SIG // End signature block
