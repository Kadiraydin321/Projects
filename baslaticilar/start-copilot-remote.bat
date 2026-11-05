@echo off
setlocal
title GitHub Copilot CLI - Remote Modu Baslaticisi
set SCRIPT_DIR=%~dp0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-copilot-remote.ps1" %*
endlocal
