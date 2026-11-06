@echo off
chcp 65001 >nul
title Factorial Omega Turkce Yama Kurulumu
echo Factorial Omega Turkce Yama Yapilandirmasi Baslatiliyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kurulum_FactorialOmega_Yama.ps1"
pause
