@echo off
chcp 65001 >nul
title PROJELER MERKEZİ KONTROL PANELİ
color 0B
cd /d "%~dp0"
set "ROOT=%~dp0..\"

:menu
cls
echo ===================================================================================================
echo               🚀 PROJELER KONTROL MERKEZİ - BİRİNCİL ÇALIŞMA ALANI YÖNETİM PANELİ
echo ===================================================================================================
echo   Konum: %~dp0                                                Sistem: Windows 11
echo ---------------------------------------------------------------------------------------------------
echo.
echo   📂 [1] NOT VE GÜVENLİK UYGULAMALARI
echo     [1]  Not Defterim Desktop       (Kotlin Compose / Electron Zengin Not Platformu)
echo     [2]  NoteVault Rescue           (AES-256 PBKDF2 Şifreli Kasa Kurtarma ve Parola Çözücü)
echo.
echo   📂 [2] SİSTEM VE DONANIM YÖNETİMİ
echo     [3]  AntiGravity Dashboard      (Liquid Glass PC İzleme ve Güç Yönetimi - Flask Web UI)
echo     [4]  WinControlHub              (Windows Kontrol Merkezi ve Donanım Servisi)
echo     [5]  Windows Control App        (USB Donanım Sağlığı, Disk Teşhis ve Onarım Aracı)
echo.
echo   📂 [3] YEDEKLEME VE VERİ KURTARMA
echo     [6]  ByteRescue                 (Siber Temalı Raw Sektör ve İmzalı Veri Kurtarma Laboratuvarı)
echo     [7]  OmniBackup Transfer        (Yerel Wi-Fi Android Depolama ve WhatsApp Yedekleme Sunucusu)
echo.
echo   📂 [4] ARAÇLAR VE SERVİSLER
echo     [8]  Cihaz Takip Portalı        (Next.js 16 + Prisma + SQLite Kurumsal Envanter Sistemi)
echo     [9]  Screen Translator AI       (Google Lens Modu ve Şeffaf HUD Ekran Çevirisi)
echo     [10] Moon Novel Downloader      (Web ve Light Novel İndirici, EPUB Dönüştürücü)
echo     [11] Kampüs Kutusu (Yusuf)      (Akdeniz Üni Öğrenci ve Eşya Takip Web Portalı)
echo     [12] Wi-Fi Sync Test Paketi     (Gelişmiş LAN Senkronizasyon ve Otomatik Doğrulama Çerçevesi)
echo.
echo   ⚙️ HIZLI ERİŞİM VE YARDIMCI ARAÇLAR
echo     [A]  APK Deposu Klasörünü Aç    (Hazır Derlenmiş Android APK Paketleri)
echo     [R]  Kapsamlı Rehberi Oku       (PROJELER_REHBERI.md Dokümantasyonu)
echo     [S]  WSL Senkronizasyon Aracı   (Transfer_Projeler.bat)
echo     [W]  Çalışma Alanı Manifestosu  (WORKSPACE.md)
echo     [0]  Çıkış
echo ===================================================================================================
set "secim="
set /p secim="Lütfen başlatmak istediğiniz projeyi seçin [1-12, A/R/S/W/0]: "
if defined secim set "secim=%secim: =%"

if "%secim%"=="1" goto launch_1
if "%secim%"=="2" goto launch_2
if "%secim%"=="3" goto launch_3
if "%secim%"=="4" goto launch_4
if "%secim%"=="5" goto launch_5
if "%secim%"=="6" goto launch_6
if "%secim%"=="7" goto launch_7
if "%secim%"=="8" goto launch_8
if "%secim%"=="9" goto launch_9
if "%secim%"=="10" goto launch_10
if "%secim%"=="11" goto launch_11
if "%secim%"=="12" goto launch_12

if /i "%secim%"=="A" goto launch_apk
if /i "%secim%"=="R" goto launch_guide
if /i "%secim%"=="S" goto launch_sync
if /i "%secim%"=="W" goto launch_workspace
if "%secim%"=="0" goto exit_panel

echo.
echo [UYARI] Geçersiz seçim: "%secim%"! Lütfen listedeki seçeneklerden birini girin.
timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul
goto menu

:: -----------------------------------------------------------------------------
:: Proje Başlatıcı Yönlendirmeleri
:: -----------------------------------------------------------------------------

:launch_1
set "T_NAME=Not Defterim Desktop"
set "T_DIR=%ROOT%not-uygulamalari\not-defterim"
set "T_BAT=%T_DIR%\Baslat_NotDefterim_Desktop.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%ROOT%NoteApp"
    set "T_BAT=%T_DIR%\Baslat_NotDefterim_Desktop.bat"
)
goto do_launch

:launch_2
set "T_NAME=NoteVault Rescue"
set "T_DIR=%ROOT%not-uygulamalari\note-vault-rescue"
set "T_BAT=%T_DIR%\baslat.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0NoteVaultRescue"
    set "T_BAT=%T_DIR%\baslat.bat"
)
goto do_launch

:launch_3
set "T_NAME=AntiGravity Dashboard"
set "T_DIR=%ROOT%sistem-yonetimi\antigravity-dashboard"
set "T_BAT=%T_DIR%\Baslat_AntiGravity.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0AntiGravity_Dashboard"
    set "T_BAT=%T_DIR%\Baslat_AntiGravity.bat"
)
goto do_launch

:launch_4
set "T_NAME=WinControlHub"
set "T_DIR=%ROOT%sistem-yonetimi\win-control-hub"
set "T_BAT=%T_DIR%\Baslat_WinControlHub.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0WinControlHub"
    set "T_BAT=%T_DIR%\Baslat_WinControlHub.bat"
)
goto do_launch

:launch_5
set "T_NAME=Windows Control App"
set "T_DIR=%ROOT%sistem-yonetimi\windows-control-app"
set "T_BAT=%T_DIR%\Baslat_WindowsControlApp.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0WindowsControlApp"
    set "T_BAT=%T_DIR%\Baslat_WindowsControlApp.bat"
)
goto do_launch

:launch_6
set "T_NAME=ByteRescue"
set "T_DIR=%ROOT%yedekleme-kurtarma\byte-rescue"
set "T_BAT=%T_DIR%\Baslat_ByteRescue.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%ROOT%ByteRescue"
    set "T_BAT=%T_DIR%\Baslat_ByteRescue.bat"
)
goto do_launch

:launch_7
set "T_NAME=OmniBackup Transfer"
set "T_DIR=%ROOT%yedekleme-kurtarma\omni-backup-transfer"
set "T_BAT=%T_DIR%\Baslat_OmniBackupTransfer.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0OmniBackupTransfer"
    set "T_BAT=%T_DIR%\Baslat_OmniBackupTransfer.bat"
)
goto do_launch

:launch_8
set "T_NAME=Cihaz Takip Sistemi"
set "T_DIR=%ROOT%araclar-ve-servisler\cihaz-takip"
set "T_BAT=%T_DIR%\Baslat_CihazTakip.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%ROOT%cihaz-takip"
    set "T_BAT=%T_DIR%\Baslat_CihazTakip.bat"
)
goto do_launch

:launch_9
set "T_NAME=Screen Translator AI"
set "T_DIR=%ROOT%araclar-ve-servisler\screen-translator"
set "T_BAT=%T_DIR%\Baslat_ScreenTranslator.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0screen_translator"
    set "T_BAT=%T_DIR%\Baslat_ScreenTranslator.bat"
)
goto do_launch

:launch_10
set "T_NAME=Moon Novel Downloader"
set "T_DIR=%ROOT%araclar-ve-servisler\moon-novel-downloader"
set "T_BAT=%T_DIR%\Baslat_MoonNovelDownloader.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0MoonNovelDownloaderApp"
    set "T_BAT=%T_DIR%\Baslat_MoonNovelDownloader.bat"
)
goto do_launch

:launch_11
set "T_NAME=Kampüs Kutusu (Yusuf)"
set "T_DIR=%ROOT%araclar-ve-servisler\kampus-kutusu"
set "T_BAT=%T_DIR%\Baslat_KampusKutusu.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%~dp0Yusuf"
    set "T_BAT=%T_DIR%\Baslat_KampusKutusu.bat"
)
goto do_launch

:launch_12
set "T_NAME=Wi-Fi Sync Test Paketi"
set "T_DIR=%ROOT%araclar-ve-servisler\wifi-sync-tester"
set "T_BAT=%T_DIR%\run_tests.bat"
if not exist "%T_BAT%" (
    set "T_DIR=%ROOT%tools_sync_tester"
    set "T_BAT=%T_DIR%\run_tests.bat"
)
goto do_launch

:do_launch
if not exist "%T_BAT%" (
    echo.
    echo [HATA] '%T_NAME%' başlatıcı dosyası bulunamadı!
    echo Aranan yol: %T_BAT%
    echo.
    pause
    goto menu
)
echo.
echo [BİLGİ] '%T_NAME%' ayrı bir pencerede başlatılıyor...
start "%T_NAME%" /d "%T_DIR%" cmd /k "call ""%T_BAT%"""
timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul
goto menu

:: -----------------------------------------------------------------------------
:: Ekstra Seçenekler
:: -----------------------------------------------------------------------------

:launch_apk
cls
set "APK_DIR=%ROOT%araclar-ve-servisler\apk-deposu"
if not exist "%APK_DIR%" set "APK_DIR=%ROOT%APK_Cikti"
if exist "%APK_DIR%" (
    echo [BİLGİ] APK deposu klasörü Windows Gezgini'nde açılıyor:
    echo %APK_DIR%
    explorer.exe "%APK_DIR%"
) else (
    echo [UYARI] APK deposu klasörü bulunamadı.
)
timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul
goto menu

:launch_guide
cls
if exist "%ROOT%PROJELER_REHBERI.md" (
    echo [BİLGİ] 'PROJELER_REHBERI.md' açılıyor...
    start "" "%ROOT%PROJELER_REHBERI.md"
) else (
    echo [UYARI] 'PROJELER_REHBERI.md' bulunamadı.
)
timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul
goto menu

:launch_sync
cls
if exist "%ROOT%Transfer_Projeler.bat" (
    echo [BİLGİ] WSL Transfer ve Senkronizasyon aracı başlatılıyor...
    start "WSL Projeler Senkronizasyonu" /d "%~dp0" cmd /k "call ""%ROOT%Transfer_Projeler.bat"""
) else (
    echo [UYARI] 'Transfer_Projeler.bat' bulunamadı.
)
timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul
goto menu

:launch_workspace
cls
if exist "%ROOT%WORKSPACE.md" (
    echo [BİLGİ] 'WORKSPACE.md' açılıyor...
    start "" "%ROOT%WORKSPACE.md"
) else (
    echo [UYARI] 'WORKSPACE.md' bulunamadı.
)
timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul
goto menu

:exit_panel
cls
echo ===================================================================================================
echo   Projeler Kontrol Paneli kapatılıyor. İyi çalışmalar dileriz!
echo ===================================================================================================
timeout /t 1 >nul 2>&1 || ping -n 2 127.0.0.1 >nul
exit /b 0