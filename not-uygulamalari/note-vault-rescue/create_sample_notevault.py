#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test ve doğrulama amaçlı örnek .notevault dosyası oluşturan yardımcı araç.
"""

import hashlib
import json
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

MAGIC = b"NOTEVLT1"
PASSWORD = "GizliSifre2024!"  # Hedef şifre
SALT = os.urandom(16)
IV = os.urandom(12)

# SHA-256 Parola hash'i
md = hashlib.sha256()
md.update(SALT)
md.update(PASSWORD.encode("utf-8"))
pwd_hash = md.digest()

# PBKDF2
kdf = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=SALT,
    iterations=12000,
)
key = kdf.derive(PASSWORD.encode("utf-8"))

# Test notları verisi
sample_payload = {
    "version": 1,
    "exportTimestamp": 1729891200000,
    "notes": [
        {
            "title": "Alışveriş Listesi & Planlar",
            "content": "1. Kahve çekirdeği al\n2. Defter ve kalem\n3. Sunum hazırlıkları tamamlanacak",
            "categoryName": "Kişisel",
            "isPinned": True,
            "isArchived": False,
            "isLocked": True,
            "color": -123456,
            "createdAt": 1729890000000,
            "updatedAt": 1729891000000
        },
        {
            "title": "Banka & Finans Notları",
            "content": "Kasa No: 481-B\nGüvenlik İpucu: Mavi anahtarlık ile açılacak.",
            "categoryName": "Önemli",
            "isPinned": False,
            "isArchived": False,
            "isLocked": True,
            "color": -654321,
            "createdAt": 1729880000000,
            "updatedAt": 1729885000000
        }
    ]
}

plain_bytes = json.dumps(sample_payload, ensure_ascii=False).encode("utf-8")

aesgcm = AESGCM(key)
ciphertext = aesgcm.encrypt(IV, plain_bytes, None)

vault_bytes = MAGIC + SALT + IV + pwd_hash + ciphertext

output_file = "/home/birin/Projeler/NoteVaultRescue/ornek_kasa.notevault"
with open(output_file, "wb") as f:
    f.write(vault_bytes)

print(f"Örnek test kasası oluşturuldu: {output_file}")
print(f"Orijinal Şifre: {PASSWORD}")
