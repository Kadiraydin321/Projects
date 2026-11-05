<#
.SYNOPSIS
    Hermes Agent Yerel Mod Hizli Baslatici (VRAM Mutex Destekli)
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$LauncherArgs
)

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

$ManagerPath = Join-Path $ScriptDir "manage-agents.ps1"
if (-not (Test-Path $ManagerPath)) {
    if (Test-Path "c:\Users\Birin\Birin\Projeler\baslaticilar\manage-agents.ps1") {
        $ManagerPath = "c:\Users\Birin\Birin\Projeler\baslaticilar\manage-agents.ps1"
    } elseif (Test-Path "C:\Users\Birin\hermes-workspace\manage-agents.ps1") {
        $ManagerPath = "C:\Users\Birin\hermes-workspace\manage-agents.ps1"
    }
}

if ($LauncherArgs -and $LauncherArgs.Count -gt 0) {
    & $ManagerPath -Agent hermes @LauncherArgs
} else {
    & $ManagerPath -Agent hermes
}
