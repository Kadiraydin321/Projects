@echo off
chcp 65001 >nul
title Screen Translator AI (Google Lens Modu)
color 0B
cd /d "%~dp0"

echo ===============================================================================
echo            SCREEN TRANSLATOR AI (GOOGLE LENS MODU VE CANLI ÇEVİRİ)
echo ===============================================================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python sisteminizde bulunamadı veya PATH ortam değişkenine eklenmemiş!
    echo Lütfen https://www.python.org adresinden Python kurun.
    pause
    exit /b 1
)

if not exist "%~dp0run_translator.py" (
    echo [HATA] 'run_translator.py' dosyası bulunamadı!
    pause
    exit /b 1
)

echo [BİLGİ] Screen Translator AI başlatılıyor...
python "%~dp0run_translator.py"
if %errorlevel% neq 0 (
    echo.
    echo [UYARI] Uygulama bir hata kodu ile kapandı (%errorlevel%).
    echo Bağımlılıkları kontrol etmek için: pip install -r translator_requirements.txt
    pause
)
