<#
.SYNOPSIS
    Antigravity Coklu Ajan Yonetim Paneli ve VRAM Mutex Yoneticisi
.DESCRIPTION
    Claude Code, Qwen Code ve Hermes Agent'i tek merkezden yonetir.
    RTX 5060 Ti 16 GB VRAM'in tasmasini engellemek icin VRAM Mutex mekanizmasi ile
    calisan diger buyuk modelleri tahliye eder, hedef modeli on isitir ve LiteLLM koprusunu yonetir.
.PARAMETER Agent
    Calistirilacak ajan veya eylem: qwen, hermes, claude, status, stop-all
.PARAMETER Prompt
    Ajana iletilecek baslangic istemi (opsiyonel)
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0, Mandatory = $false)]
    [ValidateSet("qwen", "hermes", "claude", "status", "stop-all")]
    [string]$Agent = "status",

    [Parameter(Position = 1, Mandatory = $false)]
    [string]$Prompt = "",

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtraArgs
)

# UTF-8 ve Hata Yapilandirmasi
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

$Host.UI.RawUI.WindowTitle = "Antigravity Multi-Agent & VRAM Mutex Manager"

# Sabit Yollar ve Ayarlar
$OllamaUrl = "http://127.0.0.1:11434"
$LiteLlmUrl = "http://127.0.0.1:8000"
$HermesWorkspace = "C:\Users\Birin\hermes-workspace"
$ProjelerWorkspace = "c:\Users\Birin\Birin\Projeler"

# LiteLLM Exe ve Config tespiti
$LiteLlmExe = "C:\Users\Birin\AppData\Local\Programs\Python\Python39\Scripts\litellm.exe"
if (-not (Test-Path $LiteLlmExe)) {
    $found = (Get-Command "litellm.exe" -ErrorAction SilentlyContinue).Source
    if ($found) { $LiteLlmExe = $found }
}

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

$LiteLlmConfig = Join-Path $ScriptDir "litellm-config.yaml"
if (-not (Test-Path $LiteLlmConfig)) {
    if (Test-Path "c:\Users\Birin\Birin\Projeler\baslaticilar\litellm-config.yaml") {
        $LiteLlmConfig = "c:\Users\Birin\Birin\Projeler\baslaticilar\litellm-config.yaml"
    } elseif (Test-Path "C:\Users\Birin\hermes-workspace\litellm-config.yaml") {
        $LiteLlmConfig = "C:\Users\Birin\hermes-workspace\litellm-config.yaml"
    }
}

# ==============================================================================
# YARDIMCI FONKSIYONLAR
# ==============================================================================

function Get-GpuMemory {
    try {
        $smi = nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits 2>$null
        if ($smi) {
            $parts = $smi -split ',\s*'
            return [PSCustomObject]@{
                Name        = $parts[0]
                TotalMiB    = [int]$parts[1]
                UsedMiB     = [int]$parts[2]
                FreeMiB     = [int]$parts[3]
                UtilPct     = [int]$parts[4]
                TempC       = [int]$parts[5]
                TotalGB     = [math]::Round([int]$parts[1] / 1024, 2)
                UsedGB      = [math]::Round([int]$parts[2] / 1024, 2)
                FreeGB      = [math]::Round([int]$parts[3] / 1024, 2)
            }
        }
    } catch {}
    return $null
}

function Test-OllamaHealth {
    try {
        $null = Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Ensure-OllamaRunning {
    if (Test-OllamaHealth) { return $true }
    Write-Host "[Ollama] Servis aktif degil, baslatiliyor..." -ForegroundColor Yellow
    $ollamaExe = "ollama"
    $knownPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (Test-Path $knownPath) { $ollamaExe = $knownPath }

    try {
        Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
    } catch {
        Write-Error "Ollama servisi baslatilamadi: $($_.Exception.Message)"
        return $false
    }

    $waited = 0
    Write-Host "  [*] Ollama hazirlaniyor" -NoNewline -ForegroundColor DarkGray
    while ($waited -lt 15) {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "." -NoNewline -ForegroundColor DarkGray
        if (Test-OllamaHealth) {
            Write-Host " [OK]" -ForegroundColor Green
            return $true
        }
    }
    Write-Host " [Zaman Asimi]" -ForegroundColor Red
    return $false
}

function Invoke-VramMutex {
    param([string]$KeepModel = "")
    Write-Host "`n[VRAM Mutex Protocol]" -ForegroundColor Magenta
    try {
        $ps = Invoke-RestMethod -Uri "$OllamaUrl/api/ps" -Method Get -TimeoutSec 3 -ErrorAction Stop
        if ($ps.models -and $ps.models.Count -gt 0) {
            foreach ($m in $ps.models) {
                $mName = $m.name
                if ($KeepModel -and ($mName -eq $KeepModel -or $mName -like "$KeepModel*")) {
                    Write-Host "  [+] Model VRAM'de korunuyor: $mName ($([math]::Round($m.size_vram / 1GB, 2)) GB)" -ForegroundColor Green
                } else {
                    Write-Host "  [-] VRAM Tahliyesi Yapiliyor: $mName (Oto-Mutex Tahliyesi)" -ForegroundColor Yellow
                    & ollama stop $mName 2>$null
                }
            }
        } else {
            Write-Host "  [i] VRAM temiz, yuklu baska buyuk model bulunmuyor." -ForegroundColor DarkGray
        }
    } catch {
        # Fallback to CLI
        Write-Warning "Ollama ps API'sine erisilemedi, CLI uzerinden kontrol ediliyor."
    }
}

function Invoke-ModelWarmup {
    param(
        [string]$ModelName,
        [string]$KeepAlive = "24h"
    )
    Write-Host "[Model Isitma] '$ModelName' VRAM'e yukleniyor (keep_alive=$KeepAlive)..." -ForegroundColor Cyan
    $payload = @{
        model = $ModelName
        prompt = ""
        keep_alive = $KeepAlive
    } | ConvertTo-Json -Compress

    try {
        $null = Invoke-RestMethod -Uri "$OllamaUrl/api/generate" -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 120
        Write-Host "  [+] '$ModelName' basariyla VRAM'e yuklendi ve sicak tutuluyor." -ForegroundColor Green
        return $true
    } catch {
        Write-Warning "Model on isitma uyarisi: $($_.Exception.Message)"
        return $false
    }
}

function Test-LiteLlmPort {
    $conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

function Test-LiteLlmHealth {
    try {
        $headers = @{ Authorization = "Bearer sk-litellm-local" }
        $null = Invoke-RestMethod -Uri "$LiteLlmUrl/models" -Headers $headers -Method Get -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        if ($_.Exception.Response -ne $null) {
            return $true
        }
        return $false
    }
}

function Ensure-LiteLlmBridge {
    if (Test-LiteLlmHealth) {
        Write-Host "  [+] LiteLLM yerel koprusu (port 8000) zaten aktif ve yanit veriyor." -ForegroundColor Green
        return $true
    }

    Write-Host "[LiteLLM] Yerel Anthropic koprusu baslatiliyor (http://127.0.0.1:8000)..." -ForegroundColor Yellow

    if (-not (Test-Path $LiteLlmExe)) {
        Write-Error "HATA: LiteLLM calistirilabilir dosyasi bulunamadi: $LiteLlmExe"
        return $false
    }

    if (-not (Test-Path $LiteLlmConfig)) {
        Write-Error "HATA: LiteLLM yapilandirma dosyasi bulunamadi: $LiteLlmConfig"
        return $false
    }

    $logDir = "$env:LOCALAPPDATA\litellm\logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $outLog = Join-Path $logDir "litellm_out.log"
    $errLog = Join-Path $logDir "litellm_err.log"

    # Windows cp1254 banner unicode encoding hatasini onle
    $env:PYTHONIOENCODING = "utf-8"
    $env:PYTHONUTF8 = "1"

    $argsList = "--port 8000 --config `"$LiteLlmConfig`" --telemetry False"
    
    try {
        Start-Process -FilePath $LiteLlmExe `
            -ArgumentList $argsList `
            -RedirectStandardOutput $outLog `
            -RedirectStandardError $errLog `
            -WindowStyle Hidden
    } catch {
        Write-Error "LiteLLM baslatilamadi: $($_.Exception.Message)"
        return $false
    }

    $waited = 0
    Write-Host "  [*] LiteLLM hazirlaniyor" -NoNewline -ForegroundColor DarkGray
    while ($waited -lt 15) {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "." -NoNewline -ForegroundColor DarkGray
        if (Test-LiteLlmHealth) {
            Write-Host " [OK]" -ForegroundColor Green
            Write-Host "  [+] LiteLLM basariyla baslatildi ve port 8000'de dinliyor." -ForegroundColor Green
            return $true
        }
    }

    Write-Host " [Zaman Asimi]" -ForegroundColor Red
    Write-Warning "LiteLLM 15 saniye icinde yanit vermedi. Log: $errLog"
    return $false
}

function Stop-LiteLlmBridge {
    Write-Host "[LiteLLM] Kopru servisi durduruluyor..." -ForegroundColor Yellow
    $conns = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
            if ($p) {
                Write-Host "  [-] LiteLLM (PID: $($p.Id)) sonlandiriliyor..." -ForegroundColor DarkYellow
                Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Get-Process -Name "*litellm*" -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  [+] LiteLLM koprusu durduruldu." -ForegroundColor Green
}

# ==============================================================================
# EYLEMLER
# ==============================================================================

function Show-Status {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "     ANTIGRAVITY COKLU AJAN VE VRAM MUTEX DURUMU          " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    # 1. GPU ve VRAM Durumu
    $gpu = Get-GpuMemory
    if ($gpu) {
        Write-Host "`n[1] GPU & VRAM METRIKLERI:" -ForegroundColor Yellow
        Write-Host "  Model          : $($gpu.Name)"
        Write-Host "  Toplam VRAM    : $($gpu.TotalGB) GB ($($gpu.TotalMiB) MiB)"
        
        $usedColor = if ($gpu.UsedGB -gt 13) { "Red" } elseif ($gpu.UsedGB -gt 8) { "Yellow" } else { "Green" }
        Write-Host "  Kullanilan VRAM: $($gpu.UsedGB) GB ($($gpu.UsedMiB) MiB)" -ForegroundColor $usedColor
        Write-Host "  Serbest VRAM   : $($gpu.FreeGB) GB ($($gpu.FreeMiB) MiB)" -ForegroundColor Green
        Write-Host "  GPU Yuku       : %$($gpu.UtilPct) | Sicaklik: $($gpu.TempC)°C"
    } else {
        Write-Host "`n[1] GPU & VRAM: nvidia-smi verisi alinamadi." -ForegroundColor DarkYellow
    }

    # 2. Ollama & Aktif Modeller
    Write-Host "`n[2] OLLAMA SERVISI VE YUKLU MODELLER:" -ForegroundColor Yellow
    if (Test-OllamaHealth) {
        Write-Host "  Servis Durumu  : AKTIF (http://127.0.0.1:11434)" -ForegroundColor Green
        try {
            $ps = Invoke-RestMethod -Uri "$OllamaUrl/api/ps" -Method Get -TimeoutSec 3
            if ($ps.models -and $ps.models.Count -gt 0) {
                foreach ($m in $ps.models) {
                    $vramGB = [math]::Round($m.size_vram / 1GB, 2)
                    $totalGB = [math]::Round($m.size / 1GB, 2)
                    Write-Host "  * Model        : $($m.name)" -ForegroundColor Cyan
                    Write-Host "    VRAM / Boyut : $vramGB GB / $totalGB GB"
                    Write-Host "    Runner/Context: $($m.runner) | $($m.context_length) tokens"
                    Write-Host "    Gecerlilik   : $($m.expires_at)"
                }
            } else {
                Write-Host "  * Aktif Model  : VRAM'de yuklu model yok (Bosta)." -ForegroundColor DarkGray
            }
        } catch {
            Write-Host "  * Model listesi sorgulanamadi." -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  Servis Durumu  : KAPALI" -ForegroundColor Red
    }

    # 3. LiteLLM Kopru Durumu
    Write-Host "`n[3] LITELLM ANTHROPIC KOPRUSU (Port 8000):" -ForegroundColor Yellow
    if (Test-LiteLlmHealth) {
        $pids = (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue).OwningProcess
        Write-Host "  Durum          : AKTIF (http://127.0.0.1:8000) [PID: $($pids -join ', ')]" -ForegroundColor Green
        Write-Host "  Hedef Esleme   : Claude -> Ollama qwen2.5-coder:14b" -ForegroundColor DarkGray
    } elseif (Test-LiteLlmPort) {
        Write-Host "  Durum          : Port 8000 acik fakat LiteLLM yanit vermiyor." -ForegroundColor Yellow
    } else {
        Write-Host "  Durum          : KAPALI (Port 8000 bostur)" -ForegroundColor DarkGray
    }

    # 4. Ajan CLI Komutlari
    Write-Host "`n[4] KURULU AJAN CLI ARACLARI:" -ForegroundColor Yellow
    $clis = @(
        @{ Name = "Qwen Code"; Cmd = "qwen" },
        @{ Name = "Hermes Agent"; Cmd = "hermes" },
        @{ Name = "Claude Code"; Cmd = "claude" }
    )
    foreach ($c in $clis) {
        $found = Get-Command $c.Cmd -ErrorAction SilentlyContinue
        if ($found) {
            Write-Host "  * $($c.Name): MEVCUT ($($found.Source))" -ForegroundColor Green
        } else {
            Write-Host "  * $($c.Name): BULUNAMADI" -ForegroundColor Red
        }
    }
    Write-Host "==========================================================" -ForegroundColor Cyan
}

function Stop-AllAgents {
    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host "   TUM MODELLERI VE AJAN SERVISLERINI DURDURMA PROTOKOLU  " -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Yellow

    # 1. Ollama tum modelleri tahliye et
    if (Test-OllamaHealth) {
        Write-Host "[1/2] Ollama VRAM modelleri tahliye ediliyor..." -ForegroundColor Cyan
        try {
            $ps = Invoke-RestMethod -Uri "$OllamaUrl/api/ps" -Method Get -TimeoutSec 3
            if ($ps.models) {
                foreach ($m in $ps.models) {
                    Write-Host "  [-] Tahliye: $($m.name)" -ForegroundColor Yellow
                    & ollama stop $m.name 2>$null
                }
            } else {
                Write-Host "  [i] Zaten yuklu model yok." -ForegroundColor DarkGray
            }
        } catch {
            Write-Warning "Ollama ps alinamadi."
        }
    }

    # 2. LiteLLM koprusunu durdur
    Write-Host "`n[2/2] LiteLLM yerel koprusu sonlandiriliyor..." -ForegroundColor Cyan
    Stop-LiteLlmBridge

    # 3. Sonuc VRAM durumu
    Start-Sleep -Seconds 1
    $gpu = Get-GpuMemory
    if ($gpu) {
        Write-Host "`n[+] Islem Tamamlandi! Serbest VRAM: $($gpu.FreeGB) GB / $($gpu.TotalGB) GB" -ForegroundColor Green
    }
    Write-Host "==========================================================" -ForegroundColor Yellow
}

function Start-QwenAgent {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "             QWEN CODE AGENT BASLATILIYOR                 " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    # 1. Ollama kontrolu
    if (-not (Ensure-OllamaRunning)) { return }

    # 2. VRAM Mutex - qwen2.5-coder:14b haric digerlerini tahliye et
    Invoke-VramMutex -KeepModel "qwen2.5-coder:14b"

    # 3. Model on isitma
    Invoke-ModelWarmup -ModelName "qwen2.5-coder:14b" -KeepAlive "24h" | Out-Null

    # 4. Qwen CLI Calistir
    Write-Host "`n[Baslatici] Qwen CLI aciliyor..." -ForegroundColor Green
    $allArgs = @()
    if ($Prompt) { $allArgs += $Prompt }
    if ($ExtraArgs) { $allArgs += $ExtraArgs }
    if ($allArgs.Count -gt 0) {
        & qwen @allArgs
    } else {
        & qwen
    }
}

function Start-HermesAgent {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "            HERMES AGENT (YEREL MOD) BASLATILIYOR          " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    # 1. Ollama kontrolu
    if (-not (Ensure-OllamaRunning)) { return }

    # 2. Hedef model belirleme (gemma4-64k oncelikli, alternatif gemma4:12b veya hermes3)
    $hermesModel = "gemma4-64k"
    try {
        $tags = (Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -Method Get -TimeoutSec 3).models.name
        if (-not ($tags -contains "gemma4-64k" -or $tags -contains "gemma4-64k:latest")) {
            if ($tags -contains "gemma4:12b" -or $tags -contains "gemma4:12b:latest") {
                $hermesModel = "gemma4:12b"
            } elseif ($tags -contains "hermes3" -or $tags -contains "hermes3:latest") {
                $hermesModel = "hermes3:latest"
            }
        }
    } catch {}

    # 3. VRAM Mutex - hermes modeli haric digerlerini tahliye et
    Invoke-VramMutex -KeepModel $hermesModel

    # 4. Model on isitma
    Invoke-ModelWarmup -ModelName $hermesModel -KeepAlive "24h" | Out-Null

    # 5. Dizin ve PATH ayarla
    if (Test-Path $HermesWorkspace) {
        Set-Location -Path $HermesWorkspace
        Write-Host "  [*] Calisma Dizini: $HermesWorkspace" -ForegroundColor DarkGray
    }

    $hermesBin = "$env:LOCALAPPDATA\hermes\bin"
    if ($env:PATH -notlike "*$hermesBin*") {
        $env:PATH = "$hermesBin;$env:PATH"
    }

    # 6. Hermes CLI Calistir
    Write-Host "`n[Baslatici] Hermes CLI aciliyor ($hermesModel)..." -ForegroundColor Green
    $allArgs = @()
    if ($Prompt) {
        if ($Prompt.StartsWith("-")) {
            $allArgs += $Prompt
        } else {
            $allArgs += @("-z", $Prompt)
        }
    }
    if ($ExtraArgs) { $allArgs += $ExtraArgs }
    if ($allArgs.Count -gt 0) {
        & hermes @allArgs
    } else {
        & hermes
    }
}

function Start-ClaudeAgent {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "       CLAUDE CODE (LITELLM YEREL KOPRU) BASLATILIYOR     " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    # 1. Ollama kontrolu
    if (-not (Ensure-OllamaRunning)) { return }

    # 2. VRAM Mutex - qwen2.5-coder:14b haric digerlerini tahliye et
    Invoke-VramMutex -KeepModel "qwen2.5-coder:14b"

    # 3. Model on isitma
    Invoke-ModelWarmup -ModelName "qwen2.5-coder:14b" -KeepAlive "24h" | Out-Null

    # 4. LiteLLM Kopru kontrolu
    if (-not (Ensure-LiteLlmBridge)) {
        Write-Error "LiteLLM yerel koprusu baslatilamadi, Claude Code calistirilamiyor."
        return
    }

    # 5. Claude Code Ortam Degiskenleri (Anthropic Yerel Kopru)
    $env:ANTHROPIC_BASE_URL = "http://127.0.0.1:8000"
    $env:ANTHROPIC_API_KEY = "sk-litellm-local"

    Write-Host "`n[Ortam Yapilandirmasi]" -ForegroundColor Cyan
    Write-Host "  ANTHROPIC_BASE_URL: $env:ANTHROPIC_BASE_URL" -ForegroundColor DarkGray
    Write-Host "  ANTHROPIC_API_KEY : sk-litellm-*** (Yerel Kimlik Dogrulama)" -ForegroundColor DarkGray

    # 6. Claude Code Calistir
    Write-Host "`n[Baslatici] Claude Code CLI aciliyor..." -ForegroundColor Green
    $allArgs = @()
    if ($Prompt) { $allArgs += $Prompt }
    if ($ExtraArgs) { $allArgs += $ExtraArgs }
    if ($allArgs.Count -gt 0) {
        & claude @allArgs
    } else {
        & claude
    }
}

# ==============================================================================
# ANA YONETIM SWITCHI
# ==============================================================================

switch ($Agent.ToLower()) {
    "qwen" {
        Start-QwenAgent
    }
    "hermes" {
        Start-HermesAgent
    }
    "claude" {
        Start-ClaudeAgent
    }
    "stop-all" {
        Stop-AllAgents
    }
    "status" {
        Show-Status
    }
    default {
        Show-Status
    }
}

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUkUn7UCUXv9U4pvwVSFQxE6oH
# t56gggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUqtgVY/nB7gZsTsMI9r49lSuoKEswDQYJKoZIhvcN
# AQEBBQAEggEAqxHsQD/udJB34OjqqAfVRPsdqTGUhcVuaNp1CxZBzBJucZnwDFz1
# qUIZNGHYQFBAlxr+Rs1Ca3sJ0sDyavRBvbKrNEgQiRCE3i7iyLNV1ELHySB8IPex
# mvbY5+dMxl6ki9IpQzz4v4qCp+aoYAtwiHEIk6JWr4qpuMMgxan2fnMt7mTb1hwv
# Ao9GyZh7Kk4zhhGfle+4gav+E7c9v3a6s6kqW7lSDJifYqh9adFyJpcNhXbG3SVZ
# Tx7q6s/QuOlQ+DrNY6QmTE+gHqjK0WXT6uPjjou3uXw9aJI2arLqPZQszDaW1pTJ
# FPHHw+W0X7yes5A5GVJs9rw6opSTDVjlsw==
# SIG # End signature block
