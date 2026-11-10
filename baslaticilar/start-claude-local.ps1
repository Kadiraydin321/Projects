<#
.SYNOPSIS
    Claude Code (LiteLLM Yerel Kopru) Hizli Baslatici (VRAM Mutex Destekli)
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
    & $ManagerPath -Agent claude @LauncherArgs
} else {
    & $ManagerPath -Agent claude
}

# SIG # Begin signature block
# MIIFhQYJKoZIhvcNAQcCoIIFdjCCBXICAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUncxSz5tBuJOeTKxE6OI+QfR8
# UKSgggMYMIIDFDCCAfygAwIBAgIQI76FdVX6bLBILiWSYrJGYjANBgkqhkiG9w0B
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
# FTAjBgkqhkiG9w0BCQQxFgQU35CJzDTL0AjgbDPkEx18xRz+Pp8wDQYJKoZIhvcN
# AQEBBQAEggEALnUKQ6zDi1eQe5wUllvLN6UysK3cJ7NxDs7j3iy5IlZbGp/B0rwx
# dgm6knw0t8HiGK3SeWNBlpGDLeyRPaer2B/wU4LGlWDFGp7vEEpVYl+oRguaruml
# zlsz6Cpzl/EorrVX8zQKvbel1QqVxZVKDre135Ow5Ra5yALMzlSiPAjN2obLGcrB
# WtpiAyC6vB19i7dTmrHfpGi+SGmL5pAnBiMC2fcXhkQS45aCrota/E1/ZzB/KGil
# EKP3FCH68iLziXYeDMr6eAadeewVbrxCmWDZaApx2tlirbn4jxkJPO59WwDxlSyC
# vfF3DAe93oqrSwp+m8Clw6HUNuat6/g1yg==
# SIG # End signature block
