@echo off
chcp 65001 >nul
title ByteRescue - Hızlı Başlatıcı
color 0B
cd /d "%~dp0..\yedekleme-kurtarma\byte-rescue"
if exist "ByteRescue.exe" (
    start ByteRescue.exe
) else if exist "Baslat_ByteRescue.bat" (
    call Baslat_ByteRescue.bat %*
) else (
    npm run dev
)
