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
    [string]$Token = "0123456789abcdef0123456789abcdef",
    [string]$Model = "roborock.vacuum.ss09",
    [string]$Mac = "54:48:E6:99:88:77",
    [string]$LogFile = "traffic_log.jsonl",
    [string]$ProxyUpstream = "",
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
if ($ProxyUpstream) {
    Write-Host "Proxy Upstream: $ProxyUpstream (MITM Sniffer Modu)" -ForegroundColor Green
}
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

if ($ProxyUpstream) {
    Write-Host ">> Canlı MITM Proxy baslatiliyor..." -ForegroundColor Green
    & $BinaryPath -u $ProxyUpstream --udp-port $UdpPort -p $TcpPort -k $Token -l $LogFile
} else {
    Write-Host ">> Mock Sunucu baslatiliyor..." -ForegroundColor Green
    & $BinaryPath --udp-port $UdpPort -p $TcpPort -k $Token -m $Model -a $Mac -l $LogFile
}
# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUE9B0Y3XtOKyKBqFIXvbTrcUz
# WuugggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQU1CrqpaeFyK+AKTeOJ/LrHOkgmR4wDQYJKoZIhvcN
# AQEBBQAEggEAL7H99ctkPdKOF3n0uDAU8fsT8SynuUjtzpSmEETSdCulbYI58Ytm
# 3Pbscprpg2DR7bt0FL54RGyJ9smj7v5FSsiPA3UURS5IpL1WbgZc+2tySqp4pOPk
# gubtsf+YB9SxJsCK281ZXQ/2JRZfhzarJVIqk5O96Ct1ulvrmtmGWEbre9KUgioJ
# hKjObPLuoyo6MAmiMS/3LgvXo8H2eK7lckw4OeRHdLpNKQxUB10CWglKQiawTjgi
# ZLd0RQm1BTZ3CDEXQmIRnBROKw5qbqIpg9uaHmHB1PxH2d1Gp5oKtiEPnHQxnAeA
# 2WIXOMRF1uPSxbBSJfCQXtHe034X21Pzig==
# SIG # End signature block
