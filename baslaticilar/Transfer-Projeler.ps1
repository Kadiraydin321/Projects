# ==============================================================================
# WSL to Windows Projeler Safe Transfer Script
# Hazırlayan: storage-cache-manager (Antigravity Orchestration Subagent)
# Hedef: C:\Users\Birin\Birin\Projeler
# Kaynak: \\wsl.localhost\Ubuntu\home\birin\Projeler
# ==============================================================================

param (
    [ValidateSet("Optimized", "Full")]
    [string]$Mode = "Optimized",
    
    [int]$Threads = 32
)

$Source = "\\wsl.localhost\Ubuntu\home\birin\Projeler"
$Destination = "C:\Users\Birin\Birin\Projeler"
$LogFile = "C:\Users\Birin\Birin\Projeler\transfer_execution.log"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " WSL -> Windows Güvenli Veri Aktarımı Başlatılıyor" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Kaynak     : $Source"
Write-Host "Hedef      : $Destination"
Write-Host "Aktarım Modu: $Mode"
Write-Host "İş Parçacığı: $Threads threads"
Write-Host "Log Dosyası : $LogFile"
Write-Host "----------------------------------------------------------"

if (-not (Test-Path $Source)) {
    Write-Error "HATA: WSL kaynak dizini bulunamadı ($Source). WSL servisinin çalıştığından emin olun."
    exit 1
}

if (-not (Test-Path $Destination)) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

$RoboArgs = @(
    $Source,
    $Destination,
    "*.*",
    "/E",
    "/COPY:DAT",
    "/DCOPY:DAT",
    "/MT:$Threads",
    "/R:1",
    "/W:1",
    "/NP",
    "/XJ",
    "/TEE",
    "/LOG:$LogFile"
)

if ($Mode -eq "Optimized") {
    Write-Host "[BİLGİ] Optimize mod devrede: node_modules, .next, target, build, .gradle ve sanal ortamlar hariç tutuluyor." -ForegroundColor Yellow
    $ExcludeDirs = @(
        "node_modules",
        ".next",
        "target",
        "build",
        ".gradle",
        ".venv",
        "venv",
        "__pycache__"
    )
    $RoboArgs += "/XD"
    $RoboArgs += $ExcludeDirs
} else {
    Write-Host "[BİLGİ] Tam klonlama modu: Tüm dosyalar ve önbellekler aktarılıyor." -ForegroundColor Magenta
}

Write-Host "Robocopy çalıştırılıyor..." -ForegroundColor Cyan
& robocopy.exe @RoboArgs

$ExitCode = $LASTEXITCODE

Write-Host "----------------------------------------------------------"
# Robocopy exit code değerlendirmesi:
# 0 = Değişiklik yok
# 1 = Dosyalar başarıyla kopyalandı
# 2 = Ekstra dosyalar tespit edildi
# 3 = Başarıyla kopyalandı + ekstra dosyalar
# >= 8 = Hata oluştu
if ($ExitCode -le 3) {
    Write-Host "Aktarım başarıyla tamamlandı! (Robocopy Çıkış Kodu: $ExitCode)" -ForegroundColor Green
} else {
    Write-Host "Aktarım uyarı veya hatalarla tamamlandı (Kod: $ExitCode). Lütfen log dosyasını inceleyin: $LogFile" -ForegroundColor Yellow
}

Write-Host "Orijinal WSL verileri dokunulmadan muhafaza edildi." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
