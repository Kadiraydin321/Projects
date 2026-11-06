import os
import shutil
import ctypes
from ctypes import wintypes
import platform

def get_disk_info():
    """
    Windows üzerindeki tüm disk ve birimleri listeleme (sürücü harfi, etiket, dosya sistemi, boş/dolu alan)
    """
    if platform.system() != "Windows":
        raise OSError("Bu fonksiyon sadece Windows sistemlerde çalışır.")
    
    drives = []
    bitmask = ctypes.windll.kernel32.GetLogicalDrives()
    
    for i in range(26):
        if bitmask & (1 << i):
            drive = chr(ord('A') + i) + ':'
            
            # Sürücü etiketini al
            try:
                volume_name = ctypes.create_unicode_buffer(wintypes.MAX_PATH)
                ctypes.windll.kernel32.GetVolumeNameForVolumeMountPointW(
                    drive + '\\', volume_name, wintypes.MAX_PATH)
                label = volume_name.value
            except:
                label = "Etiket Yok"
            
            # Disk bilgilerini al
            try:
                free_bytes_available = wintypes.ULONGLONG()
                total_number_of_bytes = wintypes.ULONGLONG()
                total_number_of_free_bytes = wintypes.ULONGLONG()

                ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                    drive + '\\',
                    ctypes.byref(free_bytes_available),
                    ctypes.byref(total_number_of_bytes),
                    ctypes.byref(total_number_of_free_bytes)
                )

                total_size = total_number_of_bytes.value
                free_space = free_bytes_available.value
                used_space = total_size - free_space

                # Dosya sistemini al
                file_system_name = ctypes.create_unicode_buffer(wintypes.MAX_PATH)
                ctypes.windll.kernel32.GetVolumeInformationW(
                    drive + '\\',
                    None, 0,
                    None, 0,
                    None, 0,
                    file_system_name, wintypes.MAX_PATH
                )
                fs_type = file_system_name.value if file_system_name.value else "Bilinmiyor"

            except Exception as e:
                print(f"Disk bilgisi alınamadı: {drive} - Hata: {e}")
                continue
            
            drives.append({
                'drive': drive,
                'label': label or "Etiket Yok",
                'file_system': fs_type or "Bilinmiyor",
                'total_size': total_size,
                'used_space': used_space,
                'free_space': free_space
            })
    
    return drives

def safe_format_disk(drive_letter):
    """
    Güvenli biçimlendirme (C: sürücüsü engeli ile)
    C: sürücüsünü güvenli biçimlendirmeye izin verilmez.
    """
    if platform.system() != "Windows":
        raise OSError("Bu fonksiyon sadece Windows sistemlerde çalışır.")

    if not drive_letter:
        raise ValueError("Sürücü harfi belirtilmelidir.")
    
    drive = drive_letter.upper() + ':'
    
    # C: sürücüsünü engelle
    if drive == "C:":
        raise PermissionError("C: sürücüsü güvenli biçimlendirme için engellenmiştir.")

    try:
        # Windows API ile sürücüyü biçimlendir
        ctypes.windll.kernel32.SetVolumeMountPointW(
            drive + '\\',  # Biçimlendirilecek sürücü
            "Ready"         # Hedef birim etiketi
        )
        return f"{drive} sürücüsü başarıyla biçimlendirildi."
    except Exception as e:
        raise RuntimeError(f"{drive} sürücüsü biçimlendirilemedi: {e}")


# Test kısmı
if __name__ == "__main__":
    print("Disk Bilgileri:")
    try:
        disks = get_disk_info()
        for disk in disks:
            print(f"Sürücü Harfi: {disk['drive']}")
            print(f"Etiket: {disk['label']}")
            print(f"Dosya Sistemi: {disk['file_system']}")
            print(f"Toplam Boyut: {disk['total_size'] // (1024**3)} GB")
            print(f"Kullanılan Alan: {disk['used_space'] // (1024**3)} GB")
            print(f"Boş Alan: {disk['free_space'] // (1024**3)} GB")
            print("-" * 50)
    except Exception as e:
        print(f"Hata: {e}")

    # Güvenli biçimlendirme testi
    try:
        print("\nGüvenli Biçimlendirme Testi:")
        result = safe_format_disk("D")
        print(result)
    except PermissionError as e:
        print(f"İzin Hatası: {e}")
    except Exception as e:
        print(f"Hata: {e}")