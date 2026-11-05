@echo off
chcp 65001 >nul
title WSL Projeler Senkronizasyonu
color 0B
cd /d "%~dp0..\"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Transfer-Projeler.ps1" %*
