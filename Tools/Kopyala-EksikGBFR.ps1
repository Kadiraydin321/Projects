#Requires -Version 5.1
<#
.SYNOPSIS
    A (Kaynak) -> B (Hedef) Eksik Dosyaları Kopyalama ve Senkronizasyon Scripti
.DESCRIPTION
    Kaynak (A): C:\Games\Granblue Fantasy - Relink
    Hedef  (B): D:\Games\Granblue Fantasy Relink
    
    1. Hedef klasördeki (B) dosyaları tarar.
    2. Hedefte olmayan (eksik) dosyaları Kaynaktan (A) Hedefe (B) kopyalar.
    3. Asla KESME (Move/Cut) yapmaz, sadece KOPYALAR (Copy).
    4. Hedefte fazladan bulunan mod, yama veya reshade dosyalarına dokunmaz (silmez).
#>

[CmdletBinding()]
param(
    [string]$SourcePath = "C:\Games\Granblue Fantasy - Relink",
    [string]$DestinationPath = "D:\Games\Granblue Fantasy Relink",
    [switch]$WhatIfOnly,
    [switch]$IncludeNewer
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Granblue Fantasy Relink - Eksik Dosya Kopyalama Scripti " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Kaynak (A): $SourcePath" -ForegroundColor Gray
Write-Host "Hedef  (B): $DestinationPath" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path -LiteralPath $SourcePath)) {
    Write-Host "[HATA] Kaynak dizin (A) bulunamadi: $SourcePath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $DestinationPath)) {
    Write-Host "[BILGI] Hedef dizin (B) olusturuluyor: $DestinationPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
}

Write-Host "[1/3] Dosyalar taranip karsilastiriliyor..." -ForegroundColor Yellow

# Robocopy argümanları:
# /E : Alt dizinleri kopyala
# /XX: Hedefte ekstra olan dosyaları silme/dokunma (asla silme yapmaz)
# /MT:16: 16 iş parçacıklı kopyalama
# /R:2 /W:2: Hata durumunda 2 kez dene, 2 saniye bekle
$argsList = @(
    $SourcePath,
    $DestinationPath,
    "/E",
    "/XX",
    "/MT:16",
    "/R:2",
    "/W:2"
)

if (-not $IncludeNewer) {
    # Varsayılan mod: Hedefte zaten var olan dosyaları atlar (sadece tamamen eksik olanları kopyalar)
    $argsList += "/XN"  # Hedefteki daha yenileri atla
    $argsList += "/XO"  # Hedefteki daha eskileri atla (yani var olan her dosyayı atla)
    $argsList += "/XC"  # Aynı olanları atla
}

if ($WhatIfOnly) {
    Write-Host "[SIMULASYON] WhatIf aktif: Gercek kopyalama yapilmayacak, sadece liste alinacak.`n" -ForegroundColor Magenta
    $argsList += "/L"
} else {
    Write-Host "[2/3] Kopyalama baslatiliyor (A -> B)..." -ForegroundColor Green
}

# Calistir
& robocopy.exe @argsList

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
if ($exitCode -lt 8) {
    Write-Host "[BASARILI] Islem tamamlandi! (Robocopy Kodu: $exitCode)" -ForegroundColor Green
    if ($exitCode -eq 0) {
        Write-Host "Bilgi: Hedefte eksik dosya bulunmuyor, her sey guncel." -ForegroundColor Gray
    } elseif ($exitCode -band 1) {
        Write-Host "Bilgi: Eksik dosyalar basariyla kopyalandi." -ForegroundColor Green
    }
} else {
    Write-Host "[HATA] Kopyalama sirasinda bazi hatalar olustu (Kod: $exitCode)." -ForegroundColor Red
}
Write-Host "==========================================================" -ForegroundColor Cyan

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUXHPsN93eq+jnpxIyn4bQGtJw
# FTSgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUnGNc4P8vdot4K0/VaxVjIeAedCswDQYJKoZIhvcN
# AQEBBQAEggEAlpyT6/uFnTmZW1vLVkTqN5uvih9VFtKHnGzoVrNcgF99kiJUgt0+
# nF634n1EsuICIeR5kbccmhN8DpTZ/pYz6p7/mKsD9Bvj6kb6I6ulLAbRBfVfdqJC
# L3+QeuMqrD0K0/hkUh4zPYgb0vwEczBvlAYiAhNQ9yL93x65QmxpBwpM5QZZZw0E
# g880+rBxhDcoKiOPMZd/p/5OnlfCoVl1uwjsrLtdUbN4V4gGYKS/jKmn9O5FSL60
# btCgVlVnzvXnOOzwV2gyfOIzBEWwIDyB+j26yQ0iSGP3f7oy7ANaUYhm7AztbBmQ
# 0rUXHh5Iv5VQcy7nu4iEBdsJl87FaHrEcg==
# SIG # End signature block
