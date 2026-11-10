@echo off
chcp 65001 >nul
title Granblue Fantasy Relink - Eksik Dosya Kopyalayici (A -> B)
color 0B

echo ======================================================================
echo   GRANBLUE FANTASY RELINK - EKSIK DOSYA TAMAMLAMA
echo ======================================================================
echo.
echo Kaynak (A) : C:\Games\Granblue Fantasy - Relink
echo Hedef  (B) : D:\Games\Granblue Fantasy Relink
echo.
echo Bu islem:
echo  1. B hedef klasorunde olmayan eksik dosyalari tespit eder.
echo  2. Sadece eksik olan dosyalari A'dan B'ye KOPYALAR (kes-yapistir yapmaz).
echo  3. B klasorundeki ekstra mod/yama/reshade dosyalarina dokunmaz.
echo.
echo ======================================================================
echo.

set /p secim="Eksik dosyalari kopyalamak istiyor musunuz? (E/H): "
if /i not "%secim%"=="E" (
    echo.
    echo Islem iptal edildi.
    pause
    exit /b
)

echo.
echo [ISLEM] PowerShell kopyalama motoru baslatiliyor...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kopyala-EksikGBFR.ps1"

echo.
echo Islem tamamlandi.
pause
