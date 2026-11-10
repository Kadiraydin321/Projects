# Antigravity Update & Safe Shutdown Script
# Bu script kullanıcının talimatı doğrultusunda Antigravity'yi sessizce günceller ve sistemi güvenli şekilde kapatır.

$logFile = "C:\Users\Birin\AppData\Local\antigravity-updater\update_shutdown.log"
function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $message"
    Write-Output $entry
    Add-Content -Path $logFile -Value $entry -ErrorAction SilentlyContinue
}

Write-Log "Guncelleme scripti baslatildi. Orkestratorun yaniti iletebilmesi ve kullanicinin gorebilmesi icin 20 saniye bekleniyor..."
Start-Sleep -Seconds 20

Write-Log "Antigravity ve language_server surecleri sonlandiriliyor..."
Get-Process | Where-Object { $_.ProcessName -like '*antigravity*' -or $_.ProcessName -eq 'language_server' } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Log "Dosya kilitlerinin kalkmasi icin 3 saniye bekleniyor..."
Start-Sleep -Seconds 3

$installer = "C:\Users\Birin\AppData\Local\antigravity-updater\pending\Antigravity-x64.exe"

if (Test-Path $installer) {
    Write-Log "NSIS yukleyicisi sessiz modda (/S) calistiriliyor: $installer"
    $process = Start-Process -FilePath $installer -ArgumentList "/S" -Wait -PassThru
    Write-Log "Yukleyici tamamlandi. Cikis kodu: $($process.ExitCode)"
} else {
    Write-Log "HATA: Guncelleyici dosya bulunamadi: $installer"
}

Write-Log "Kullanici talimati dogrultusunda sistem guvenli kapatiliyor (10 saniye)..."
& shutdown.exe /s /t 10 /c "Antigravity guncellemesi tamamlandi. Sistem guvenli sekilde kapatiliyor."
Write-Log "Kapatma komutu iletildi."

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUX8NjuyPaHy5SJQ2ciGLpN+e4
# BO6gggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUmY/eYZ6PTejPqxFM5Zx/pXn5wyUwDQYJKoZIhvcN
# AQEBBQAEggEAltcfhCBnBYkRud/BfYfvgx0fHj6sXkwURjIZFv+xcAoj/JG1cFRG
# 14Ig6NfhqSJKQgn6hTgdH32QROZVuhtfTpUOwZuoqu4XpE7cifPIYd1NPtDoEcTO
# ZZrNhhnHBW+NacfT4MCEYagLwnuUjxgrZCOygbueMSrsKQIEVeig/AU61g3rJyIi
# 7WA92An6PVmNL3Ww7alDjY8xbssjhQgqAfiwm8HURg5XqYqaoerlwYFUvY65f9L0
# Q+4KHci6OZ38xkbm6QIyPP5L9JZ28XOlfpiQmSnp5rB9jL9rTTtJfRjF/HfXPDL+
# 7z+ZT4oQnYH5iHqW5W/94e/rp+gadpwtlg==
# SIG # End signature block
