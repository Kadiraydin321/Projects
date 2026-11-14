<#
.SYNOPSIS
    Roborock Ekosistemi Merkezi Başlatıcı
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Roborock Q8 Max Pro - Kontrol Ekosistemi    " -ForegroundColor Cyan -BackgroundColor Black
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Hedef Robot: Yapilandirilmis IP & Token (.env / Ortam Degiskeni)" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Modern Web Hub Kontrol Merkezini Baslat (FastAPI + Three.js 3D)" -ForegroundColor Yellow
Write-Host "2. Canli MITM Sniffer / Proxy Sunucusunu Baslat (Rust Tokio)" -ForegroundColor Green
Write-Host "3. Bagimsiz Rust Mock Robot Sunucusunu Baslat" -ForegroundColor Magenta
Write-Host "4. Hizli Temizlik Baslat (start_cleaning.py)" -ForegroundColor White
Write-Host ""

$secim = Read-Host "Lutfen bir secim yapin [1-4] (Varsayilan: 1)"
if (-not $secim) { $secim = "1" }

switch ($secim) {
    "1" {
        & (Join-Path $ScriptDir "Baslat_Web.ps1")
    }
    "2" {
        & (Join-Path $ScriptDir "Baslat_Proxy_Server.ps1")
    }
    "3" {
        & (Join-Path $ScriptDir "Baslat_Mock_Server.ps1")
    }
    "4" {
        python (Join-Path $ScriptDir "start_cleaning.py")
    }
    default {
        Write-Host "Gecersiz secim!" -ForegroundColor Red
    }
}
# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQU7ruG526vYbmXztKgW1ma8jb6
# ED6gggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUaFyEdniKe1Mh2ji80HJmmjh0T7UwDQYJKoZIhvcN
# AQEBBQAEggEAgpWQnUh/ZI7yaqRsQ+hj/vicobRcG1CMaZd1oqG9s4JWuAC9sdWk
# 6wQYwf3lzn5btd9RHnTSPCtvq7UUD/j0e+9mDPakUu6Dt3uMja4MDLxxmSJRQAXs
# +OqzWMT5rFrbu0IIQtoYmUcRH4/PQp85an4n+CkRwmWj8FcX8MBtMUhbEZVzN8Iu
# xXKMiQUBzmcFov+n7gJjkMU/DYXpwr6i5F+r6MHHb9/d9GFkApJqMl1hZCvYCZEf
# aaTDjaXWhiqCC9lti2oa2uc+K4NPATHZyB38iX3j9ZbJ+DxqWXDTIQ7xVIs9vhYj
# DMC9/6w5YRpiPsIAgL2wWr2lAvVuqg9lEQ==
# SIG # End signature block
