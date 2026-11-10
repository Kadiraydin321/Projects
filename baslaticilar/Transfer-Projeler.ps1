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

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUSA1SXrl1iJhs42pDA+BM2lpz
# qrSgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUpnmEkLVTzBV9Jxx0zmIH7Zo7qj0wDQYJKoZIhvcN
# AQEBBQAEggEAGfVrBUbEwDmwEhcXDK11v1pOFOcjya9C+mcPcLSG1JifDvRONu/v
# 3Y4HkHy1yO9sb9kmOC0THl1KqyiO9CtNQjBt6ssrZq5ExB23x6lOcXrwhOKArbFS
# 81o56BL1SffwsyGjUrr+FhtM1njKxkrW41VKEGYaCrC7LOf8KWNk0YuRhs6rdiV0
# wVX/bCl70LkbuPsEe2sHdILl48r8jkX+xYn/g6mzjTXDoT292ywym2A1kBKG/7v/
# 2TSS4199FKp1HmJ6c7FZZgIKywA0NgdU+SMgJPtk4GR7oq7SX/WlObBowNp2RRoE
# 5EtDZFimiLRNiaDX+aDZIaKeOTQQXLZYzA==
# SIG # End signature block
