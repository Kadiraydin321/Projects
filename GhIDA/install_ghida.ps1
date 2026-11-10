<#
.SYNOPSIS
    GhIDA Decompiler for IDA Pro - Entegrasyon ve Başlatıcı Betiği

.DESCRIPTION
    Bu betik GhIDA eklentisini (ghida.py ve ghida_plugin) IDA Pro'nun 'plugins'
    dizinine otomatik olarak kopyalar, Ghidra yolunu yapılandırır ve $env:TEMP\ghida_config.json
    dosyasını oluşturur. Ayrıca -Uninstall parametresi ile eklentiyi temiz bir şekilde kaldırabilir.

.PARAMETER IdaPath
    IDA Pro ana kurulum dizini veya 'plugins' klasörünün tam yolu. Belirtilmezse otomatik taranır veya sorulur.

.PARAMETER GhidraPath
    Ghidra ana kurulum dizini ('support\analyzeHeadless.bat' içeren kök dizin).

.PARAMETER UserPluginDir
    Sistem genelindeki IDA dizini yerine kullanıcının '%APPDATA%\Hex-Rays\IDA Pro\plugins' dizinini hedefler.

.PARAMETER Uninstall
    Kurulmuş GhIDA eklentisini ve geçici yapılandırmasını sistemden kaldırır.

.PARAMETER NonInteractive
    Kullanıcıdan etkileşimli girdi beklemeden çalışır (otomasyon ve testler için).

.EXAMPLE
    .\install_ghida.ps1
    Etkileşimli kurulum sihirbazını başlatır ve otomatik algılama yapar.

.EXAMPLE
    .\install_ghida.ps1 -IdaPath "C:\Program Files\IDA Pro 8.3" -GhidraPath "C:\tools\ghidra_10.4_PUBLIC"
    Belirtilen yollar ile otomatik ve sessiz kurulum yapar.

.EXAMPLE
    .\install_ghida.ps1 -Uninstall -IdaPath "C:\Program Files\IDA Pro 8.3"
    Kurulan GhIDA dosyalarını kaldırır.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Position = 0)]
    [string]$IdaPath,

    [Parameter(Position = 1)]
    [string]$GhidraPath,

    [switch]$UserPluginDir,
    [switch]$Uninstall,
    [switch]$NonInteractive
)

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

# --- Konsol Renk ve Çıktı Fonksiyonları ---
function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor White
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [+] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [*] $Message" -ForegroundColor Cyan
}

function Write-WarnMsg {
    param([string]$Message)
    Write-Host "  [!] $Message" -ForegroundColor Yellow
}

function Write-ErrMsg {
    param([string]$Message)
    Write-Host "  [-] $Message" -ForegroundColor Red
}

# --- IDA Otomatik Algılama Fonksiyonu ---
function Find-IdaPath {
    Write-Info "IDA Pro kurulumu otomatik taranıyor..."

    # 1. Ortam Değişkenleri
    $envVars = @("IDADIR", "IDA_PATH", "IDA_DIR", "IDA")
    foreach ($var in $envVars) {
        $val = [System.Environment]::GetEnvironmentVariable($var)
        if (![string]::IsNullOrWhiteSpace($val) -and (Test-Path $val)) {
            Write-Success "Ortam değişkeninden bulundu ($var): $val"
            return $val
        }
    }

    # 2. Kullanıcı AppData Plugin Dizini
    $appDataIda = Join-Path $env:APPDATA "Hex-Rays\IDA Pro"
    if (Test-Path $appDataIda) {
        Write-Success "IDA AppData dizini bulundu: $appDataIda"
        return $appDataIda
    }

    # 3. Registry Taraması (HKLM & HKCU)
    $regPaths = @(
        "HKCU:\Software\Hex-Rays\IDA Pro",
        "HKLM:\Software\Hex-Rays\IDA Pro",
        "HKLM:\Software\WOW6432Node\Hex-Rays\IDA Pro"
    )
    foreach ($rp in $regPaths) {
        if (Test-Path $rp) {
            $regItem = Get-ItemProperty -Path $rp -ErrorAction SilentlyContinue
            if ($regItem -and $regItem.Directory -and (Test-Path $regItem.Directory)) {
                Write-Success "Registry üzerinden bulundu: $($regItem.Directory)"
                return $regItem.Directory
            }
        }
    }

    # 4. Uninstall Registry Anahtarları
    $uninstallKeys = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    $idaUninst = Get-ItemProperty -Path $uninstallKeys -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -match "IDA\s*Pro" -and $_.InstallLocation -and (Test-Path $_.InstallLocation) } |
        Select-Object -First 1
    if ($idaUninst) {
        Write-Success "Sistem kurulum listesinden bulundu: $($idaUninst.InstallLocation)"
        return $idaUninst.InstallLocation
    }

    # 5. Yaygın Dosya Yolları
    $candidatePatterns = @(
        "C:\Program Files\IDA Pro*",
        "C:\Program Files (x86)\IDA Pro*",
        "C:\Program Files\IDA*",
        "C:\Program Files (x86)\IDA*",
        "C:\IDA*",
        "C:\IDAPro*",
        "C:\tools\IDA*",
        "$env:LOCALAPPDATA\Programs\IDA*"
    )
    foreach ($pat in $candidatePatterns) {
        $found = Get-ChildItem -Path $pat -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            Select-Object -First 1
        if ($found -and (Test-Path $found.FullName)) {
            Write-Success "Varsayılan dizin taranarak bulundu: $($found.FullName)"
            return $found.FullName
        }
    }

    Write-WarnMsg "IDA Pro dizini otomatik olarak tespit edilemedi."
    return $null
}

# --- Ghidra Otomatik Algılama Fonksiyonu ---
function Find-GhidraPath {
    Write-Info "Ghidra kurulumu otomatik taranıyor..."

    # 1. Ortam Değişkenleri
    $envVars = @("GHIDRA_HOME", "GHIDRA_INSTALL_DIR", "GHIDRA_DIR")
    foreach ($var in $envVars) {
        $val = [System.Environment]::GetEnvironmentVariable($var)
        if (![string]::IsNullOrWhiteSpace($val) -and (Test-Path $val)) {
            $normalized = Normalize-GhidraRoot $val
            if ($normalized) {
                Write-Success "Ortam değişkeninden bulundu ($var): $normalized"
                return $normalized
            }
        }
    }

    # 2. Yaygın Dizinler
    $candidatePatterns = @(
        "C:\ghidra*",
        "C:\tools\ghidra*",
        "$env:USERPROFILE\ghidra*",
        "$env:USERPROFILE\Desktop\ghidra*",
        "$env:USERPROFILE\Downloads\ghidra*",
        "C:\Program Files\ghidra*"
    )
    foreach ($pat in $candidatePatterns) {
        $candidates = Get-ChildItem -Path $pat -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending
        foreach ($cand in $candidates) {
            $normalized = Normalize-GhidraRoot $cand.FullName
            if ($normalized) {
                Write-Success "Yaygın dizin taranarak bulundu: $normalized"
                return $normalized
            }
        }
    }

    Write-WarnMsg "Ghidra dizini otomatik olarak tespit edilemedi (İsteğe bağlı)."
    return $null
}

# --- Ghidra Kök Dizin Doğrulama ve Normalleştirme ---
function Normalize-GhidraRoot {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    
    $cleanPath = $Path.Trim('"').Trim("'")
    if (!(Test-Path $cleanPath)) { return $null }

    # Eğer doğrudan analyzeHeadless.bat verilmişse
    if ($cleanPath -match "analyzeHeadless(\.bat)?$") {
        $parent = Split-Path -Parent $cleanPath
        if ((Split-Path -Leaf $parent) -eq "support") {
            return (Split-Path -Parent $parent)
        }
        return $parent
    }

    # Eğer support klasörü verilmişse
    if ((Split-Path -Leaf $cleanPath) -eq "support") {
        $parent = Split-Path -Parent $cleanPath
        if (Test-Path (Join-Path $cleanPath "analyzeHeadless.bat")) {
            return $parent
        }
    }

    # Eğer Ghidra kök dizini ise (support\analyzeHeadless.bat içermeli)
    $headlessBat = Join-Path $cleanPath "support\analyzeHeadless.bat"
    if (Test-Path $headlessBat) {
        return $cleanPath
    }

    # Bazı sürümlerde doğrudan kökte bulunabilir
    $rootBat = Join-Path $cleanPath "analyzeHeadless.bat"
    if (Test-Path $rootBat) {
        return $cleanPath
    }

    return $null
}

# --- Ana Akış ---
Write-Header "GhIDA Decompiler - IDA Pro Entegrasyon Yöneticisi"

$SourceDir = $PSScriptRoot
$SourceGhidaPy = Join-Path $SourceDir "ghida.py"
$SourceGhidaPlugin = Join-Path $SourceDir "ghida_plugin"
$ConfigFile = Join-Path $env:TEMP "ghida_config.json"

# Kaynak dosyaların varlığını denetle
if (!(Test-Path $SourceGhidaPy) -or !(Test-Path $SourceGhidaPlugin)) {
    Write-ErrMsg "Kaynak GhIDA dosyaları bulunamadı!"
    Write-ErrMsg "Eksik kaynak: $SourceGhidaPy veya $SourceGhidaPlugin"
    exit 1
}

# 1. IDA Yolunun Çözümlenmesi
$ResolvedIdaPath = $null
if ($UserPluginDir) {
    $ResolvedIdaPath = Join-Path $env:APPDATA "Hex-Rays\IDA Pro\plugins"
    Write-Info "Kullanıcı özel plugin dizini seçildi: $ResolvedIdaPath"
} elseif (![string]::IsNullOrWhiteSpace($IdaPath)) {
    $ResolvedIdaPath = $IdaPath.Trim('"').Trim("'")
} else {
    $ResolvedIdaPath = Find-IdaPath
}

# Eğer hala bulunamadıysa ve etkileşimli moddaysa kullanıcıya sor
if ([string]::IsNullOrWhiteSpace($ResolvedIdaPath) -and !$NonInteractive) {
    Write-Host ""
    Write-Host "Lütfen IDA Pro kurulum dizinini veya 'plugins' klasörünün yolunu girin:" -ForegroundColor Yellow
    Write-Host "(Örnek: C:\Program Files\IDA Pro 8.3 veya %APPDATA%\Hex-Rays\IDA Pro)" -ForegroundColor Gray
    $userInput = Read-Host "IDA Yolu"
    if (![string]::IsNullOrWhiteSpace($userInput)) {
        $ResolvedIdaPath = $userInput.Trim('"').Trim("'")
    }
}

if ([string]::IsNullOrWhiteSpace($ResolvedIdaPath)) {
    Write-ErrMsg "IDA Pro kurulum yolu belirlenemedi! Kurulum iptal edildi."
    Write-ErrMsg "Kullanım: .\install_ghida.ps1 -IdaPath <Dizin>"
    exit 1
}

# Hedef 'plugins' klasörünü belirle
$TargetPluginDir = $null
if ((Split-Path -Leaf $ResolvedIdaPath) -ieq "plugins") {
    $TargetPluginDir = $ResolvedIdaPath
} else {
    $TargetPluginDir = Join-Path $ResolvedIdaPath "plugins"
}

# --- KALDIRMA (UNINSTALL) İŞLEMİ ---
if ($Uninstall) {
    Write-Header "GhIDA Eklentisi Kaldırılıyor..."
    Write-Info "Hedef Plugins Klasörü: $TargetPluginDir"

    $installedPy = Join-Path $TargetPluginDir "ghida.py"
    $installedFolder = Join-Path $TargetPluginDir "ghida_plugin"

    $removedCount = 0

    if (Test-Path $installedPy) {
        if ($PSCmdlet.ShouldProcess($installedPy, "Dosyayı sil")) {
            Remove-Item -Path $installedPy -Force -ErrorAction SilentlyContinue
            Write-Success "Kaldırıldı: $installedPy"
            $removedCount++
        }
    }

    if (Test-Path $installedFolder) {
        if ($PSCmdlet.ShouldProcess($installedFolder, "Klasörü sil")) {
            Remove-Item -Path $installedFolder -Recurse -Force -ErrorAction SilentlyContinue
            Write-Success "Kaldırıldı: $installedFolder"
            $removedCount++
        }
    }

    if (Test-Path $ConfigFile) {
        if ($PSCmdlet.ShouldProcess($ConfigFile, "Yapılandırma dosyasını sil")) {
            Remove-Item -Path $ConfigFile -Force -ErrorAction SilentlyContinue
            Write-Success "Kaldırıldı: $ConfigFile"
            $removedCount++
        }
    }

    if ($removedCount -gt 0) {
        Write-Host ""
        Write-Success "GhIDA eklentisi ve yapılandırması başarıyla kaldırıldı."
    } else {
        Write-WarnMsg "Kaldırılacak herhangi bir GhIDA bileşeni bulunamadı."
    }
    exit 0
}

# --- KURULUM (INSTALL) İŞLEMİ ---
Write-Header "GhIDA Eklentisi Kuruluyor..."
Write-Info "Kaynak Klasör        : $SourceDir"
Write-Info "Hedef Plugins Klasörü: $TargetPluginDir"

# Hedef plugins dizini yoksa oluştur
if (!(Test-Path $TargetPluginDir)) {
    if ($PSCmdlet.ShouldProcess($TargetPluginDir, "Plugins dizinini oluştur")) {
        New-Item -ItemType Directory -Path $TargetPluginDir -Force | Out-Null
        Write-Success "Plugins dizini oluşturuldu: $TargetPluginDir"
    }
}

# Dosyaları Kopyala
$DestGhidaPy = Join-Path $TargetPluginDir "ghida.py"
$DestGhidaFolder = Join-Path $TargetPluginDir "ghida_plugin"

if ($PSCmdlet.ShouldProcess($DestGhidaPy, "ghida.py dosyasını kopyala")) {
    Copy-Item -Path $SourceGhidaPy -Destination $DestGhidaPy -Force
    Write-Success "Kopyalandı: ghida.py -> $DestGhidaPy"
}

if ($PSCmdlet.ShouldProcess($DestGhidaFolder, "ghida_plugin klasörünü kopyala")) {
    # Eğer hedef klasör zaten varsa temiz kopyalama için içeriği yenile
    if (Test-Path $DestGhidaFolder) {
        Remove-Item -Path $DestGhidaFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
    Copy-Item -Path $SourceGhidaPlugin -Destination $TargetPluginDir -Recurse -Force
    Write-Success "Kopyalandı: ghida_plugin/ -> $DestGhidaFolder"
}

# 2. Ghidra Yolunun Çözümlenmesi ve Yapılandırma
$ResolvedGhidraPath = $null
if (![string]::IsNullOrWhiteSpace($GhidraPath)) {
    $ResolvedGhidraPath = Normalize-GhidraRoot $GhidraPath
    if (!$ResolvedGhidraPath) {
        Write-WarnMsg "Belirtilen Ghidra yolunda 'support\analyzeHeadless.bat' bulunamadı: $GhidraPath"
        $ResolvedGhidraPath = $GhidraPath.Trim('"').Trim("'")
    }
} else {
    $ResolvedGhidraPath = Find-GhidraPath
}

# Ghidra yolu bulunamadıysa kullanıcıya sor (opsiyonel)
if ([string]::IsNullOrWhiteSpace($ResolvedGhidraPath) -and !$NonInteractive) {
    Write-Host ""
    Write-Host "Ghidra ana dizinini girmek ister misiniz? (İsteğe bağlı, boş bırakıp Enter'a basabilirsiniz):" -ForegroundColor Yellow
    Write-Host "(Örnek: C:\tools\ghidra_10.4_PUBLIC veya support\analyzeHeadless.bat içeren kök dizin)" -ForegroundColor Gray
    $userGhidra = Read-Host "Ghidra Yolu"
    if (![string]::IsNullOrWhiteSpace($userGhidra)) {
        $normalized = Normalize-GhidraRoot $userGhidra
        $ResolvedGhidraPath = if ($normalized) { $normalized } else { $userGhidra.Trim('"').Trim("'") }
    }
}

# Yapılandırma Dosyasını Oluştur ($env:TEMP\ghida_config.json)
if (![string]::IsNullOrWhiteSpace($ResolvedGhidraPath)) {
    Write-Info "Ghidra yapılandırma dosyası hazırlanıyor..."
    $configObject = [ordered]@{
        SHOW_SETTINGS            = $false
        USE_GHIDRA_SERVER        = $false
        GHIDRA_INSTALLATION_PATH = $ResolvedGhidraPath
        load_save_cached_code    = $true
        load_save_cached_comments= $true
    }
    $configJson = $configObject | ConvertTo-Json -Depth 4
    if ($PSCmdlet.ShouldProcess($ConfigFile, "Yapılandırma dosyasını yaz")) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($ConfigFile, $configJson, $utf8NoBom)
        Write-Success "Yapılandırma kaydedildi: $ConfigFile"
        Write-Info "Yapılandırılan Ghidra Kök Yolu: $ResolvedGhidraPath"
    }
} else {
    Write-Info "Ghidra yolu verilmedi. IDA Pro içinde eklenti ilk çalıştırıldığında yapılandırma penceresi açılacaktır."
}

# 3. Python Teşhis Aracını Çalıştır
$checkScript = Join-Path $SourceDir "check_ghida_env.py"
if (Test-Path $checkScript) {
    $pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
    if ($pythonExe) {
        Write-Header "Ortam ve Entegrasyon Denetimi (Python)"
        try {
            $checkArgs = @($checkScript, "--ida-path", $TargetPluginDir)
            if (![string]::IsNullOrWhiteSpace($ResolvedGhidraPath)) {
                $checkArgs += @("--ghidra-path", $ResolvedGhidraPath)
            }
            & $pythonExe $checkArgs
        } catch {
            Write-WarnMsg "Python teşhis betiği çalıştırılırken bir hata oluştu: $_"
        }
    }
}

# 4. Tebrik ve Kullanım Kılavuzu
Write-Header "GhIDA Kurulumu Başarıyla Tamamlandı!"

Write-Host "GhIDA Decompiler Kullanım Talimatı:" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
Write-Host " 1. IDA Pro'yu başlatın ve bir ikili dosya açın." -ForegroundColor White
Write-Host " 2. Tersine mühendislik yapmak istediğiniz fonksiyonun üzerine gelin." -ForegroundColor White
Write-Host " 3. Dekomple etmek için aşağıdaki yöntemlerden birini kullanın:" -ForegroundColor White
Write-Host "      * Kısayol Tuşu : " -NoNewline -ForegroundColor White
Write-Host "Ctrl+Alt+D" -ForegroundColor Yellow
Write-Host "      * Menü Çubuğu  : " -NoNewline -ForegroundColor White
Write-Host "Edit > Plugins > GhIDA Decompiler" -ForegroundColor Cyan
Write-Host "      * Sağ Tık Menü : " -NoNewline -ForegroundColor White
Write-Host "Decompile function with GhIDA" -ForegroundColor Cyan
Write-Host "      * Yan Pencere  : " -NoNewline -ForegroundColor White
Write-Host "View > Open subviews > GhIDA" -ForegroundColor Cyan
Write-Host "      * Ayarlar Menü : " -NoNewline -ForegroundColor White
Write-Host "Edit > Settings > GhIDA Settings" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Gereksinim Hatırlatması:" -ForegroundColor Yellow
Write-Host " - Python kütüphaneleri: pip install requests pygments" -ForegroundColor Gray
Write-Host " - Ghidra Java Gereksinimi: Java 11+ veya Java 17+ (OpenJDK/Oracle)" -ForegroundColor Gray
Write-Host ""
Write-Success "Entegrasyon tamamlandı. İyi çalışmalar!"

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUugDRHpRjEIylX3dLNClcHHfd
# h9ugggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
# AQsFADAiMSAwHgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0czAeFw0yNjEx
# MDgwOTQ0MTVaFw0zNjExMDgwOTU0MTVaMCIxIDAeBgNVBAMMF0FudGlncmF2aXR5
# LUFHWS1TY3JpcHRzMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtVh/
# WgVn5t4LzbcZTD/KIVSyXZmEN/rdLDtBKxAhFWIxbZHDotOIjHrIwjfxr1ZlnxqF
# cFjNo79MaLQJUWfO3aTu7BsH/Tf+mvUQEasoREkVwdwnp6vXHfxbyMxkOXE0y22g
# 0q/9LzFFXBtULl+C9/rcH+0yPqd9e6fKwBGi0I17wxh3yWt1l+HHKF8OsBgPiFqz
# q0olMV+pm3FYZ839MGdAUYHOjOFkGxtAkdklkTAitBfiIVI1TjMacbnsVuog9qnz
# c4S6hdT0VHZ2JdavsPWeNU3EPozdHAkgHlAy2UEqKYoCrAtvSKLmNPv642BG/wfj
# Fv5gpT73qkI0Tnh2oQIDAQABo0YwRDAOBgNVHQ8BAf8EBAMCB4AwEwYDVR0lBAww
# CgYIKwYBBQUHAwMwHQYDVR0OBBYEFNIUGs1F3Iw4YQz1VDmVLaYK9LNmMA0GCSqG
# SIb3DQEBCwUAA4IBAQAkXds1Yov00lVr92fV0fKUjv2jWhQ5rA//gzu9VTyIlksi
# l9YLwxvffl0mvrOkAzAqwBs3me+gV5C0YWOQzMo+hSVYXSZVt4osBOKWTv/8FX0l
# 5eF4PdXrG7Srke5LQID+7bInD5NPye4StknYks7g7w6CF0i/ZePoVRLQLjt5tBFN
# SC3he2Cv6ejdA9VKng1cbGiPQpsNfWDG+uZDc27JYn6fDUhHqmKbNm8pchXCCYHC
# jS51cH+dr/82Gk7TtdfYnVP0Y059S5zau24WhwEaiDiPV3P6Th7adoegYnnj84XM
# ArbQLfymGJwYfQQqeZ9mgQqeUYGg9LAGdjNsk+O7MYIB1zCCAdMCAQEwNjAiMSAw
# HgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0cwIQI76FdVX6bLBILiWSYrJG
# YjAJBgUrDgMCGgUAoHgwGAYKKwYBBAGCNwIBDDEKMAigAoAAoQKAADAZBgkqhkiG
# 9w0BCQMxDAYKKwYBBAGCNwIBBDAcBgorBgEEAYI3AgELMQ4wDAYKKwYBBAGCNwIB
# FTAjBgkqhkiG9w0BCQQxFgQUBEJ9YgY1L/cQH1YYIngXAEtWLOswDQYJKoZIhvcN
# AQEBBQAEggEAbIhyoJqveYDHYA4w3G/zWoC/pIzrVwMwx7NEXN/bgeQ3V2SUr0Om
# rRY1ahYeTseynIm2FSbpIMBObL4tgFaiNxxYzLzHbWjeLqi9p3baBBd/yS3I+Yay
# NZCGwRSehJ4XUNwnpdY1cFm7H95K9ChHgdfvJQoG4hMW5kBv1vAUo/dtNddkdnrc
# 6KPMjyeVn+4bx9+dzgJyiLlV5aatYaQj6br70Djnj1ZZXLoz0+0z3moLb3Hvvan9
# ie3OKqVal9PGiAVGAL7uB5KS3YFkT4toQB6s2C1KQdrz6CkyjnbFhvYwvNTq3WT2
# JQIypxMxc3xT+L5Un7Q9/ZUEI8FSXvPMeA==
# SIG # End signature block
