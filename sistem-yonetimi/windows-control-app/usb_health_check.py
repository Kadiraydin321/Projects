import os
import sys
import time
import hashlib
import subprocess
import shutil

def run_ps(cmd):
    try:
        res = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=20)
        return res.stdout.strip()
    except Exception as e:
        return f"Hata: {e}"

def get_usb_drives():
    ps_cmd = """
    Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=2' | Select-Object DeviceID, VolumeName, FileSystem, @{Name='SizeGB';Expression={[math]::Round($_.Size/1GB, 2)}}, @{Name='FreeGB';Expression={[math]::Round($_.FreeSpace/1GB, 2)}} | ConvertTo-Json
    """
    return run_ps(ps_cmd)

def get_physical_disks_status():
    ps_cmd = """
    Get-CimInstance MSFT_PhysicalDisk -Namespace root/Microsoft/Windows/Storage | Where-Object { $_.BusType -eq 7 } | Select-Object FriendlyName, MediaType, HealthStatus, OperationalStatus | Format-Table -AutoSize | Out-String
    """
    return run_ps(ps_cmd)

def safe_io_surface_test(drive_letter, test_mb=64):
    drive_root = f"{drive_letter}:\\"
    if not os.path.exists(drive_root):
        print(f"HATA: Sürücüye erişilemiyor: {drive_root}")
        return False

    free_bytes = shutil.disk_usage(drive_root).free
    needed_bytes = test_mb * 1024 * 1024
    if free_bytes < (needed_bytes + 50 * 1024 * 1024):
        print(f"UYARI: Yeterli boş alan yok. Gerekli: {test_mb}MB, Boş: {round(free_bytes/1024/1024, 1)}MB")
        return False

    test_file = os.path.join(drive_root, ".usb_health_integrity_test.tmp")
    block_size = 1024 * 1024
    print(f"\n[*] {drive_letter}: üzerinde {test_mb} MB güvenli blok yazma/okuma/doğrulama testi başlatılıyor...")
    
    pattern = os.urandom(block_size)
    expected_hash = hashlib.sha256(pattern).hexdigest()

    try:
        t0 = time.time()
        with open(test_file, "wb", buffering=0) as f:
            for _ in range(test_mb):
                f.write(pattern)
            f.flush()
            os.fsync(f.fileno())
        write_dur = max(time.time() - t0, 0.001)
        write_speed = test_mb / write_dur
        print(f"  [+] Yazma Hızı: {write_speed:.2f} MB/s (Süre: {write_dur:.2f} sn)")

        t1 = time.time()
        blocks_verified = 0
        with open(test_file, "rb") as f:
            for _ in range(test_mb):
                buf = f.read(block_size)
                if hashlib.sha256(buf).hexdigest() != expected_hash:
                    print(f"  [!] KRITIK: Blok #{blocks_verified} bozulmuş (Veri Bütünlüğü Hatası / Olası Bad Sector)!")
                    return False
                blocks_verified += 1
        read_dur = max(time.time() - t1, 0.001)
        read_speed = test_mb / read_dur
        print(f"  [+] Okuma Hızı: {read_speed:.2f} MB/s (Süre: {read_dur:.2f} sn)")
        print(f"  [+] Doğrulanan Blok: {blocks_verified}/{test_mb} (%100 Başarılı)")
        return True
    except Exception as e:
        print(f"  [!] Test sırasında I/O hatası: {e}")
        return False
    finally:
        if os.path.exists(test_file):
            try:
                os.remove(test_file)
            except Exception:
                pass

def main():
    print("=" * 60)
    print("   WINDOWS USB BELLEK GERÇEK SAĞLIK VE PERFORMANS KONTROLÜ")
    print("=" * 60)
    
    print("\n[1] Fiziksel USB Donanım & Sağlık Durumu (MSFT_PhysicalDisk):")
    phys_info = get_physical_disks_status()
    if phys_info:
        print(phys_info)
    else:
        print("  Fiziksel USB sürücü durumu doğrudan okunamadı.")

    print("\n[2] Algılanan Taşınabilir (USB) Sürücüler:")
    disks = get_usb_drives()
    print(disks)

    print("\n" + "-" * 60)
    target = input("Test etmek istediğiniz USB sürücü harfini girin (örn: E, F): ").strip().upper()
    if not target or len(target) != 1 or not target.isalpha():
        print("Geçersiz sürücü harfi. Çıkılıyor.")
        return

    if target == 'C':
        print("GÜVENLİK ENGELİ: C: Windows sistem sürücüsüdür, test edilemez!")
        return

    print(f"\n[3] {target}: için Windows Dosya Sistemi Denetimi (chkdsk)...")
    res = subprocess.run(["chkdsk", f"{target}:"], capture_output=True, text=True)
    print(res.stdout if res.stdout else res.stderr)

    choice = input(f"\n[4] {target}: üzerinde 64MB Veri Bütünlüğü ve Bad Sector I/O testi yapılsın mı? (E/H): ").strip().lower()
    if choice == 'e':
        ok = safe_io_surface_test(target, test_mb=64)
        if ok:
            print("\n>>> SONUÇ: USB Bellek Sağlıklı. Veri bozulması veya sektör hatası bulunmadı.")
        else:
            print("\n>>> SONUÇ: USB Bellekte I/O veya veri bütünlüğü hatası tespit edildi!")

if __name__ == "__main__":
    main()
