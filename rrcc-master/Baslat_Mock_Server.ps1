<#
.SYNOPSIS
    Roborock Rust Mock Robot Sunucusu Başlatıcı
.DESCRIPTION
    miIO UDP 54321 ve Roborock LAN TCP 58867 portlarında çalışan ultra hızlı
    Rust mock sunucusunu derler (gerekirse) ve canlı paket denetçisiyle başlatır.
#>

[CmdletBinding()]
param(
    [string]$UdpPort = "54321",
    [string]$TcpPort = "58867",
    [string]$Token = "6457713532704e374b56505062715362",
    [string]$Model = "roborock.vacuum.ss09",
    [string]$Mac = "54:48:E6:99:88:77",
    [string]$LogFile = "traffic_log.jsonl",
    [switch]$Release = $true
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RustDir = Join-Path $ScriptDir "roborock_mock_server"
$BinaryPath = Join-Path $RustDir "target\release\roborock_mock_server.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ROBOROCK RUST MOCK ROBOT SUNUCUSU BASLATILIYOR        " -ForegroundColor Cyan -BackgroundColor Black
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Model:    $Model" -ForegroundColor Yellow
Write-Host "MAC:      $Mac" -ForegroundColor Magenta
Write-Host "UDP Port: $UdpPort (miIO Handshake & RPC)" -ForegroundColor Gray
Write-Host "TCP Port: $TcpPort (Roborock LAN LocalClientService)" -ForegroundColor Gray
Write-Host "Token:    $Token" -ForegroundColor Gray
Write-Host "Log File: $LogFile (JSONL formatinda yapilandirilmis kayit)" -ForegroundColor Blue
Write-Host ""

if (-not (Test-Path $BinaryPath)) {
    Write-Host ">> Binary bulunamadi, release derleme yapiliyor..." -ForegroundColor Yellow
    Push-Location $RustDir
    try {
        cargo build --release
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $BinaryPath)) {
    Write-Error "Derleme basarisiz oldu veya binary olusturulamadi: $BinaryPath"
}

Write-Host ">> Mock Sunucu baslatiliyor..." -ForegroundColor Green
& $BinaryPath -u $UdpPort -p $TcpPort -k $Token -m $Model -a $Mac -l $LogFile

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQURyuUBwzoqj1EQYsidBiXx25U
# c8KgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUaCsXZdodhsjA2Hm3wMFODc9xGzQwDQYJKoZIhvcN
# AQEBBQAEggEAK+RSt74+ITljHuBEh/Ig6P7flBRtspKYY8urEA+XRXZLF7RgDwnu
# aKh7KyhRk9g7rCn566g+L6mu+0YC8YWu3j+xEjcA5c1HNZAppurx9aAFlpEr7YxT
# Au8Br4wLeeloIYx5NqH0Fk4Pd0Zf6M0CX+w46A1XeauiH5sxZjnuEen+viu9izPb
# ivhnHqtz2JVGldmSkDOLLzifvMedzDuevGnGJ4da+eAMkO2hSWD10ih8ZL2iGe0y
# +bWB1rZbHwkuLWHXB5XHJmL7Vz0awgfiiQ5ateVywEhrYxnlDI5aVNebH4XQaeSF
# UsKqi4CNQHfZL8aQ+8Z1SW1perbvEtq7vw==
# SIG # End signature block
