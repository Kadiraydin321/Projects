@echo off
chcp 65001 >nul
title NoteVault Sifre Kurtarici ve Kasa Acici
cd /d "%~dp0"

echo ==========================================================
echo     🔐 NoteVault Sifre Kurtarici ^& Kasa Acici
echo ==========================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Hata: Python bulunamadi! Lutfen python.org adresinden Python kurun.
    pause
    exit /b
)

python -c "import cryptography" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] 'cryptography' kutuphanesi yukleniyor...
    pip install cryptography
)

echo [*] Web arayuzu baslatiliyor...
python app.py
pause
