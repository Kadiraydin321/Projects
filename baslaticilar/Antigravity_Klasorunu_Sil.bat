@echo off
chcp 65001 >nul
title Boş AntiGravity Klasörünü Silme Aracı
color 0C
cd /d "%~dp0..\..\"
echo [BILGI] C:\Users\Birin\Birin\AntiGravity klasorunu silme deneniyor...
rmdir /s /q "AntiGravity" 2>nul
if exist "AntiGravity" (
    echo [UYARI] Klasor su anda IDE veya bir surec tarafindan kullanildigi icin silinemedi.
    echo IDE oturumunu kapattiktan sonra bu betigi tekrar calistiriniz.
) else (
    echo [BASARILI] AntiGravity klasoru tamamen silindi!
)
pause
