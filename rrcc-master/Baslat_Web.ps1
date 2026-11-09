$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    ROBOROCK Q8 MAX PRO - MODERN WEB KONTROL MERKEZI     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Hedef Robot: 192.168.1.44:54321 (Roborock Q8 Max Pro)" -ForegroundColor Gray
Write-Host "Web Hub Adresi: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Ağdaki Diğer Cihazlardan: http://192.168.1.6:8000" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

$projectRoot = $PSScriptRoot
Set-Location $projectRoot

# Arka planda çalışan eski uvicorn örneği varsa sonlandır
Get-Process python -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -like "*web_hub.main:app*" 
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "[1/3] Web Hub API ve Canlı Telemetri Servisi Başlatılıyor..." -ForegroundColor Green
$serverJob = Start-Process -FilePath "python" -ArgumentList "-m uvicorn web_hub.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $projectRoot -PassThru -WindowStyle Hidden

Write-Host "[2/3] Servisin ayağa kalkması bekleniyor (2 saniye)..." -ForegroundColor Gray
Start-Sleep -Seconds 2

Write-Host "[3/3] Varsayılan Web Tarayıcısı Açılıyor..." -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host "`n[✓] Web Kontrol Merkezi Başarıyla Yayında!" -ForegroundColor Green
Write-Host "    Durdurmak için bu pencereyi kapatabilir veya Uvicorn sürecini sonlandırabilirsiniz." -ForegroundColor Gray
Write-Host "    PID: $($serverJob.Id)" -ForegroundColor DarkGray

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUi7OqE4F937wvKKqTHydpuv5X
# 2tqgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUsDRCdxqfjFu/rFHAMg1shAPBraYwDQYJKoZIhvcN
# AQEBBQAEggEASzjYuFBIW2z6Fu/4VS2iB1Kn9FojqKw0svc8Ace3nMiVsjZYOXqF
# qxjIHK9pAb3LijQVc8x/fmxVs8xKJ/vgrcyV86pcXaSX4hW7sgnAK/jhPxSsXduJ
# pmh+4ZIUBe85iYw/OK/fNYmZ2R/bYVWK6/O0RFVCVeAYLVn5UR69zPLT13KkoPuY
# zx2axBTFearaLYnsgevL00TslAFd7mFA33tO2Ir9f2ZRhL8+qr/cYajiL02ij/em
# eWOK7repCf240tCpPmdJsiuPvLUEnOQLDqAvA4mv8vGdabFMB+SPiUD5EQCrYfXe
# zin2qw2rPIrmzleqoC9QQPNRAR9E/paUbg==
# SIG # End signature block
