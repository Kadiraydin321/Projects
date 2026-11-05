@echo off
chcp 65001 >nul
title AntiGravity Dashboard - Hızlı Başlatıcı
color 0B
cd /d "%~dp0..\sistem-yonetimi\antigravity-dashboard"
if exist "Baslat_AntiGravity.bat" (
    call Baslat_AntiGravity.bat %*
) else (
    python app.py
)
