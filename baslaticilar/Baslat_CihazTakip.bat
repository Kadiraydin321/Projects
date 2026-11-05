@echo off
chcp 65001 >nul
title Cihaz Takip - Hızlı Başlatıcı
color 0B
cd /d "%~dp0..\araclar-ve-servisler\cihaz-takip"
if exist "Baslat_CihazTakip.bat" (
    call Baslat_CihazTakip.bat %*
) else (
    npm run dev
)
