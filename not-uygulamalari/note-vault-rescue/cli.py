#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NoteVault Kurtarma Aracı - Terminal / CLI Arayüzü
"""

import argparse
import io
import os
import sys
import time
import json
import zipfile
from typing import List

from notevault_core import NoteVaultFile, create_unencrypted_noteapp_backup
from variations import generate_variations

# Terminal renkleri
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_banner():
    banner = f"""
{CYAN}{BOLD}=============================================================
      🔐 NoteVault Şifre Kurtarma & Kasa Açıcı 🔐
============================================================={RESET}
    """
    print(banner)


def recover_vault(
    filepath: str,
    guesses: List[str],
    level: str = "standard",
    output_dir: str = None,
    custom_suffixes: List[str] = None,
    custom_prefixes: List[str] = None
):
    if not os.path.exists(filepath):
        print(f"{RED}Hata: '{filepath}' dosyası bulunamadı!{RESET}")
        return False

    print(f"{YELLOW}[*] Dosya okunuyor: {filepath}{RESET}")
    with open(filepath, "rb") as f:
        file_bytes = f.read()

    try:
        vault = NoteVaultFile(file_bytes, os.path.basename(filepath))
    except Exception as e:
        print(f"{RED}Hata: {e}{RESET}")
        return False

    print(f"{GREEN}[✓] Geçerli .notevault dosyası doğrulandı.{RESET}")
    print(f"    - Salt (Tuz): {vault.salt.hex()[:16]}...")
    print(f"    - IV: {vault.iv.hex()}")
    print(f"    - Kayıtlı Hash: {vault.stored_hash.hex()[:16]}...")
    print(f"    - Şifreli Veri Boyutu: {len(vault.ciphertext):,} bayt\n")

    print(f"{CYAN}[*] Tahminler: {', '.join(guesses)}{RESET}")
    print(f"{CYAN}[*] Arama Seviyesi: {level.upper()}{RESET}")
    print(f"{CYAN}[*] Varyasyonlar taranıyor... Lütfen bekleyin.{RESET}\n")

    start_time = time.time()
    tested_count = 0
    found_password = None
    last_print = start_time

    generator = generate_variations(
        inputs=guesses,
        level=level,
        custom_suffixes=custom_suffixes or [],
        custom_prefixes=custom_prefixes or []
    )

    for candidate in generator:
        tested_count += 1
        now = time.time()
        
        # Her 0.1 saniyede bir veya 25.000 denemede bir ilerleme güncellemesi
        if now - last_print > 0.15:
            elapsed = now - start_time
            rate = tested_count / elapsed if elapsed > 0 else 0
            cand_preview = (candidate[:20] + "...") if len(candidate) > 20 else candidate
            sys.stdout.write(f"\r{YELLOW}Denenen: {tested_count:,} | Hız: {rate:,.0f} p/s | Son denenen: {cand_preview:<25}{RESET}")
            sys.stdout.flush()
            last_print = now

        if vault.test_password(candidate):
            found_password = candidate
            break

    elapsed = time.time() - start_time
    rate = tested_count / elapsed if elapsed > 0 else 0
    sys.stdout.write(f"\r{' ' * 80}\r")
    sys.stdout.flush()

    if not found_password:
        print(f"\n{RED}[✗] Şifre bulunamadı!{RESET}")
        print(f"    Toplam {tested_count:,} varyasyon {elapsed:.2f} saniyede denendi ({rate:,.0f} parola/sn).")
        print(f"{YELLOW}İpucu: Farklı anahtar kelimeler ekleyin veya seviyeyi 'deep' (derinlemesine) olarak seçin.{RESET}\n")
        return False

    print(f"\n{GREEN}{BOLD}[🎉] TEBRİKLER! ŞİFRE BULUNDU: '{found_password}'{RESET}")
    print(f"    {tested_count:,} deneme yapıldı. Geçen süre: {elapsed:.3f} saniye ({rate:,.0f} parola/sn).\n")

    # Kasayı çöz
    print(f"{CYAN}[*] Kasa içeriği çözülüyor...{RESET}")
    try:
        plaintext, payload_type = vault.decrypt(found_password)
        parsed = vault.parse_payload(plaintext, payload_type)
        print(f"{GREEN}[✓] Çözme başarılı! Tür: {payload_type.upper()}{RESET}")
        
        notes = parsed.get("notes", [])
        categories = parsed.get("categories", [])
        attachments = parsed.get("attachments", [])

        print(f"    - Bulunan Not Sayısı: {len(notes)}")
        if categories:
            print(f"    - Bulunan Kategori Sayısı: {len(categories)}")
        if attachments:
            print(f"    - Bulunan Ek Dosya Sayısı: {len(attachments)}")

        # Notların önizlemesi
        if notes:
            print(f"\n{BOLD}--- Notlar Önizlemesi (İlk 5 Not) ---{RESET}")
            for idx, n in enumerate(notes[:5]):
                cat_info = f" [{n['categoryName']}]" if n.get("categoryName") else ""
                print(f"  {idx+1}. {BOLD}{n.get('title')}{RESET}{cat_info}")
                preview = n.get('content', '').replace('\n', ' ')
                if len(preview) > 80:
                    preview = preview[:77] + "..."
                print(f"     \"{preview}\"")

        # Dışa aktarma
        if not output_dir:
            base_no_ext = os.path.splitext(filepath)[0]
            output_dir = f"{base_no_ext}_kurtarildi"

        os.makedirs(output_dir, exist_ok=True)
        
        # 1. Şifre bilgi dosyası
        info_path = os.path.join(output_dir, "SIFRE_BILGISI.txt")
        with open(info_path, "w", encoding="utf-8") as f:
            f.write(f"Kurtarılan Dosya: {os.path.basename(filepath)}\n")
            f.write(f"Bulunan Şifre: {found_password}\n")
            f.write(f"Kurtarma Tarihi: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Toplam Not: {len(notes)}\n")

        # 2. Notları ayrı metin dosyaları olarak kaydet
        notes_folder = os.path.join(output_dir, "Notlar")
        os.makedirs(notes_folder, exist_ok=True)
        for idx, n in enumerate(notes):
            safe_title = "".join(c for c in n.get('title', f'Not_{idx+1}') if c.isalnum() or c in (' ', '-', '_')).strip()
            if not safe_title: safe_title = f"Not_{idx+1}"
            filename = f"{idx+1:02d}_{safe_title[:40]}.txt"
            with open(os.path.join(notes_folder, filename), "w", encoding="utf-8") as f:
                f.write(f"Başlık: {n.get('title')}\n")
                if n.get('categoryName'):
                    f.write(f"Kategori: {n.get('categoryName')}\n")
                f.write("-" * 40 + "\n\n")
                f.write(n.get('content', ''))

        # 3. Eğer ZIP ise açık ZIP ve ekleri kaydet
        if payload_type == "zip":
            decrypted_zip_path = os.path.join(output_dir, "acik_yedek.zip")
            with open(decrypted_zip_path, "wb") as f:
                f.write(plaintext)
            # ZIP'i klasöre çıkart
            with zipfile.ZipFile(io.BytesIO(plaintext)) as zf:
                zf.extractall(os.path.join(output_dir, "arsiv_dosyalari"))

        # 4. JSON dökümü
        json_path = os.path.join(output_dir, "notlar_tam_liste.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(parsed, f, ensure_ascii=False, indent=2)

        # 5. NoteApp Uygulamasında Doğrudan Açılabilen Şifresiz Yedek Dosyası (.zip)
        unencrypted_zip_bytes = create_unencrypted_noteapp_backup(parsed, plaintext)
        unencrypted_backup_path = os.path.join(output_dir, "NoteApp_SIFRESIZ_YEDEK.zip")
        with open(unencrypted_backup_path, "wb") as f:
            f.write(unencrypted_zip_bytes)

        # Ayrıca dosyanın hemen yanına da kopyalayalım ki kullanıcı çok rahat bulsun
        direct_side_zip = os.path.splitext(filepath)[0] + "_SIFRESIZ_YEDEK.zip"
        try:
            with open(direct_side_zip, "wb") as f:
                f.write(unencrypted_zip_bytes)
        except Exception:
            pass

        print(f"\n{GREEN}[✓] Tüm notlar ve veriler başarıyla kaydedildi:{RESET}")
        print(f"    📂 Klasör: {os.path.abspath(output_dir)}")
        print(f"\n{CYAN}{BOLD}📱 NoteApp Uygulamasında Açmak İçin:{RESET}")
        print(f"    1. NoteApp uygulamasını açın.")
        print(f"    2. Ayarlar -> 'Yedekten Geri Yükle' seçeneğine girin.")
        print(f"    3. Aşağıdaki şifresiz yedek dosyasını seçin:")
        print(f"       👉 {GREEN}{os.path.abspath(unencrypted_backup_path)}{RESET}")
        print(f"    (Notlar şifre sormadan doğrudan uygulamaya aktarılacaktır!)\n")
        return True

    except Exception as e:
        print(f"{RED}Kasa açılırken hata oluştu: {e}{RESET}")
        return False


def interactive_mode():
    print_banner()
    print("Lütfen açmak istediğiniz .notevault dosyasının yolunu girin:")
    filepath = input("Dosya Yolu: ").strip().strip('"').strip("'")
    while not filepath or not os.path.exists(filepath):
        print(f"{RED}Geçerli bir dosya yolu girmelisiniz!{RESET}")
        filepath = input("Dosya Yolu: ").strip().strip('"').strip("'")

    print("\nHatırladığınız tahmini şifreyi veya kelimeleri girin:")
    print("(Örnek: ahmet, 1905, gizli - birden fazlaysa virgülle ayırabilirsiniz)")
    guess_input = input("Tahmin(ler): ").strip()
    while not guess_input:
        guess_input = input("Tahmin(ler): ").strip()

    guesses = [g.strip() for g in guess_input.split(",") if g.strip()]

    print("\nVaryasyon Arama Seviyesi Seçin:")
    print("  1) Hızlı (Fast) - Temel büyük/küçük harf ve yaygın ekler (~1.000 - 25.000)")
    print("  2) Standart (Önerilen) - Leet speak, Türkçe karakterler, yıllar, plakalar (~50.000 - 300.000)")
    print("  3) Derinlemesine (Deep) - Klavye yazım hataları, kapsamlı permütasyonlar (~500.000+)")
    choice = input("Seçiminiz (1/2/3) [Varsayılan: 2]: ").strip()
    level_map = {"1": "fast", "2": "standard", "3": "deep"}
    level = level_map.get(choice, "standard")

    recover_vault(filepath, guesses, level=level)


def main():
    parser = argparse.ArgumentParser(description="NoteVault .notevault Şifre Kurtarma Aracı")
    parser.add_argument("file", nargs="?", help=".notevault dosya yolu")
    parser.add_argument("-g", "--guess", nargs="+", help="Tahmini parola veya anahtar kelimeler")
    parser.add_argument("-p", "--password", help="Doğrudan bilinen şifreyi girerek kasayı açar")
    parser.add_argument("-l", "--level", choices=["fast", "standard", "deep"], default="standard",
                        help="Arama derinliği (varsayılan: standard)")
    parser.add_argument("-o", "--output", help="Kurtarılan notların kaydedileceği klasör")
    parser.add_argument("--suffix", nargs="+", help="Özel eklenecek son ekler")
    parser.add_argument("--prefix", nargs="+", help="Özel eklenecek ön ekler")

    args = parser.parse_args()

    if not args.file or (not args.guess and not args.password):
        interactive_mode()
    else:
        print_banner()
        guesses = []
        if args.password:
            guesses = [args.password]
        elif args.guess:
            for g in args.guess:
                guesses.extend([part.strip() for part in g.split(",") if part.strip()])
        recover_vault(
            filepath=args.file,
            guesses=guesses,
            level=args.level,
            output_dir=args.output,
            custom_suffixes=args.suffix,
            custom_prefixes=args.prefix
        )


if __name__ == "__main__":
    main()
