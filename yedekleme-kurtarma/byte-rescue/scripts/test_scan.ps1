# 1. Stop any running ByteRescue instances and Start fresh
Get-Process -Name ByteRescue -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

Write-Host "Starting ByteRescue.exe..."
$proc = Start-Process -FilePath 'C:\Users\Birin\Desktop\ByteRescue\ByteRescue.exe' -PassThru
Start-Sleep -Seconds 2

# 2. Check status
$st = Invoke-RestMethod -Uri "http://127.0.0.1:45678/api/status"
Write-Host "Status: $($st.status), Admin: $($st.isAdmin)"

# 3. Start scan for TestKurtarma
$body = @{
    sourcePath = "C:\Users\Birin\Desktop\TestKurtarma"
    categories = @("all")
    deepCarve = $true
} | ConvertTo-Json

Write-Host "Starting scan for TestKurtarma..."
$scanRes = Invoke-RestMethod -Uri "http://127.0.0.1:45678/api/scan/start" -Method Post -Body $body -ContentType "application/json"
$scanRes | ConvertTo-Json

Start-Sleep -Seconds 3

$stAfter = Invoke-RestMethod -Uri "http://127.0.0.1:45678/api/status"
Write-Host "Scan Status: $($stAfter.status), Files Found: $($stAfter.filesFound)"

# 4. Fetch found files
$files = Invoke-RestMethod -Uri "http://127.0.0.1:45678/api/files"
Write-Host "Found $($files.Count) file(s):"
$files | Select-Object id, name, originalPath, sizeBytes, confidence, statusLabel, isRecoverable | Format-Table -AutoSize

# 5. Recover the deleted file (kurtarilacak_belge.txt)
$targetFile = $files | Where-Object { $_.name -like "*kurtar*" -or $_.name -like "*deneme*" } | Select-Object -First 1

if ($targetFile) {
    Write-Host "Attempting recovery for ID: $($targetFile.id) Name: $($targetFile.name)..."
    $recBody = @{
        fileIds = @($targetFile.id)
        destDir = "C:\Users\Birin\Desktop\ByteRescue_Kurtarilan"
    } | ConvertTo-Json

    $recRes = Invoke-RestMethod -Uri "http://127.0.0.1:45678/api/recover" -Method Post -Body $recBody -ContentType "application/json"
    Write-Host "Recovery Response:"
    $recRes | ConvertTo-Json

    # 6. Verify recovered file content on disk
    $recoveredFilePath = "C:\Users\Birin\Desktop\ByteRescue_Kurtarilan\$($targetFile.name)"
    if (Test-Path $recoveredFilePath) {
        $content = Get-Content $recoveredFilePath -Raw
        Write-Host "=========================================="
        Write-Host "SUCCESS! File recovered: $recoveredFilePath"
        Write-Host "File Content: $content"
        Write-Host "=========================================="
    } else {
        Write-Host "ERROR: File was not found in destination directory!"
    }
} else {
    Write-Host "WARNING: target file was not found in scan results!"
}

# Clean shutdown
Invoke-RestMethod -Uri "http://127.0.0.1:45678/api/exit" -Method Post | Out-Null

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUDqfSyjoA+B3VKQydaxHI9f9l
# 8BmgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQUuP72Bc7HLwk9Elgd2NDWArI5tu0wDQYJKoZIhvcN
# AQEBBQAEggEAUVYdRMvcoe6aiZvBsA3RqcsnkRphB2fvTvn3xgTtpkU9YsddRXMY
# prgRl60x5W9r3/GcKuTLjJCYIPPJXgojNTJPzeqPW9DL21UrKvzownKCo7BSmqYE
# m840TYMj7vpgr5Q6B/jIa9qGSRLP7GdV96yv1rHAFm5NXBF7+72JPnUkz78su1v2
# 28M+14aOPfd8XcwDhmG8nKijcNFyJrEFw6xM7TzNw+JVJUxWI1F9dDnSJx14k7ek
# JzxL3eUmqrg0GrCs72IMSsC4+QIJaCy3z9XN/pwCx48PvRer9GFUlFO/y86S/pAp
# Yuo3zsicmqwHJ6KITHZBCap5h8Ows9igtA==
# SIG # End signature block
