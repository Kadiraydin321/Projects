#!/usr/bin/env bash
# NoteVault Kurtarma Aracı Başlatıcı (Linux / macOS)

cd "$(dirname "$0")"

echo "=========================================================="
echo "    🔐 NoteVault Şifre Kurtarıcı & Kasa Açıcı"
echo "=========================================================="
echo ""

# Python 3 kontrolü
if ! command -v python3 &> /dev/null; then
    echo "Hata: 'python3' bulunamadı! Lütfen Python 3 kurun."
    exit 1
fi

# Cryptography kütüphanesi kontrolü
if ! python3 -c "import cryptography" &> /dev/null; then
    echo "[!] 'cryptography' kütüphanesi eksik. Yükleniyor..."
    pip3 install cryptography || pip install cryptography
fi

echo "[*] Web arayüzü başlatılıyor..."
python3 app.py
