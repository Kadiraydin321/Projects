@echo off
chcp 65001 >nul
title Wi-Fi Sync Tester - Hızlı Başlatıcı
color 0A
cd /d "%~dp0..\araclar-ve-servisler\wifi-sync-tester"
if exist "Test_WiFi_Sync.bat" (
    call Test_WiFi_Sync.bat %*
) else (
    node index.js --mock
)
