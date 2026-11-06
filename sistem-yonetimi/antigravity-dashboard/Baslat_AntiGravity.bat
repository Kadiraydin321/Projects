@echo off
chcp 65001 >nul
title AntiGravity Dashboard - Liquid Glass PC Yönetimi
color 0B
cd /d "%~dp0"

echo ===============================================================================
echo            ANTIGRAVITY DASHBOARD - LIQUID GLASS PC YÖNETİM MERKEZİ
echo ===============================================================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python sisteminizde bulunamadı veya PATH ortam değişkenine eklenmemiş!
    pause
    exit /b 1
)

:: Flask kurulu mu kontrol et
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo [BİLGİ] Flask ve bağımlılıklar yükleniyor...
    pip install -r requirements.txt
)

echo [BİLGİ] AntiGravity Dashboard başlatılıyor (http://localhost:5000)...
start "" "http://localhost:5000"
python app.py
if %errorlevel% neq 0 (
    echo.
    echo [UYARI] Dashboard sunucusu durdu (Kod: %errorlevel%).
    pause
)
