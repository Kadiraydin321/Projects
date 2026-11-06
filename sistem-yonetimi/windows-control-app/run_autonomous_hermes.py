#!/usr/bin/env python3
"""
Autonomous Driver for Hermes Agent
Drives Hermes Agent to independently develop, test, and expand the Windows Control Center application.
"""

import subprocess
import time
import sys
import os

PROJECT_DIR = "/home/birin/Projeler/WindowsControlApp"
LOG_FILE = os.path.join(PROJECT_DIR, "hermes_autonomous.log")
SESSION_NAME = "WindowsControlCenter-Dev"

TASKS = [
    (
        "Adım 1: Proje Temeli",
        "Bu dizinde requirements.txt ve proje klasör yapısını oluştur (modules/, tests/). "
        "Gerekli paketleri belirle (customtkinter, psutil vb.)."
    ),
    (
        "Adım 2: Güç Yönetimi Modülü",
        "modules/power_manager.py dosyasını yaz. Zamanlanmış kapatma (shutdown /s /t), "
        "yeniden başlatma (shutdown /r /t), iptal etme (shutdown /a), uyku ve ekran kilitleme "
        "fonksiyonlarını Windows/WSL uyumlu olarak eksiksiz kodla."
    ),
    (
        "Adım 3: Disk Yönetimi Modülü",
        "modules/disk_manager.py dosyasını yaz. Windows üzerindeki tüm disk ve birimleri "
        "listeleme (sürücü harfi, etiket, dosya sistemi, boş/dolu alan) ve güvenli biçimlendirme "
        "(C: sürücüsü engeli ile) fonksiyonlarını kodla."
    ),
    (
        "Adım 4: Güncelleme ve Sürücü Modülü",
        "modules/update_manager.py dosyasını yaz. winget ve PowerShell kullanarak donanım sürücü "
        "durumlarını ve sistem yazılım güncellemelerini tarayan ve güncelleyen fonksiyonları kodla."
    ),
    (
        "Adım 5: Canlı Sistem İzleyici",
        "modules/system_monitor.py dosyasını yaz. CPU, RAM, Disk ve NVIDIA RTX 5060 Ti GPU canlı kullanım, "
        "VRAM ve sıcaklık verilerini çeken fonksiyonları kodla."
    ),
    (
        "Adım 6: Sistem Temizleyici",
        "modules/system_cleaner.py dosyasını yaz. Windows geçici dosyalarını (Temp), geri dönüşüm "
        "kutusunu ve DNS önbelleğini temizleyen güvenli fonksiyonları kodla."
    ),
    (
        "Adım 7: Modern GUI Arayüzü",
        "app.py dosyasını CustomTkinter ile modern, koyu temalı, sekmeli bir Windows kontrol merkezi "
        "olarak yaz. Geliştirdiğin tüm modülleri (Sistem İzleyici, Güç, Disk, Güncelleme, Temizlik) "
        "bu arayüze entegre et. Arka plan işlemleri için threading kullan."
    ),
    (
        "Adım 8: Test ve Kalite Kontrolü",
        "tests/ klasörü altına modüller için test scriptleri yaz ve çalıştır. Hata veren veya "
        "eksik kalan yerleri düzelt."
    ),
    (
        "Adım 9: Windows Masaüstü Başlatıcısı",
        "Kullanıcının Windows masaüstünden tek tıkla çalıştırabileceği /mnt/c/Users/Birin/Desktop/WindowsKontrolMerkezi.bat "
        "dosyasını hazırla ve çalışır olduğunu teyit et."
    ),
    (
        "Adım 10: Ekstra Gelişmiş Özellikler",
        "Uygulamaya Windows servis yöneticisi (Get-Service) ve başlangıç uygulamaları listesi "
        "özelliklerini de ekleyerek projeyi sabaha kadar en mükemmel seviyeye çıkar."
    )
]

def log(msg):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    line = f"{timestamp} {msg}\n"
    print(line, end="", flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line)

def run_hermes_step(step_name, prompt):
    log(f"▶ Başlatılıyor: {step_name}")
    cmd = [
        "hermes", "-p", "coder", "chat",
        "--yolo", "--oneshot",
        "-c", SESSION_NAME, "--create-if-missing",
        "--in", PROJECT_DIR,
        "-q", f"Talimat: {prompt}\nSoru sorma, ilgili kodları ve dosyaları doğrudan yaz, test et ve tamamla."
    ]
    env = os.environ.copy()
    env["PATH"] = f"{os.path.expanduser('~')}/.local/bin:{os.path.expanduser('~')}/.hermes/bin:{env.get('PATH', '')}"
    env["LD_LIBRARY_PATH"] = f"{os.path.expanduser('~')}/.local/lib:{env.get('LD_LIBRARY_PATH', '')}"

    start_time = time.time()
    try:
        proc = subprocess.run(
            cmd,
            cwd=PROJECT_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=600  # 10 min max per task
        )
        elapsed = round(time.time() - start_time, 1)
        if proc.returncode == 0:
            log(f"✓ Tamamlandı ({elapsed}s): {step_name}")
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(f"\n--- Output of {step_name} ---\n{proc.stdout}\n")
        else:
            log(f"⚠ Uyarı ({elapsed}s) Çıkış Kodu {proc.returncode}: {step_name}")
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(f"\n--- Stderr of {step_name} ---\n{proc.stderr}\n")
    except subprocess.TimeoutExpired:
        log(f"⏰ Zaman aşımı: {step_name}")
    except Exception as e:
        log(f"✗ Hata: {step_name} - {e}")

def main():
    log("==================================================")
    log("  Hermes Agent Otonom Geliştirme Döngüsü Başladı")
    log(f"  Proje: {PROJECT_DIR}")
    log("==================================================")

    # Execute all planned steps sequentially
    for step_name, prompt in TASKS:
        run_hermes_step(step_name, prompt)
        time.sleep(3)

    # After initial stages, enter continuous refinement loop
    loop_count = 1
    while True:
        refinement_prompt = (
            f"Döngü #{loop_count}: Yazdığın Windows Yönetim Uygulamasını incele. "
            "Kod kalitesini artır, yeni özellikler (örn. ağ hız testi, Windows Registry ayarları, ses/parlaklık kontrolleri) "
            "ekle, arayüzü güzelleştir ve testlerini çalıştır."
        )
        run_hermes_step(f"İnce Ayar & Yeni Özellik Döngüsü #{loop_count}", refinement_prompt)
        loop_count += 1
        time.sleep(15)

if __name__ == "__main__":
    main()
