@echo off
title Yerel Ag ve Sunucu Yonetim Konsolu (Rust Core)
cd /d "%~dp0"
echo ======================================================
echo Rust Motoru Yerel Ag ve Sunucu Konsolu Baslatiliyor...
echo ======================================================
start target\release\yerel-ag-tarayici-rust.exe
