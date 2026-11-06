@echo off
chcp 65001 >nul
title WinControlHub - Windows Kontrol Merkezi
color 0B
cd /d "%~dp0"

:menu
cls
echo ===============================================================================
echo                     WINCONTROLHUB - WINDOWS KONTROL MERKEZİ
echo ===============================================================================
echo.
echo   [1] Python Çalışma Ortamını Doğrula (Venv / Python Sürümü)
echo   [2] WinControlHub Modüllerini Listele
echo   [3] Kardeş Servis: Windows Control App Başlat
echo   [0] Çıkış
echo.
echo ===============================================================================
set /p secim="Seçiminiz [1/2/3/0]: "

if "%secim%"=="1" goto check_env
if "%secim%"=="2" goto list_modules
if "%secim%"=="3" goto launch_control_app
if "%secim%"=="0" exit /b

echo.
echo [UYARI] Geçersiz seçim!
timeout /t 2 >nul
goto menu

:check_env
cls
echo ===============================================================================
echo   Python Ortam Bilgisi
echo ===============================================================================
echo.
where python
python --version
echo.
pause
goto menu

:list_modules
cls
echo ===============================================================================
echo   Mevcut Dosyalar ve Klasörler:
echo ===============================================================================
echo.
dir /b "%~dp0"
echo.
pause
goto menu

:launch_control_app
cls
if exist "%~dp0..\windows-control-app\Baslat_WindowsControlApp.bat" (
    call "%~dp0..\windows-control-app\Baslat_WindowsControlApp.bat"
) else (
    echo [UYARI] windows-control-app başlatıcısı bulunamadı.
    pause
)
goto menu
