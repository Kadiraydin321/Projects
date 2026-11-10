@echo off
chcp 65001 >nul
title ByteRescue by Kadir - Veri Kurtarma Laboratuvarı
color 0B
cd /d "%~dp0"

echo ==========================================================
echo    ⚡ BYTERESCUE by Kadir - Veri Kurtarma Laboratuvarı
echo ==========================================================
echo.

if exist "%~dp0ByteRescue.exe" (
    echo [1/3] Taşınabilir ByteRescue.exe başlatılıyor...
    start "" "%~dp0ByteRescue.exe"
    exit /b
)

if exist "%~dp0release\win-unpacked\ByteRescue.exe" (
    echo [2/3] Paketlenmiş sürüm başlatılıyor...
    start "" "%~dp0release\win-unpacked\ByteRescue.exe"
    exit /b
)

if exist "%~dp0node_modules\.bin\electron.cmd" (
    echo [3/3] Node / Electron üzerinden başlatılıyor...
    call npm start
    exit /b
)

if exist "%~dp0ByteRescue_Kurulum.exe" (
    echo [BİLGİ] Kurulum paketi başlatılıyor: ByteRescue_Kurulum.exe
    start "" "%~dp0ByteRescue_Kurulum.exe"
    exit /b
)

echo [HATA] Çalıştırılabilir dosya bulunamadı.
echo Lütfen ByteRescue.exe veya ByteRescue_Kurulum.exe dosyasını kontrol edin.
pause
