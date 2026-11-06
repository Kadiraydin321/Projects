@echo off
chcp 65001 >nul
title Windows Control App ve USB Donanım Sağlığı
color 0B
cd /d "%~dp0"

:menu
cls
echo ===============================================================================
echo            WINDOWS CONTROL APP VE USB DONANIM SAĞLIĞI YÖNETİCİSİ
echo ===============================================================================
echo.
echo   [1] USB Bellek Sağlık ve Disk Teşhis Aracı (usb_health_check.py)
echo   [2] Windows Sistem ve Donanım Yöneticisi (windows_manager.py)
echo   [3] Otonom Hermes Yönetim Ajanı (run_autonomous_hermes.py)
echo   [4] Python Bağımlılıklarını Kontrol Et / Yükle (requirements.txt)
echo   [0] Çıkış
echo.
echo ===============================================================================
set /p secim="Seçiminiz [1/2/3/4/0]: "

if "%secim%"=="1" goto usb_check
if "%secim%"=="2" goto win_mgr
if "%secim%"=="3" goto hermes
if "%secim%"=="4" goto install_req
if "%secim%"=="0" exit /b

echo.
echo [UYARI] Geçersiz seçim!
timeout /t 2 >nul
goto menu

:usb_check
cls
echo ===============================================================================
echo   USB Bellek Sağlık ve Disk Teşhis Aracı Başlatılıyor...
echo ===============================================================================
echo.
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python sisteminizde bulunamadı!
    pause
    goto menu
)
python "%~dp0usb_health_check.py"
echo.
pause
goto menu

:win_mgr
cls
echo ===============================================================================
echo   Windows Sistem ve Donanım Yöneticisi Başlatılıyor...
echo ===============================================================================
echo.
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python sisteminizde bulunamadı!
    pause
    goto menu
)
python "%~dp0windows_manager.py"
echo.
pause
goto menu

:hermes
cls
echo ===============================================================================
echo   Otonom Hermes Yönetim Ajanı Başlatılıyor...
echo ===============================================================================
echo.
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python sisteminizde bulunamadı!
    pause
    goto menu
)
python "%~dp0run_autonomous_hermes.py"
echo.
pause
goto menu

:install_req
cls
echo ===============================================================================
echo   Gerekli Python Paketleri Yükleniyor...
echo ===============================================================================
echo.
pip install -r "%~dp0requirements.txt"
echo.
echo İşlem tamamlandı.
pause
goto menu
