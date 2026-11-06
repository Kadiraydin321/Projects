#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NoteVault Çekirdek Kripto ve Dosya Ayrıştırma Modülü
NoteApp tarafından üretilen .notevault dosyalarının yapısını çözümler.
"""

import hashlib
import io
import json
import os
import time
import zipfile
from typing import Dict, Any, Optional, Tuple, List
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

MAGIC_HEADER = b"NOTEVLT1"
HEADER_LEN = 68  # 8 (Magic) + 16 (Salt) + 12 (IV) + 32 (Hash)
SALT_LEN = 16
IV_LEN = 12
HASH_LEN = 32
PBKDF2_ITERATIONS = 12000
KEY_LEN = 32  # 256 bits

class NoteVaultFile:
    def __init__(self, raw_bytes: bytes, filename: str = "dosya.notevault"):
        self.filename = filename
        self.raw_bytes = raw_bytes
        if len(raw_bytes) < HEADER_LEN:
            raise ValueError(f"Dosya çok küçük ({len(raw_bytes)} byte). En az {HEADER_LEN} byte olmalı.")
        
        if raw_bytes[:8] != MAGIC_HEADER:
            raise ValueError("Geçersiz dosya formatı: 'NOTEVLT1' başlığı bulunamadı.")
            
        self.salt = raw_bytes[8:24]
        self.iv = raw_bytes[24:36]
        self.stored_hash = raw_bytes[36:68]
        self.ciphertext = raw_bytes[68:]

    def test_password(self, candidate: str) -> bool:
        """
        Aday parolanın doğruluğunu ultra-hızlı SHA-256 ile test eder.
        Dosya başlığındaki kayıtlı hash ile karşılaştırır.
        """
        cand_bytes = candidate.encode('utf-8')
        computed = hashlib.sha256(self.salt + cand_bytes).digest()
        return computed == self.stored_hash

    def decrypt(self, password: str) -> Tuple[bytes, str]:
        """
        Şifreyi PBKDF2 ve AES-256-GCM ile çözer.
        NoteApp sürümlerine göre olası tüm iterasyonları (65536, 12000 vb.) dener.
        Döndürdüğü değer: (çözülmüş_baytlar, tür: 'zip' | 'json' | 'raw')
        """
        if not self.test_password(password):
            raise ValueError("Hatalı parola! SHA-256 doğrulaması başarısız.")

        # NoteApp sürümlerinde kullanılan iterasyon sayıları
        iteration_candidates = [65536, 12000, 100000, 10000, 50000, 1000, 5000, 20000]
        plaintext = None
        last_error = None

        for iters in iteration_candidates:
            try:
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=KEY_LEN,
                    salt=self.salt,
                    iterations=iters,
                )
                key = kdf.derive(password.encode('utf-8'))
                aesgcm = AESGCM(key)
                plaintext = aesgcm.decrypt(self.iv, self.ciphertext, None)
                break
            except Exception as e:
                last_error = e

        if plaintext is None:
            raise ValueError(f"AES-GCM şifre çözme hatası (veri bozulmuş olabilir): {last_error}")

        # Tür belirleme
        if plaintext.startswith(b"PK\x03\x04"):
            payload_type = "zip"
        else:
            try:
                # JSON geçerlilik kontrolü
                json.loads(plaintext.decode('utf-8'))
                payload_type = "json"
            except Exception:
                payload_type = "raw"

        return plaintext, payload_type

    def parse_payload(self, plaintext: bytes, payload_type: str) -> Dict[str, Any]:
        """
        Çözülmüş baytları notlara, kategorilere ve eklere dönüştürür.
        """
        result = {
            "type": payload_type,
            "notes": [],
            "categories": [],
            "attachments": [],
            "metadata": {}
        }

        if payload_type == "json":
            try:
                data = json.loads(plaintext.decode('utf-8'))
                result["metadata"]["version"] = data.get("version", 1)
                result["metadata"]["exportTimestamp"] = data.get("exportTimestamp", 0)
                raw_notes = data.get("notes", [])
                for idx, n in enumerate(raw_notes):
                    result["notes"].append({
                        "id": idx + 1,
                        "title": n.get("title", "(Başlıksız)"),
                        "content": n.get("content", ""),
                        "categoryName": n.get("categoryName") or None,
                        "isPinned": n.get("isPinned", False),
                        "isArchived": n.get("isArchived", False),
                        "isLocked": n.get("isLocked", False),
                        "color": n.get("color", 0),
                        "createdAt": n.get("createdAt", 0),
                        "updatedAt": n.get("updatedAt", 0),
                    })
            except Exception as e:
                result["error"] = f"JSON ayrıştırma hatası: {e}"

        elif payload_type == "zip":
            try:
                with zipfile.ZipFile(io.BytesIO(plaintext)) as zf:
                    namelist = zf.namelist()
                    result["metadata"]["zip_files"] = namelist

                    # notes.json
                    if "notes.json" in namelist:
                        notes_data = json.loads(zf.read("notes.json").decode('utf-8'))
                        for n in notes_data:
                            result["notes"].append({
                                "id": n.get("id"),
                                "title": n.get("title", "(Başlıksız)"),
                                "content": n.get("content", ""),
                                "categoryId": n.get("categoryId"),
                                "categoryName": None, # kategorilerden eşlenecek
                                "isPinned": n.get("isPinned", False),
                                "isArchived": n.get("isArchived", False),
                                "isLocked": n.get("isLocked", False),
                                "attachments": n.get("attachments", []),
                                "createdAt": n.get("createdAt", n.get("timestamp", 0)),
                                "updatedAt": n.get("updatedAt", n.get("timestamp", 0)),
                                "color": n.get("color", 0),
                            })

                    # categories.json
                    if "categories.json" in namelist:
                        cats_data = json.loads(zf.read("categories.json").decode('utf-8'))
                        cat_map = {}
                        for c in cats_data:
                            result["categories"].append(c)
                            cat_map[c.get("id")] = c.get("name")
                        # notlardaki kategori isimlerini eşleştir
                        for n in result["notes"]:
                            if n.get("categoryId") in cat_map:
                                n["categoryName"] = cat_map[n["categoryId"]]

                    # backup_info.json
                    if "backup_info.json" in namelist:
                        info_data = json.loads(zf.read("backup_info.json").decode('utf-8'))
                        result["metadata"]["backup_info"] = info_data

                    # attachments
                    for name in namelist:
                        if name.startswith("attachments/") and not name.endswith("/"):
                            result["attachments"].append(name)

            except Exception as e:
                result["error"] = f"ZIP ayrıştırma hatası: {e}"

        return result


def create_unencrypted_noteapp_backup(parsed_data: Dict[str, Any], raw_plaintext: bytes = None) -> bytes:
    """
    NoteApp uygulamasının 'Ayarlar -> Yedekten Geri Yükle' menüsü ile doğrudan
    şifresiz olarak içeri aktarabileceği standart NoteApp ZIP yedek arşivi üretir.
    Varsa kilitli notların kilitlerini de açar (isLocked: False).
    """
    bio = io.BytesIO()

    # Eğer orijinal veri zaten bir ZIP yedek arşivi ise
    if raw_plaintext and raw_plaintext.startswith(b"PK\x03\x04"):
        with zipfile.ZipFile(io.BytesIO(raw_plaintext), "r") as src_zf:
            with zipfile.ZipFile(bio, "w", zipfile.ZIP_DEFLATED) as dst_zf:
                for item in src_zf.infolist():
                    data = src_zf.read(item.filename)
                    if item.filename == "notes.json":
                        try:
                            notes_list = json.loads(data.decode("utf-8"))
                            for n in notes_list:
                                n["isLocked"] = False
                            data = json.dumps(notes_list, ensure_ascii=False, indent=2).encode("utf-8")
                        except Exception:
                            pass
                    dst_zf.writestr(item, data)
        return bio.getvalue()

    # Eğer JSON formatında aktarılmış kasadan geliyorsa NoteApp uyumlu ZIP oluştur
    notes = parsed_data.get("notes", [])
    categories_set = set()
    for n in notes:
        cat = n.get("categoryName")
        if cat:
            categories_set.add(cat)

    cat_map = {}
    categories_json_list = []
    for idx, cname in enumerate(sorted(categories_set), start=1):
        cat_map[cname] = idx
        categories_json_list.append({
            "id": idx,
            "name": cname,
            "color": 0
        })

    notes_json_list = []
    now_ms = int(time.time() * 1000)
    for idx, n in enumerate(notes, start=1):
        created = n.get("createdAt") or now_ms
        updated = n.get("updatedAt") or created
        cat_name = n.get("categoryName")
        cat_id = cat_map.get(cat_name) if cat_name else None

        notes_json_list.append({
            "id": idx,
            "title": n.get("title") or "(Başlıksız)",
            "content": n.get("content") or "",
            "timestamp": created,
            "createdAt": created,
            "updatedAt": updated,
            "color": n.get("color", 0),
            "categoryId": cat_id,
            "isPinned": n.get("isPinned", False),
            "isArchived": n.get("isArchived", False),
            "isDeleted": False,
            "deletedAt": None,
            "isLocked": False,  # Şifresiz hale getir
            "reminderTime": None,
            "attachments": n.get("attachments", []),
            "backgroundImage": None
        })

    backup_info = {
        "version": 1,
        "timestamp": now_ms,
        "exportDate": time.strftime("%d.%m.%Y %H:%M"),
        "notesCount": len(notes_json_list),
        "categoriesCount": len(categories_json_list)
    }

    with zipfile.ZipFile(bio, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("backup_info.json", json.dumps(backup_info, ensure_ascii=False, indent=2).encode("utf-8"))
        zf.writestr("categories.json", json.dumps(categories_json_list, ensure_ascii=False, indent=2).encode("utf-8"))
        zf.writestr("notes.json", json.dumps(notes_json_list, ensure_ascii=False, indent=2).encode("utf-8"))

    return bio.getvalue()
