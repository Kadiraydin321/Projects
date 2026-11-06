# Windows Service Manager Script
# This script allows you to manage Windows services and startup applications

param(
    [string]$Action = "list",
    [string]$ServiceName = "",
    [string]$StartupAppName = ""
)

function Get-WindowsServices {
    try {
        $services = Get-Service -ErrorAction Stop | Select-Object Name, DisplayName, Status, StartType
        Write-Output "Windows Services:"
        $services | Format-Table -AutoSize
    }
    catch {
        Write-Error "Failed to retrieve Windows services: $_"
    }
}

function Get-StartupApplications {
    try {
        $startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
        $startupItems = Get-ChildItem -Path $startupPath -ErrorAction Stop
        Write-Output "Startup Applications:"
        $startupItems | ForEach-Object {
            Write-Output $_.Name
        }
    }
    catch {
        Write-Error "Failed to retrieve startup applications: $_"
    }
}

function Start-ServiceByName {
    param([string]$Name)
    try {
        Start-Service -Name $Name -ErrorAction Stop
        Write-Output "Started service: $Name"
    }
    catch {
        Write-Error "Failed to start service $Name: $_"
    }
}

function Stop-ServiceByName {
    param([string]$Name)
    try {
        Stop-Service -Name $Name -ErrorAction Stop
        Write-Output "Stopped service: $Name"
    }
    catch {
        Write-Error "Failed to stop service $Name: $_"
    }
}

function Restart-ServiceByName {
    param([string]$Name)
    try {
        Restart-Service -Name $Name -ErrorAction Stop
        Write-Output "Restarted service: $Name"
    }
    catch {
        Write-Error "Failed to restart service $Name: $_"
    }
}

function Add-StartupApplication {
    param([string]$AppName)
    try {
        $startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
        $appPath = (Get-Command $AppName).Path
        if ($appPath) {
            $linkName = "$startupPath\$AppName.lnk"
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($linkName)
            $shortcut.TargetPath = $appPath
            $shortcut.Save()
            Write-Output "Added $AppName to startup"
        }
        else {
            Write-Error "Application not found: $AppName"
        }
    }
    catch {
        Write-Error "Failed to add $AppName to startup: $_"
    }
}

function Remove-StartupApplication {
    param([string]$AppName)
    try {
        $startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
        $linkFile = "$startupPath\$AppName.lnk"
        if (Test-Path $linkFile) {
            Remove-Item $linkFile -Force
            Write-Output "Removed $AppName from startup"
        }
        else {
            Write-Error "$AppName not found in startup"
        }
    }
    catch {
        Write-Error "Failed to remove $AppName from startup: $_"
    }
}

switch ($Action) {
    "list" { Get-WindowsServices }
    "startup" { Get-StartupApplications }
    "start" { Start-ServiceByName -Name $ServiceName }
    "stop" { Stop-ServiceByName -Name $ServiceName }
    "restart" { Restart-ServiceByName -Name $ServiceName }
    "add-startup" { Add-StartupApplication -AppName $StartupAppName }
    "remove-startup" { Remove-StartupApplication -AppName $StartupAppName }
    default { Write-Output "Usage: WindowsServiceManager.ps1 -Action [list|startup|start|stop|restart|add-startup|remove-startup] [-ServiceName <name>] [-StartupAppName <name>]" }
}