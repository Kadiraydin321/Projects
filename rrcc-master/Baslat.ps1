$cert = Get-Item "Cert:\CurrentUser\My\18BDDE60A34E2F5E2AF49A9420F71C55445DE6F4"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Roborock Q8 Max Pro - Temizlik Başlatıcı   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "IP: 192.168.1.44 | Token: 6457713532704e374b56505062715362" -ForegroundColor Gray

python "$PSScriptRoot\start_cleaning.py"

Write-Host "`nİsteğe bağlı olarak RoboRock Control Center arayüzü başlatılıyor..." -ForegroundColor Yellow
Start-Process "$PSScriptRoot\rrcc.exe"

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUmMsJxlOBYEkmheZ4Rmg/Avel
# S1egggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUqu7py6UnIvdJooBai2gO8ZSTEBwwDQYJKoZIhvcN
# AQEBBQAEggEAVnKDbWNNoZTkqyZnWbWgxoZVgbPyKEF8bu+IF+et1ICn6/DvJUvW
# A+u0Lxh0juw/pxSVfBBQBVoOtJUv5TMdlUnyieIIfrXnki5tzvImTLylJsHn4mlm
# trM2rXgWwwudThAxTzPhOTIen1/BL0KS2BTOmwSlJOR0H0IH9CbO9sddPpgx2w36
# 9l53Qkm1gxCtuI5kfB7S7RIZlEAn/g7iu4o1Nc/yLD+oNKm4nhrghX+MPbAV12Fj
# p0VQvtrugvH0jgBw/pg9GsBamF4E6UwSGT5QHq5aDgEC8Ybcu4GNbQCWs5DE8Bbx
# Vq54xCCl2zaH6bnTLwKf6q1vq5RFxaFhzg==
# SIG # End signature block
