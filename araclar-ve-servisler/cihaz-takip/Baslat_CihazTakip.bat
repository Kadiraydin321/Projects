@echo off
title Cihaz Takip Yoneticisi
color 0B
cd /d "%~dp0"

:menu
cls
echo ==========================================
echo        CIHAZ TAKIP YONETIM MENUSU
echo ==========================================

:: 3000 portunu (Next.js) kullanan gorevin PID (Islem Numarasi) bilgisini bulur
set "PID="
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do set PID=%%a

if defined PID (
    echo Durum    : [ CALISIYOR ]
    echo Baglanti : http://localhost:3000
    echo (Tarayicidan yukaridaki linke Ctrl+Tiklayarak veya kopyalayarak girebilirsiniz)
) else (
    echo Durum    : [ KAPALI ]
)

echo ==========================================
echo.
echo [1] Baslat (Uygulamayi calistirir)
echo [0] Durdur (Calisan uygulamayi kapatir)
echo [E] Cikis  (Bu menuyu kapatir)
echo.
set /p secim="Seciminiz (1/0/E): "
if defined secim set "secim=%secim: =%"

if "%secim%"=="1" goto baslat
if "%secim%"=="0" goto durdur
if /i "%secim%"=="E" goto cikis

echo Gecersiz secim!
timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul
goto menu

:baslat
if defined PID (
    echo.
    echo Sunucu zaten calisiyor! Lutfen once tarayicidan girmeyi deneyin.
    timeout /t 3 >nul 2>&1 || ping -n 4 127.0.0.1 >nul
    goto menu
)
echo.
echo Sunucu baslatiliyor... Lutfen bekleyin.
:: Uygulamayi /k (pencereyi acik tut) parametresiyle baslatir
start "CihazTakip_Sunucu" cmd /k "cd /d """%~dp0""" && title CihazTakip_Sunucu && echo Cihaz Takip sunucusu calisiyor... Kapatmak icin yonetici menusunden 0'i tuslayin. && echo. && npm run dev"
echo.
echo Baslatma komutu gonderildi. (Acilan siyah ekranda loglari gorebilirsiniz)
timeout /t 4 >nul 2>&1 || ping -n 5 127.0.0.1 >nul
goto menu

:durdur
if defined PID (
    echo.
    echo Sunucu (PID: %PID%) kapatiliyor...
    :: Arka planda asili kalan Node.js uygulamasini (PID'den bularak) tamamen sonlandirir
    taskkill /F /PID %PID% >nul 2>&1
    :: Eger loglari gosteren siyah cmd penceresi hala aciksa onu da kapatir
    taskkill /FI "WINDOWTITLE eq CihazTakip_Sunucu*" /F >nul 2>&1
    echo.
    echo Sunucu basariyla durduruldu!
) else (
    echo.
    echo Zaten calisan bir sunucu bulunamadi.
)
timeout /t 3 >nul 2>&1 || ping -n 4 127.0.0.1 >nul
goto menu

:cikis
exit
