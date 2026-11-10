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
# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUebn4/5fnzJZdzRxgwVFHCbY9
# iimgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUGwyEDKGnIOXsa88Z3dZXdJq+6IIwDQYJKoZIhvcN
# AQEBBQAEggEANG55Yf1K+xOvnqYbXXbe9wV6A2zVrmihyNTpPJOCvjjKFI4cfpSs
# jYcebeNY9twofADmILaW0GyfYPfaHSNYESRVk0D2oNWNdl33XGum4OhQpY79k1wL
# 8OHFIN8f6kOlfCWzDX5U96qWAuJ6qf4znykJqw9Z4aquYzO7oz1xRSqvbqXE+KZQ
# mioxvcSpoVyACWYTPS1FZWx3+45/3KqbJbCI27h2xii8rNjOQqXDj+4tGLMNceFG
# tHH1a56z81QpsqDeKuWPpkm8LNfrTs0oX8K7QFRzP5mnkcFMlp1yeYN0xz7E5iAM
# T89eaKH4yWLf1B30oDYerXSEzQC71jqGbQ==
# SIG # End signature block
