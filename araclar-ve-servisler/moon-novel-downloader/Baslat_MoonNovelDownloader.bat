@echo off
chcp 65001 >nul
title Moon Novel Downloader - Light Novel İndirici
color 0B
cd /d "%~dp0"

:menu
cls
echo ===============================================================================
echo            MOON NOVEL DOWNLOADER - LIGHT NOVEL İNDİRİCİ VE EPUB DÖNÜŞTÜRÜCÜ
echo ===============================================================================
echo.
echo   [1] Hazır Derlenmiş APK Dosyasını Aç / Klasörde Göster
echo   [2] ADB ile Bağlı Telefona Doğrudan Yükle (adb install -r)
echo   [3] Gradle ile Projeyi Derle (assembleRelease)
echo   [4] Projeyi Android Studio ile Aç
echo   [5] Bağlı Android Cihazları Listele (adb devices)
echo   [0] Çıkış
echo.
echo ===============================================================================
set /p secim="Seçiminiz [1/2/3/4/5/0]: "

if "%secim%"=="1" goto show_apk
if "%secim%"=="2" goto adb_install
if "%secim%"=="3" goto build_gradle
if "%secim%"=="4" goto open_studio
if "%secim%"=="5" goto check_devices
if "%secim%"=="0" exit /b

echo.
echo [UYARI] Geçersiz seçim!
timeout /t 2 >nul
goto menu

:show_apk
cls
set "APK_PATH="
if exist "%~dp0..\apk-deposu\NovelReaderDownloader.apk" set "APK_PATH=%~dp0..\apk-deposu\NovelReaderDownloader.apk"
if not defined APK_PATH if exist "%~dp0app\build\outputs\apk\release\app-release.apk" set "APK_PATH=%~dp0app\build\outputs\apk\release\app-release.apk"

if defined APK_PATH (
    echo [BİLGİ] APK Dosyası Bulundu:
    echo %APK_PATH%
    echo.
    explorer.exe /select,"%APK_PATH%"
) else (
    echo [UYARI] Hazır APK bulunamadı. Lütfen önce derleme yapın veya apk-deposu klasörünü kontrol edin.
)
pause
goto menu

:adb_install
cls
echo ===============================================================================
echo   Telefona APK Yükleme (ADB)
echo ===============================================================================
echo.
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] 'adb' komutu sistemde bulunamadı!
    pause
    goto menu
)
set "APK_PATH="
if exist "%~dp0..\apk-deposu\NovelReaderDownloader.apk" set "APK_PATH=%~dp0..\apk-deposu\NovelReaderDownloader.apk"
if not defined APK_PATH if exist "%~dp0app\build\outputs\apk\release\app-release.apk" set "APK_PATH=%~dp0app\build\outputs\apk\release\app-release.apk"

if not defined APK_PATH (
    echo [HATA] Yüklenecek APK dosyası bulunamadı!
    pause
    goto menu
)
echo [İŞLEM] APK telefona yükleniyor: %APK_PATH%
adb install -r "%APK_PATH%"
echo.
pause
goto menu

:build_gradle
cls
echo ===============================================================================
echo   Gradle ile Release APK Derleniyor...
echo ===============================================================================
echo.
if exist "%~dp0gradlew.bat" (
    call "%~dp0gradlew.bat" assembleRelease
) else (
    echo [HATA] 'gradlew.bat' bulunamadı!
)
echo.
pause
goto menu

:open_studio
cls
echo [BİLGİ] Android Studio açılıyor...
start "" "%~dp0"
timeout /t 2 >nul
goto menu

:check_devices
cls
echo ===============================================================================
echo   Bağlı Android Cihazlar (adb devices):
echo ===============================================================================
echo.
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] 'adb' komutu bulunamadı!
) else (
    adb devices -l
)
echo.
pause
goto menu
