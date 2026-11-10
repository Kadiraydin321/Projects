# Ghidra kurulum betiği – REA Deep (decompile) motoru
# Kullanım: .\install_ghidra.ps1 [-Force] [-IdaPath <dizin>]
param(
    [switch]$Force,
    [string]$IdaPath
)
function Write-Info($msg){ Write-Host "[+] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-ErrorMsg($msg){ Write-Host "[X] $msg" -ForegroundColor Red }

# ---------- Ghidra sürüm ve indirme ----------
$ghidraVersion = "12.1_PUBLIC"
$ghidraBaseUrl = "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_12.1_build"
$ghidraZip = "ghidra_${ghidraVersion}_20230808.zip"
$downloadUrl = "$ghidraBaseUrl/$ghidraZip"
$installRoot = "C:\\tools"
$installDir = Join-Path $installRoot "ghidra_${ghidraVersion}"

if (Test-Path $installDir) {
    if ($Force) {
        Write-Warn "Mevcut Ghidra klasörü siliniyor ($installDir)…"
        Remove-Item -Recurse -Force $installDir
    } else {
        Write-Info "Ghidra zaten kurulu: $installDir"
        goto SetEnv
    }
}

# ---------- İndir ve aç ----------
Write-Info "Ghidra $ghidraVersion indiriliyor…"
$zipPath = Join-Path $env:TEMP $ghidraZip
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
Write-Info "ZIP açılıyor ($zipPath)…"
Expand-Archive -Path $zipPath -DestinationPath $installRoot -Force
# Zip içinde klasör genellikle ghidra_12.1_PUBLIC şeklinde olur; kesin adımı bulalım
$extracted = Get-ChildItem $installRoot -Directory | Where-Object { $_.Name -like "ghidra_${ghidraVersion}*" } | Select-Object -First 1
if ($extracted) {
    Rename-Item -Path $extracted.FullName -NewName "ghidra_${ghidraVersion}"
    Write-Info "Ghidra klasörü yeniden adlandırıldı: $installDir"
}
Remove-Item $zipPath -Force

:SetEnv
# ---------- Ortam değişkeni ----------
$envVar = "GHIDRA_INSTALL_DIR"
$current = [Environment]::GetEnvironmentVariable($envVar, "User")
if ($current -ne $installDir) {
    Write-Info "Kullanıcı ortam değişkeni $envVar = $installDir (kalıcı)"
    [Environment]::SetEnvironmentVariable($envVar, $installDir, "User")
} else {
    Write-Info "$envVar zaten doğru ayarlanmış."
}

# ---------- Opsiyonel IDA ----------
if ($IdaPath) {
    if (Test-Path $IdaPath) {
        $idaEnv = "REA_IDA_MCP_CONFIG"
        Write-Info "IDA Pro yolu $IdaPath olarak ayarlanıyor ($idaEnv)…"
        [Environment]::SetEnvironmentVariable($idaEnv, $IdaPath, "User")
    } else {
        Write-Warn "Belirtilen IDA yolu bulunamadı: $IdaPath"
    }
}

# ---------- REA doctor kontrolü ----------
Write-Info "\nREA doctor çalıştırılıyor – motor tanımlamaları kontrol ediliyor…"
$npxCmd = "npx -y rea-agents doctor --client antigravity"
& powershell -NoProfile -Command $npxCmd

Write-Info "\nKurulum tamamlandı. Şimdi aşağıdaki komutla Deep analizini çalıştırabilirsiniz:"
Write-Host "    .\\run_rea.ps1 -Target \"C:\\Users\\Birin\\AppData\\Roaming\\itch\\apps\\demo 2\\Game.exe\" -Mode Deep" -ForegroundColor Green
# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUUX/FY5zVfz0CS+FgjF+WO1/s
# FPWgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUTYsc8XQwfSey9ZnmYpblFOabFqIwDQYJKoZIhvcN
# AQEBBQAEggEAEDVA2gnxEtOiw0GmGNVfBZgnqUgDoeQs7c0AMB0ie17Eb8aFP8m7
# 4b1/jAvzq86EPcCGd9xnX+/a2XjzZCOZpK1irwtB7fOmV/Ps/T4jLl2p/dJSksQf
# xb4fqlklTac33ZmPHx5Zrs/WvvTiu6I8yhR8R7LpDXfDT41r864AY9WPA2gCgC5O
# 9x5cmhcx0VdYVzgE0dFoh4h+PnlPiQBhizVUL+9dvNRSvvRqVN2mt7sc0ZnCGRTl
# rwXbWyBM+vo/7MaM6J7IqBiNn8rbFGTCQo+CKGFaWspcGUnX53cd2Thaw/Fdyctu
# 5XTIFZQcTS7wNIqVi0aGc26WUpFn9vSBdg==
# SIG # End signature block
