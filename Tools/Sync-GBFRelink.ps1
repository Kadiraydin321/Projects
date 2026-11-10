#Requires -Version 5.1
<#
.SYNOPSIS
    Granblue Fantasy Relink - Eksik Dosya Senkronizasyonu
.DESCRIPTION
    C:\Games\Granblue Fantasy - Relink (Kaynak) ile
    D:\Games\Granblue Fantasy Relink (Hedef) klasörlerini kıyaslar.
    Hedefte eksik olan dosyaları kaynaktan kopyalar.
.NOTES
    Yazar   : Antigravity
    Tarih   : 2026-11-08
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Source      = 'C:\Games\Granblue Fantasy - Relink',
    [string]$Destination = 'D:\Games\Granblue Fantasy Relink',
    [switch]$WhatIf,          # Sadece önizleme — hiçbir şey kopyalanmaz
    [switch]$Verify           # Kopyalama sonrası hash doğrulaması yap
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Renk yardımcıları ──────────────────────────────────────────────────────
function Write-Header  { param($t) Write-Host "`n═══ $t ═══" -ForegroundColor Cyan   }
function Write-OK      { param($t) Write-Host "  ✔  $t"     -ForegroundColor Green  }
function Write-Warn    { param($t) Write-Host "  ⚠  $t"     -ForegroundColor Yellow }
function Write-Fail    { param($t) Write-Host "  ✘  $t"     -ForegroundColor Red    }
function Write-Info    { param($t) Write-Host "  ·  $t"     -ForegroundColor Gray   }

# ─── Yol doğrulama ──────────────────────────────────────────────────────────
Write-Header "Yol Doğrulama"

if (-not (Test-Path $Source)) {
    Write-Fail "Kaynak klasör bulunamadı: $Source"
    exit 1
}
Write-OK "Kaynak     : $Source"

if (-not (Test-Path $Destination)) {
    Write-Warn "Hedef klasör mevcut değil, oluşturuluyor: $Destination"
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}
Write-OK "Hedef      : $Destination"

# ─── Dosya listeleri ────────────────────────────────────────────────────────
Write-Header "Dosya Tarama"
Write-Info "Kaynak taranıyor..."

$srcFiles = Get-ChildItem -Path $Source -Recurse -File |
    Select-Object FullName,
                  @{ N='RelPath'; E={ $_.FullName.Substring($Source.Length).TrimStart('\') } },
                  Length, LastWriteTimeUtc

Write-Info "Kaynak dosya sayısı  : $($srcFiles.Count)"

Write-Info "Hedef taranıyor..."

$dstFiles = Get-ChildItem -Path $Destination -Recurse -File |
    Select-Object FullName,
                  @{ N='RelPath'; E={ $_.FullName.Substring($Destination.Length).TrimStart('\') } },
                  Length, LastWriteTimeUtc

Write-Info "Hedef dosya sayısı   : $($dstFiles.Count)"

# ─── Karşılaştırma ──────────────────────────────────────────────────────────
Write-Header "Karşılaştırma"

$dstIndex = @{}
foreach ($f in $dstFiles) { $dstIndex[$f.RelPath] = $f }

$missing  = [System.Collections.Generic.List[object]]::new()
$existing = 0

foreach ($src in $srcFiles) {
    if ($dstIndex.ContainsKey($src.RelPath)) {
        $existing++
    } else {
        $missing.Add($src)
    }
}

Write-OK  "Zaten mevcut dosyalar : $existing"
Write-Warn "Eksik dosyalar        : $($missing.Count)"

if ($missing.Count -eq 0) {
    Write-Header "Sonuç"
    Write-OK "Hedef klasör eksiksiz! Hiçbir dosya kopyalanmadı."
    exit 0
}

# ─── Önizleme tablosu ───────────────────────────────────────────────────────
Write-Header "Eksik Dosyalar (İlk 50)"
$missing | Select-Object -First 50 |
    ForEach-Object { Write-Info $_.RelPath }

if ($missing.Count -gt 50) {
    Write-Info "... ve $($missing.Count - 50) dosya daha."
}

# ─── WhatIf modu ────────────────────────────────────────────────────────────
if ($WhatIf) {
    Write-Header "WhatIf Modu Aktif"
    Write-Warn "Gerçek kopyalama yapılmadı. -WhatIf bayrağını kaldırarak çalıştırın."
    exit 0
}

# ─── Kullanıcı onayı ────────────────────────────────────────────────────────
Write-Host ""
$confirm = Read-Host "  $($missing.Count) dosya kopyalanacak. Devam etmek istiyor musunuz? (E/H)"
if ($confirm -notmatch '^[Ee]') {
    Write-Warn "İşlem iptal edildi."
    exit 0
}

# ─── Kopyalama ──────────────────────────────────────────────────────────────
Write-Header "Kopyalama Başlıyor"

$totalBytes   = ($missing | Measure-Object Length -Sum).Sum
$copiedBytes  = 0
$copiedCount  = 0
$failedCount  = 0
$failedFiles  = [System.Collections.Generic.List[string]]::new()
$startTime    = Get-Date

foreach ($file in $missing) {
    $destPath = Join-Path $Destination $file.RelPath
    $destDir  = Split-Path $destPath -Parent

    try {
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        Copy-Item -Path $file.FullName -Destination $destPath -Force

        # Hash doğrulaması (isteğe bağlı)
        if ($Verify) {
            $srcHash = (Get-FileHash -Path $file.FullName  -Algorithm MD5).Hash
            $dstHash = (Get-FileHash -Path $destPath        -Algorithm MD5).Hash
            if ($srcHash -ne $dstHash) {
                throw "Hash uyuşmazlığı! Kaynak: $srcHash | Hedef: $dstHash"
            }
        }

        $copiedBytes += $file.Length
        $copiedCount++

        # İlerleme çubuğu
        $pct = if ($totalBytes -gt 0) { [int](($copiedBytes / $totalBytes) * 100) } else { 100 }
        Write-Progress -Activity "Kopyalanıyor" `
                       -Status   "$copiedCount / $($missing.Count)  ·  $file.RelPath" `
                       -PercentComplete $pct

    } catch {
        $failedCount++
        $failedFiles.Add($file.RelPath)
        Write-Fail "HATA  $($file.RelPath) → $_"
    }
}

Write-Progress -Activity "Kopyalanıyor" -Completed

# ─── Özet rapor ─────────────────────────────────────────────────────────────
$elapsed = (Get-Date) - $startTime
$mbCopied = [math]::Round($copiedBytes / 1MB, 2)

Write-Header "Özet Rapor"
Write-OK  "Başarıyla kopyalanan   : $copiedCount dosya  ($mbCopied MB)"
if ($failedCount -gt 0) {
    Write-Fail "Başarısız              : $failedCount dosya"
    Write-Host ""
    Write-Host "  Başarısız dosyalar:" -ForegroundColor Red
    $failedFiles | ForEach-Object { Write-Fail "    $_" }
}
Write-Info "Geçen süre             : $([math]::Round($elapsed.TotalSeconds, 1)) sn"

if ($Verify) {
    Write-OK  "Hash doğrulaması       : Aktif (MD5)"
}

Write-Host ""

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUTNe4ePwdaBTOb1fK/DYE2yuS
# 4MWgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUg3U6OFMBlZ+kFzVWqcR98xk2Ti0wDQYJKoZIhvcN
# AQEBBQAEggEAW6ppKMK1c9ZsrvP4gpPAKUad7iqUsaamMdGvOCwWNk1Gc5Y0Tfh1
# fuuPCCtwEo+h7yas3PlowFnUFwk1/bggDJ63en1DWbpPjQuB9ZohBKoopLa4gqnM
# JebBAxi3QWP1KAhjyIb00Ip9HSC8RDYKwlkkaWqRYvMK8wfWkDkbhrYPWu51MUQn
# n5nYQcqVb2Ydirewxeb06i5Igewbnz0/xXH3DokC/mn3L+EfAkHd9edawzQ7hiuD
# VTvWj38YKXtp+otejhLAVeQywA+lWDgYhAwOP3ER6K5Ch05sJxb3x4CrjbNH9TZ/
# XS6Lk3AC5QrHewQkxf01c04TCyMN87L6Vw==
# SIG # End signature block
