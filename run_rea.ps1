<#
.SYNOPSIS
    REA (Reverse Engineer Anything) CLI Yardimci Baslaticisi

.DESCRIPTION
    Bu PowerShell betigi, REA (Reverse Engineer Anything) tersine muhendislik aracini
    dosyalar (.exe, .dll, .asar, .apk, .wasm, .js) veya klasorler uzerinde kolayca,
    renkli konsol ciktilari ve otomatik rapor kaydi ile calistirmayi saglar.

.PARAMETER Target
    Analiz edilecek hedef dosya veya klasorun tam yolu. (Verilmezse interaktif sorulur / surukle-birak desteklenir).

.PARAMETER Mode
    Analiz modu:
    - Overview: Genel uygulama/ikili dosya analizi ve ozet dokumu (Varsayilan).
    - Deep: Derin dekompilasyon ve pseudocode fonksiyonlarini cikarma.
    - Electron: JavaScript / Electron / ASAR kaynak ve semantik analizi.
    - Strings: Ikili dosya veya uygulama icindeki karakter dizilerini arama.
    - Doctor: REA ortami, analiz motorlari ve istemci kayitlarinin saglik kontrolu.

.PARAMETER OutDir
    Analiz raporlarinin ve ciktilarinin kaydedilecegi dizin (Varsayilan: './rea-output').

.PARAMETER Pattern
    'Strings' modunda aranacak metin veya regex deseni (Varsayilan: '.*').

.PARAMETER Format
    Cikti formati: md, json, yaml, toon, jsonl (Varsayilan: 'md').

.PARAMETER NoSave
    Analiz raporunun diske kaydedilmesini engeller, sadece ekrana basar.

.EXAMPLE
    .\run_rea.ps1 -Target "C:\path\to\app.exe" -Mode Overview
    .\run_rea.ps1 -Target "C:\path\to\resources\app.asar" -Mode Electron
    .\run_rea.ps1 -Target "C:\path\to\target.dll" -Mode Strings -Pattern "https?://"
    .\run_rea.ps1 -Mode Doctor
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0, Mandatory = $false, HelpMessage = "Analiz edilecek dosya veya klasor yolu")]
    [string]$Target,

    [Parameter(Position = 1)]
    [ValidateSet("Overview", "Deep", "Electron", "Strings", "Doctor")]
    [string]$Mode = "Overview",

    [Parameter(Position = 2)]
    [string]$OutDir = "./rea-output",

    [Parameter()]
    [string]$Pattern = ".*",

    [Parameter()]
    [ValidateSet("md", "json", "yaml", "toon", "jsonl")]
    [string]$Format = "md",

    [Parameter()]
    [switch]$NoSave
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# -------------------------------------------------------------
# 1. Baslik ve Karsilama Ekrani
# -------------------------------------------------------------
function Show-Banner {
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "       [REA] Reverse Engineer Anything - Gelismis Analiz Baslaticisi           " -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "  Tersine Muhendislik * Decompiler * JS/Electron/ASAR * PE/ELF * Strings       " -ForegroundColor DarkGray
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
}

Show-Banner

# -------------------------------------------------------------
# 2. Interaktif Girdi ve Hedef Kontrolu (Surukle-Birak Destegi)
# -------------------------------------------------------------
if (-not $Target -and $Mode -ne "Doctor") {
    Write-Host ""
    Write-Host " [?] Analiz edilecek dosya (.exe, .dll, .asar, .apk, .js) veya klasoru surukleyin:" -ForegroundColor White
    $rawInput = Read-Host "     Hedef Yol (Target)"
    
    if ([string]::IsNullOrWhiteSpace($rawInput)) {
        Write-Host ""
        Write-Host " [!] Hedef yol girilmedi. REA Sistem Saglik Teshisi (Doctor modu) calistirilsin mi? (E/H)" -ForegroundColor Yellow
        $docChoice = Read-Host "     Seciminiz"
        if ($docChoice -match "^[eEyY]") {
            $Mode = "Doctor"
        } else {
            Write-Host " [X] Hedef yol belirtilmedi. Islem iptal edildi." -ForegroundColor Red
            exit 1
        }
    } else {
        # Surukle-birak tirnaklarini temizle
        $Target = $rawInput.Trim().Trim('"').Trim("'")

        # Mod belirtilmemisse interaktif menu goster
        if (-not $PSBoundParameters.ContainsKey('Mode')) {
            Write-Host ""
            Write-Host " [*] Analiz Modunu Secin:" -ForegroundColor Cyan
            Write-Host "     [1] Overview   - Genel Uygulama/Ikili Dosya Incelemesi (Varsayilan)" -ForegroundColor White
            Write-Host "     [2] Deep       - Derin Dekompilasyon & Kod Cikarma" -ForegroundColor White
            Write-Host "     [3] Electron   - JS / Electron / ASAR Uygulamasi Analizi" -ForegroundColor White
            Write-Host "     [4] Strings    - Karakter Dizilerini Arama (Strings Search)" -ForegroundColor White
            Write-Host "     [5] Doctor     - REA Motor ve Ortam Saglik Denetimi" -ForegroundColor White
            $mChoice = Read-Host "     Secim (1-5, Varsayilan: 1)"
            switch ($mChoice.Trim()) {
                "2" { $Mode = "Deep" }
                "3" { $Mode = "Electron" }
                "4" { $Mode = "Strings" }
                "5" { $Mode = "Doctor" }
                default { $Mode = "Overview" }
            }
        }
    }
}

# Strings modu icin aranacak desen sorgusu
if ($Mode -eq "Strings" -and (-not $PSBoundParameters.ContainsKey('Pattern'))) {
    Write-Host ""
    $pInput = Read-Host " [*] Aranacak metin veya regex deseni (Varsayilan: '.*')"
    if (-not [string]::IsNullOrWhiteSpace($pInput)) {
        $Pattern = $pInput.Trim().Trim('"')
    }
}

# -------------------------------------------------------------
# 3. Hedef Dogrulama ve Dosya Tipi Teshisi
# -------------------------------------------------------------
$resolvedTarget = $null
$fileInfo = $null

if ($Mode -ne "Doctor") {
    if (-not (Test-Path -LiteralPath $Target)) {
        Write-Host ""
        Write-Host " [X] HATA: Belirtilen hedef yol bulunamadi!" -ForegroundColor Red
        Write-Host "     Yol: $Target" -ForegroundColor Gray
        exit 1
    }

    $resolvedTarget = (Resolve-Path -LiteralPath $Target).Path
    $fileInfo = Get-Item -LiteralPath $resolvedTarget

    Write-Host ""
    Write-Host " [*] Hedef:" -ForegroundColor Green -NoNewline
    Write-Host " $resolvedTarget" -ForegroundColor White
    
    if (-not $fileInfo.PSIsContainer) {
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host " [*] Boyut:" -ForegroundColor Green -NoNewline
        Write-Host " $sizeMB MB ($($fileInfo.Length) bayt)" -ForegroundColor Gray
        Write-Host " [*] Uzanti:" -ForegroundColor Green -NoNewline
        Write-Host " $($fileInfo.Extension)" -ForegroundColor Yellow
        
        # Akilli mod onerisi uyarisi
        if ($fileInfo.Extension -in @(".asar", ".js", ".mjs", ".cjs") -and $Mode -eq "Overview") {
            Write-Host " [i] Ipucu: Hedef bir JavaScript/ASAR arsividir. 'Electron' modu detayli AST analizi sunar." -ForegroundColor Magenta
        }
    } else {
        Write-Host " [*] Tip:" -ForegroundColor Green -NoNewline
        Write-Host " Dizin / Klasor" -ForegroundColor Yellow
    }
}

# -------------------------------------------------------------
# 4. Cikti Klasoru Hazirligi
# -------------------------------------------------------------
$resolvedOutDir = $null
if (-not $NoSave) {
    if (-not (Test-Path -LiteralPath $OutDir)) {
        try {
            $created = New-Item -ItemType Directory -Path $OutDir -Force -ErrorAction Stop
            $resolvedOutDir = $created.FullName
        } catch {
            Write-Warning "Cikti klasoru olusturulamadi ($OutDir): $_"
        }
    } else {
        $resolvedOutDir = (Resolve-Path -LiteralPath $OutDir).Path
    }
    Write-Host " [*] Cikti Dizini:" -ForegroundColor Green -NoNewline
    Write-Host " $resolvedOutDir" -ForegroundColor White
}

Write-Host " [*] Mod:" -ForegroundColor Green -NoNewline
Write-Host " $Mode" -ForegroundColor Cyan
Write-Host " [*] Format:" -ForegroundColor Green -NoNewline
Write-Host " $Format" -ForegroundColor Cyan

# -------------------------------------------------------------
# 5. REA Komut Yapilandirmasi
# -------------------------------------------------------------
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetBaseName = if ($resolvedTarget) { [System.IO.Path]::GetFileNameWithoutExtension($resolvedTarget) } else { "rea" }
$outputFileName = ""
$reaSubCommand = ""
$reaCmdArgs = @()

switch ($Mode) {
    "Overview" {
        $reaSubCommand = "analyze"
        $reaCmdArgs = @("analyze", $resolvedTarget, "--format", $Format)
        $outputFileName = "rea_overview_${targetBaseName}_$timestamp.$Format"
    }
    "Deep" {
        $decompiledDir = Join-Path $resolvedOutDir "decompiled_${targetBaseName}_$timestamp"
        if (-not (Test-Path -LiteralPath $decompiledDir)) {
            New-Item -ItemType Directory -Path $decompiledDir -Force | Out-Null
        }
        $reaSubCommand = "decompile-all"
        $reaCmdArgs = @("decompile-all", $resolvedTarget, "--output", $decompiledDir, "--format", $Format)
        $outputFileName = "rea_deep_${targetBaseName}_$timestamp.$Format"
    }
    "Electron" {
        $reaSubCommand = "analyze-javascript-application"
        $reaCmdArgs = @("analyze-javascript-application", $resolvedTarget, "--detail", "complete", "--format", $Format)
        $outputFileName = "rea_electron_${targetBaseName}_$timestamp.$Format"
    }
    "Strings" {
        $reaSubCommand = "search"
        $reaCmdArgs = @("search", $resolvedTarget, $Pattern, "--kind", "strings", "--format", $Format)
        $outputFileName = "rea_strings_${targetBaseName}_$timestamp.$Format"
    }
    "Doctor" {
        $reaSubCommand = "doctor"
        $reaCmdArgs = @("doctor", "--format", $Format)
        $outputFileName = "rea_doctor_$timestamp.$Format"
    }
}

$outputFilePath = if ($resolvedOutDir -and $outputFileName) { Join-Path $resolvedOutDir $outputFileName } else { $null }

# -------------------------------------------------------------
# 6. Komutun Calistirilmasi ve Sonuc Yakalama
# -------------------------------------------------------------
Write-Host ""
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " [>] REA Motoru Baslatiliyor..." -ForegroundColor Yellow
$displayCmd = "npx -y rea-agents " + ($reaCmdArgs | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join " "
Write-Host "     Komut: $displayCmd" -ForegroundColor DarkGray
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$sw = [System.Diagnostics.Stopwatch]::StartNew()

# npx calistirici belirleme
$npxCmd = "npx"
if (Get-Command "npx.cmd" -ErrorAction SilentlyContinue) {
    $npxCmd = "npx.cmd"
}

$fullArgs = @("-y", "--silent", "rea-agents@6.8.0") + $reaCmdArgs

# Komutu calistir ve ciktilari yakala
try {
    $outputLines = & $npxCmd @fullArgs
    $exitCode = $LASTEXITCODE
} catch {
    Write-Host " [X] Komut calistirma hatasi: $_" -ForegroundColor Red
    $outputLines = @("Hata: $_")
    $exitCode = 1
}

$sw.Stop()
$elapsedSec = [math]::Round($sw.Elapsed.TotalSeconds, 2)

# Ekrana bas
if ($outputLines) {
    foreach ($line in $outputLines) {
        Write-Host $line
    }
}

$allText = if ($outputLines) { $outputLines -join [Environment]::NewLine } else { "" }

# -------------------------------------------------------------
# 7. Akilli Teshis ve Hata Rehberi
# -------------------------------------------------------------
if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " [!] Analiz Bildirimi (Exit Code: $exitCode)" -ForegroundColor Yellow
    
    if ($allText -match "provider_unavailable" -or $allText -match "missing_analysis_engine") {
        Write-Host " [i] REA Teshisi: Hedef ikili dosya (PE/ELF) icin derin dekompilator motoru (Ghidra / IDA)" -ForegroundColor Magenta
        Write-Host "     ortamda tanimli degil." -ForegroundColor Magenta
        Write-Host ""
        Write-Host " [?] Alternatif / Hizli Cozumler:" -ForegroundColor Cyan
        if ($resolvedTarget -and ($fileInfo.Extension -in @(".exe", ".dll", ".sys"))) {
            Write-Host "  1. PE Import Tablosu ve DLL Incelemesi (Harici motor gerektirmez):" -ForegroundColor White
            Write-Host "     npx -y rea-agents inspect-pe-imports `"$resolvedTarget`"" -ForegroundColor Green
            Write-Host "  2. PE Kaynak ve Sertifika Incelemesi:" -ForegroundColor White
            Write-Host "     npx -y rea-agents inspect-pe-resources `"$resolvedTarget`"" -ForegroundColor Green
            Write-Host "  3. Ikili Entropi ve Duzen Analizi:" -ForegroundColor White
            Write-Host "     npx -y rea-agents inspect-byte-entropy `"$resolvedTarget`"" -ForegroundColor Green
        }
        Write-Host "  4. Eksik motorlari ve sistem hazir bulunuslugunu gormek icin:" -ForegroundColor White
        Write-Host "     .\run_rea.ps1 -Mode Doctor" -ForegroundColor Green
    }
}

# -------------------------------------------------------------
# 8. Ciktinin Dosyaya Kaydedilmesi
# -------------------------------------------------------------
if (-not $NoSave -and $outputFilePath -and -not [string]::IsNullOrWhiteSpace($allText)) {
    try {
        [System.IO.File]::WriteAllText($outputFilePath, $allText, [System.Text.Encoding]::UTF8)
        Write-Host ""
        Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host " [V] Analiz Raporu Kaydedildi:" -ForegroundColor Green
        Write-Host "     Dosya: $outputFilePath" -ForegroundColor White
        Write-Host "     Satir: $($outputLines.Count) satir" -ForegroundColor Gray
    } catch {
        Write-Warning "Rapor dosyaya yazilamadi: $_"
    }
}

# -------------------------------------------------------------
# 9. Ozet ve Kapanis
# -------------------------------------------------------------
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  Tamamlandi: Mod=$Mode | Sure=${elapsedSec}s | Cikis Kodu=$exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Yellow" })
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

exit $exitCode


# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQU/14geXSwCyNNVLAHqh3zzusS
# ymGgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQU4YJPNqqqDDqGOI7lnAlYnwqPSgMwDQYJKoZIhvcN
# AQEBBQAEggEAOjY3INnrtED9w2hODbXF63hlFqHudA+hDywzH76ZhHJ+688CKFPb
# HwtIWsJk34tLb7M3L/M55zjstSRtu1x/NyoQBzRB/Lh+6Kr3qIePy0pH8hdYmrQZ
# SIEsaifndBIkN+1GvpswExznTvJJu9LKZB870QCRsvfKf4yjzL0zHP3nwO3ypalG
# uVYMZSLS7PafIS4ar8qr+FPRLtR1hBwzabE7kJrdWQIOQmsWeDFjjBZU2BW9f4k7
# NuGQO6GnXpq8AAZy9nll88j5hbi6YMCDpnssB5dx/3uxq1CpUq55erkRB9l6xEKa
# yKzTsqH11cSZpEIp4Axqrz5KsGWN+nUdDw==
# SIG # End signature block
