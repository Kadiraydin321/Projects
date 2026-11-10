// electron/main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { execSync, exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CarverEngine } from '../engine/carver.js';
import { DiskDetector } from '../engine/disk-detector.js';
import { SampleDiskGenerator } from '../engine/sample-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let activeEngine = null;

// Windows yönetici / UAC kontrolü
function checkIsAdmin() {
  if (process.platform === 'win32') {
    try {
      execSync('fsutil dirty query %systemdrive%', { stdio: 'ignore' });
      return true;
    } catch (_) {
      try {
        execSync('net session', { stdio: 'ignore' });
        return true;
      } catch (_) {
        return false;
      }
    }
  } else {
    return process.getuid ? process.getuid() === 0 : false;
  }
}

function getWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

// Windows görev çubuğu ve bildirimler için uygulama kimliği
if (process.platform === 'win32') {
  app.setAppUserModelId('com.kadir.byterescue');
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1024,
    minHeight: 720,
    title: 'ByteRescue // Veri Kurtarıcı',
    backgroundColor: '#070a13',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  }

  mainWindow.on('closed', () => {
    if (activeEngine && activeEngine.isRunning) {
      activeEngine.stopScan();
    }
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('check-admin-status', async () => {
  return {
    isAdmin: checkIsAdmin(),
    platform: process.platform
  };
});

ipcMain.handle('request-admin-elevation', async () => {
  if (process.platform === 'win32') {
    const exePath = process.execPath;
    exec(`powershell.exe -Command "Start-Process '${exePath}' -Verb RunAs"`, (err) => {
      if (!err) {
        app.quit();
      }
    });
    return { restarting: true };
  }
  return { restarting: false };
});

ipcMain.handle('list-drives', async () => {
  return DiskDetector.listDrives();
});

ipcMain.handle('get-default-destination', async () => {
  return DiskDetector.getDefaultDestination();
});

ipcMain.handle('select-file', async () => {
  const win = getWindow();
  const options = {
    title: 'Taranacak Disk İmajını Seçin',
    properties: ['openFile', 'dontAddToRecent'],
    filters: [
      { name: 'Disk İmajları', extensions: ['img', 'raw', 'dd', 'iso', 'bin', 'vhd'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] }
    ]
  };
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stat.size,
    sizeHuman: DiskDetector.formatSize(stat.size)
  };
});

ipcMain.handle('select-scan-folder', async () => {
  const win = getWindow();
  const options = {
    title: 'Bilgisayarınızda Taranacak Klasörü Seçin (Masaüstü, İndirilenler vb.)',
    properties: ['openDirectory', 'dontAddToRecent']
  };
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return null;
  const folderPath = result.filePaths[0];
  return {
    path: folderPath,
    name: path.basename(folderPath) || folderPath,
    sizeHuman: 'Klasör'
  };
});

ipcMain.handle('select-folder', async () => {
  const win = getWindow();
  const options = {
    title: 'Kurtarılan Dosyaların Kaydedileceği Klasörü Seçin',
    properties: ['openDirectory', 'createDirectory', 'dontAddToRecent']
  };
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('check-safety', async (_event, source, dest) => {
  return DiskDetector.checkSafeDestination(source, dest);
});

ipcMain.handle('start-scan', async (_event, options) => {
  if (activeEngine && activeEngine.isRunning) {
    throw new Error('Zaten aktif bir tarama yürütülüyor.');
  }

  activeEngine = new CarverEngine();

  activeEngine.on('progress', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-progress', data);
    }
  });

  activeEngine.on('file-found', (item) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file-found', item);
    }
  });

  activeEngine.on('completed', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-completed', data);
      mainWindow.webContents.send('scan-status-change', { status: 'completed' });
    }
  });

  activeEngine.on('error', (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-error', err.message);
      mainWindow.webContents.send('scan-status-change', { status: 'error' });
    }
  });

  activeEngine.on('paused', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-status-change', { status: 'paused' });
    }
  });

  activeEngine.on('resumed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-status-change', { status: 'running' });
    }
  });

  activeEngine.on('stopped', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-status-change', { status: 'stopped' });
    }
  });

  activeEngine.startScan(options).catch(err => {
    console.error('Tarama hatası:', err);
  });

  return { success: true };
});

ipcMain.handle('pause-scan', async () => {
  if (activeEngine) activeEngine.pauseScan();
  return { success: true };
});

ipcMain.handle('resume-scan', async () => {
  if (activeEngine) activeEngine.resumeScan();
  return { success: true };
});

ipcMain.handle('stop-scan', async () => {
  if (activeEngine) activeEngine.stopScan();
  return { success: true };
});

ipcMain.handle('get-hex-dump', async (_event, sourcePath, offset, length, filePath) => {
  return CarverEngine.generateHexDump(sourcePath, offset, length || 256, filePath);
});

ipcMain.handle('get-file-preview', async (_event, sourcePath, offset, size, mime, filePath) => {
  try {
    const previewSize = Math.min(size, 8 * 1024 * 1024);
    const chunk = CarverEngine.readChunk(sourcePath, offset, previewSize, filePath);

    if (mime.startsWith('image/')) {
      return {
        type: 'image',
        dataUri: `data:${mime};base64,${chunk.toString('base64')}`
      };
    } else if (mime === 'text/plain' || mime.includes('text')) {
      return {
        type: 'text',
        content: chunk.toString('utf8', 0, Math.min(chunk.length, 32768))
      };
    } else if (mime === 'application/pdf') {
      const pdfText = chunk.toString('binary', 0, Math.min(chunk.length, 16384));
      return {
        type: 'pdf',
        snippet: pdfText.replace(/[^\x20-\x7E\r\n]/g, '·')
      };
    }
    return { type: 'binary', size };
  } catch (err) {
    return { type: 'error', message: err.message };
  }
});

ipcMain.handle('recover-files', async (_event, sourcePath, files, destDir) => {
  return CarverEngine.recoverFiles(sourcePath, files, destDir);
});

ipcMain.handle('create-test-image', async () => {
  const result = SampleDiskGenerator.createTestDisk();
  return result;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFF0SkOn32iM4
// SIG // jxkjakfYPPYqnOcgoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFBgi
// SIG // ikj/fkJIXm+HB0TlDCMoC33RMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAEvLupxWLNuwojjIgQnW6ssrQ9/ttJCxZd8YcD+F
// SIG // wscyM9cqhmmcdeFBd8DrNvDQnIx6F3OwJCfd42Syk67+
// SIG // +UeIMv57XYGycdhEPKKiqAedLxwPeKTeaLXom6ZvJkbc
// SIG // zcvekGhjk275SKtl9yEpNQ/wgWeaxgGW+SieQ6VMxbPN
// SIG // DwRDcocsQvBJzS0x5WNToQzq9THlArhmMCcPoqj4rUzB
// SIG // GRb9cieiBxci4MEF4N5fV48xlvoXyjVSnSWVIzEi4fvF
// SIG // 3PzTMVh9406uE8nn566PcpUKz04LgSrptNpD8T7eLlYJ
// SIG // QLsrETycnBP8gEjIC0ID2fpRliC2LtbxBz+hCdY=
// SIG // End signature block
