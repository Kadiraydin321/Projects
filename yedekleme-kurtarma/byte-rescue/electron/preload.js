// electron/preload.js
// ByteRescue - Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Sistem Sürücüleri, Yetki & Güvenlik
  listDrives: () => ipcRenderer.invoke('list-drives'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectScanFolder: () => ipcRenderer.invoke('select-scan-folder'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDefaultDestination: () => ipcRenderer.invoke('get-default-destination'),
  checkSafety: (source, dest) => ipcRenderer.invoke('check-safety', source, dest),
  checkAdminStatus: () => ipcRenderer.invoke('check-admin-status'),
  requestAdminElevation: () => ipcRenderer.invoke('request-admin-elevation'),

  // Tarama Kontrolleri
  startScan: (options) => ipcRenderer.invoke('start-scan', options),
  pauseScan: () => ipcRenderer.invoke('pause-scan'),
  resumeScan: () => ipcRenderer.invoke('resume-scan'),
  stopScan: () => ipcRenderer.invoke('stop-scan'),

  // İnceleme & Kurtarma
  getHexDump: (sourcePath, offset, length, filePath) => ipcRenderer.invoke('get-hex-dump', sourcePath, offset, length, filePath),
  getFilePreview: (sourcePath, offset, size, mime, filePath) => ipcRenderer.invoke('get-file-preview', sourcePath, offset, size, mime, filePath),
  recoverFiles: (sourcePath, files, destDir) => ipcRenderer.invoke('recover-files', sourcePath, files, destDir),

  // Test Verisi Oluşturma
  createTestImage: () => ipcRenderer.invoke('create-test-image'),

  // Olay Dinleyicileri (Events from Main process)
  onScanProgress: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('scan-progress', sub);
    return () => ipcRenderer.removeListener('scan-progress', sub);
  },
  onFileFound: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('file-found', sub);
    return () => ipcRenderer.removeListener('file-found', sub);
  },
  onScanCompleted: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('scan-completed', sub);
    return () => ipcRenderer.removeListener('scan-completed', sub);
  },
  onScanError: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('scan-error', sub);
    return () => ipcRenderer.removeListener('scan-error', sub);
  },
  onScanStatusChange: (callback) => {
    const sub = (_event, data) => callback(data);
    ipcRenderer.on('scan-status-change', sub);
    return () => ipcRenderer.removeListener('scan-status-change', sub);
  }
});

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFGn/fOfRBmre
// SIG // h/+JfEbzkyCK0CuyoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFM5b
// SIG // ubqHucSKuRKP1/lTp2hCdRrtMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAD4eTB1sxts7wIX7g91pFbYZCGmPi4iMYPN+cwlG
// SIG // OLfv04oLjnTuaIgwxVY+xLdhrlcrj28VO9M2cHMKD+pq
// SIG // WeAmTUQfDadXHtiQ9umTENY9Z13tDyeSdh8yzFc/a2L/
// SIG // KCnbpw7cmMQRAuZENeypwKtUTNVgB5EpqZrHEIgJfYaf
// SIG // N2IyJQvX/+5gUgZroOzC76GghfaNVeygF5b+bvKCgjAU
// SIG // aAGfs7iEnxOQEaYqjwGnVSHk8uXfrn5ziQr1ecawTwNe
// SIG // 3nYXp9d8h+69LKcuMdyTArXE+9aazxAdCTBio515LSEJ
// SIG // mJTbVtCXV5gtVOdgym7GhFk3/bimzr+aKZhK80U=
// SIG // End signature block
