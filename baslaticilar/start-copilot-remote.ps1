<#
.SYNOPSIS
    GitHub Copilot CLI /remote Modu Akıllı Başlatıcı & Profil Entegratörü
.DESCRIPTION
    Bu betik, GitHub Copilot CLI'ın `/remote` (uzaktan oturum paylaşımı ve mobil/web bağlantısı)
    ve `--connect` modlarını Windows PowerShell ortamında en zahmetsiz şekilde çalıştırmak
    için geliştirilmiştir.
    
    Özellikler:
    - Çalışılan dizinin Git deposu olup olmadığını denetler.
    - Remote origin (GitHub uzak depo) bağlantısını doğrular.
    - Oturumu doğrudan `/remote` moduyla başlatır veya oturum koduna bağlanır (--connect).
    - PowerShell profiline (`$PROFILE`) tek komutla `copilot-remote` ve `cop-remote` kısayollarını ekler.
.EXAMPLE
    .\start-copilot-remote.ps1
    # Mevcut depoda copilot -i "/remote" başlatır.
.EXAMPLE
    .\start-copilot-remote.ps1 -Connect "session-id-buraya"
    # Belirtilen uzak oturuma bağlanır.
.EXAMPLE
    .\start-copilot-remote.ps1 -InstallProfile
    # copilot-remote ve cop-remote fonksiyonlarını PowerShell profiline kalıcı olarak ekler.
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$SessionId,

    [Parameter()]
    [switch]$Connect,

    [Parameter()]
    [switch]$NoCheck,

    [Parameter()]
    [switch]$Trust,

    [Parameter()]
    [string]$Model,

    [Parameter()]
    [switch]$InstallProfile,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CopilotArgs
)

# Renkli konsol çıktı yardımcıları
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 65) -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor White
    Write-Host ("=" * 65) -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Prefix, [string]$Message, [string]$Color = "White")
    Write-Host "[$Prefix] " -NoNewline -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] " -NoNewline -ForegroundColor Green
    Write-Host $Message -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[UYARI] " -NoNewline -ForegroundColor Yellow
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[HATA] " -NoNewline -ForegroundColor Red
    Write-Host $Message -ForegroundColor Red
}

# PowerShell Profil Entegrasyonu
if ($InstallProfile) {
    Write-Header "GitHub Copilot Remote - PowerShell Profil Kurulumu"
    
    $ProfilePath = $PROFILE
    if (-not $ProfilePath) {
        $ProfilePath = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
    }

    $ProfileDir = Split-Path -Parent $ProfilePath
    if (-not (Test-Path $ProfileDir)) {
        New-Item -ItemType Directory -Path $ProfileDir -Force | Out-Null
    }

    $ScriptFullPath = $PSCommandPath
    if (-not $ScriptFullPath) {
        $ScriptFullPath = Join-Path (Get-Location) "start-copilot-remote.ps1"
    }

    $Snippet = @"

# >>> GitHub Copilot Remote Entegrasyonu (start-copilot-remote) >>>
function Invoke-CopilotRemote {
    [CmdletBinding()]
    param(
        [Parameter(Position = 0)]
        [string]`$SessionId,
        [Parameter()]
        [switch]`$Connect,
        [Parameter()]
        [switch]`$NoCheck,
        [Parameter()]
        [switch]`$Trust,
        [Parameter()]
        [string]`$Model,
        [Parameter(ValueFromRemainingArguments = `$true)]
        [string[]]`$AdditionalArgs
    )
    & "$ScriptFullPath" @PSBoundParameters
}

Set-Alias -Name copilot-remote -Value Invoke-CopilotRemote -Description "GitHub Copilot CLI /remote Modu Baslaticisi" -Scope Global -ErrorAction SilentlyContinue
Set-Alias -Name cop-remote -Value Invoke-CopilotRemote -Description "GitHub Copilot CLI /remote Hizli Alias" -Scope Global -ErrorAction SilentlyContinue
Set-Alias -Name copremote -Value Invoke-CopilotRemote -Description "GitHub Copilot CLI /remote Hizli Alias" -Scope Global -ErrorAction SilentlyContinue
# <<< GitHub Copilot Remote Entegrasyonu <<<
"@

    $ExistingContent = ""
    if (Test-Path $ProfilePath) {
        $ExistingContent = Get-Content -Path $ProfilePath -Raw
    }

    if ($ExistingContent -match "Invoke-CopilotRemote") {
        Write-Warn "Profilde zaten 'Invoke-CopilotRemote' tanımı mevcut. Güncelleniyor..."
        # Eski bloğu temizle
        $UpdatedContent = $ExistingContent -replace '(?s)# >>> GitHub Copilot Remote Entegrasyonu.*?# <<< GitHub Copilot Remote Entegrasyonu <<<', $Snippet.Trim()
        Set-Content -Path $ProfilePath -Value $UpdatedContent -Encoding UTF8
    } else {
        Add-Content -Path $ProfilePath -Value "`n$Snippet" -Encoding UTF8
    }

    Write-Success "PowerShell profili başarıyla güncellendi: $ProfilePath"
    Write-Host ""
    Write-Host "Kullanıma hazır aliaslar:" -ForegroundColor Cyan
    Write-Host "  * copilot-remote" -ForegroundColor Green
    Write-Host "  * cop-remote" -ForegroundColor Green
    Write-Host "  * copremote" -ForegroundColor Green
    Write-Host ""
    Write-Host "Hemen kullanmak için: . `$PROFILE" -ForegroundColor Yellow
    return
}

Write-Header "GitHub Copilot CLI /remote Modu Başlatıcı"

# 1. Copilot CLI Yürütülebilir Dosya Tespiti
$CopilotExe = $null
$Cmd = Get-Command copilot -ErrorAction SilentlyContinue
if ($Cmd) {
    $CopilotExe = $Cmd.Source
} else {
    $FallbackPath = Join-Path $env:LOCALAPPDATA "GitHubCopilotCLI\copilot.exe"
    if (Test-Path $FallbackPath) {
        $CopilotExe = $FallbackPath
    }
}

if (-not $CopilotExe) {
    Write-Err "GitHub Copilot CLI (copilot.exe) sistemde bulunamadı!"
    Write-Host "Yüklemek için: winget install GitHub.CopilotCLI veya npm install -g @github/copilot-cli" -ForegroundColor Yellow
    exit 1
}

Write-Step "CLI" "Copilot Yolu: $CopilotExe"

# 2. Git & Remote Origin Doğrulama
$GitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $GitCmd) {
    Write-Warn "Sistemde 'git' komutu bulunamadı. Git tabanlı kontroller atlanıyor."
} elseif (-not $NoCheck) {
    $InsideWorkTree = $false
    try {
        $res = & git rev-parse --is-inside-work-tree 2>$null
        if ($LASTEXITCODE -eq 0 -and $res -eq "true") {
            $InsideWorkTree = $true
        }
    } catch {
        $InsideWorkTree = $false
    }

    if (-not $InsideWorkTree) {
        Write-Warn "Bulunulan dizin ('$((Get-Location).Path)') bir Git çalışma deposu (repository) değil."
        Write-Host "       GitHub Copilot /remote modu, sekmeleri ve dosya senkronizasyonunu GitHub web/mobil" -ForegroundColor DarkGray
        Write-Host "       üzerinden yönetirken Git reposu ile eşleştirmeyi önerir." -ForegroundColor DarkGray
        Write-Host ""
        $answer = Read-Host "Yine de devam etmek istiyor musunuz? [E/H] (Varsayılan: E)"
        if ($answer -and $answer.Trim().ToUpper() -eq "H") {
            Write-Host "İşlem kullanıcı tarafından iptal edildi." -ForegroundColor Yellow
            exit 0
        }
    } else {
        $RepoRoot = & git rev-parse --show-toplevel 2>$null
        $CurrentBranch = & git branch --show-current 2>$null
        $OriginUrl = & git config --get remote.origin.url 2>$null

        Write-Success "Git Deposu Doğrulandı: $RepoRoot"
        if ($CurrentBranch) {
            Write-Step "DAL" "Aktif Dal: $CurrentBranch" "Cyan"
        }

        if ($OriginUrl) {
            Write-Success "Remote Origin Doğrulandı: $OriginUrl"
        } else {
            Write-Warn "Bu Git deposunda bağlı bir 'origin' uzak deposu (remote) bulunamadı!"
            Write-Host "       Copilot Remote paylaşımının GitHub web/mobil ile sorunsuz eşleşebilmesi için" -ForegroundColor DarkYellow
            Write-Host "       bir uzak GitHub deposu önerilir:" -ForegroundColor DarkYellow
            Write-Host "       -> git remote add origin https://github.com/<kullanici>/<depo>.git" -ForegroundColor Gray
            Write-Host ""
        }
    }
}

# 3. Komut Argümanlarını Hazırlama
$FinalArgs = @()

if ($SessionId) {
    Write-Step "MOD" "Mevcut Uzak Oturuma Bağlanılıyor: $SessionId" "Magenta"
    $FinalArgs += "--connect"
    $FinalArgs += $SessionId
} elseif ($Connect) {
    Write-Step "MOD" "Uzak Oturum Seçici Modu (--connect)" "Magenta"
    $FinalArgs += "--connect"
} else {
    Write-Step "MOD" "Oturum Başlatılıyor ve /remote Paylaşım Modu Tetikleniyor" "Green"
    $FinalArgs += "-i"
    $FinalArgs += "/remote"
}

if ($Trust) {
    $FinalArgs += "--trust-folder"
}

if ($Model) {
    $FinalArgs += "--model"
    $FinalArgs += $Model
}

if ($CopilotArgs -and $CopilotArgs.Count -gt 0) {
    $FinalArgs += $CopilotArgs
}

Write-Host ""
Write-Step "CALISTIR" "& copilot $FinalArgs" "Gray"
Write-Host ("-" * 65) -ForegroundColor DarkGray

# 4. Copilot CLI Çağrısı
& $CopilotExe @FinalArgs
