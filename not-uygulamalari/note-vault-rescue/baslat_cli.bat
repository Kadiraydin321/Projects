@echo off
chcp 65001 >nul
title NoteVault Kurtarma Araci - Terminal (CLI)
cd /d "%~dp0"

echo ==========================================================
echo     🔐 NoteVault Sifre Kurtarici ^& Kasa Acici (CLI)
echo ==========================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python bulunamadi! Lutfen python.org adresinden Python 3 kurun.
    echo Kurulum sirasinda "Add Python to PATH" secenegini isaretlemeyi unutmayin.
    echo.
    pause
    exit /b
)

python -c "import cryptography" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Gerekli 'cryptography' kutuphanesi yukleniyor...
    pip install cryptography
    if %errorlevel% neq 0 (
        echo [HATA] Kutuphane yuklenemedi. Lutfen internet baglantinizi kontrol edin.
        pause
        exit /b
    )
    echo [OK] Kutuphane basariyla kuruldu.
    echo.
)

REM Eger bir .notevault dosyasi bu .bat dosyasinin uzerine suruklenip birakildiysa:
if not "%~1"=="" (
    echo Secilen dosya: "%~1"
    python cli.py "%~1"
) else (
    REM Normal cift tiklanarak calistirildiginda etkilesimli soru-cevap modu:
    python cli.py
)

echo.
echo ==========================================================
echo Islem tamamlandi. Pencereyi kapatmak icin bir tusa basin...
echo ==========================================================
pause >nul
