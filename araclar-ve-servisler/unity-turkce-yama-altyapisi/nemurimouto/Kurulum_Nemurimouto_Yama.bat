@echo off
chcp 65001 >nul
title Nemurimouto Turkce Yama Kurulumu
echo Nemurimouto Turkce Yama Yapilandirmasi Baslatiliyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kurulum_Nemurimouto_Yama.ps1"
pause
