@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%~1"=="" (
    if exist "%~dp0Test_WiFi_Sync.bat" (
        call "%~dp0Test_WiFi_Sync.bat"
    ) else (
        node "%~dp0index.js"
    )
) else (
    node "%~dp0index.js" %*
)
