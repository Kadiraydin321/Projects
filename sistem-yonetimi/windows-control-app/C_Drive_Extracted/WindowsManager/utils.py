import subprocess
import psutil
import winreg

def get_running_processes():
    """Tüm çalışan süreçleri listeler"""
    processes = []
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            processes.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return processes

def get_system_info():
    """Sistem bilgilerini döndürür"""
    import platform
    import os
    
    info = {
        'platform': platform.system(),
        'release': platform.release(),
        'version': platform.version(),
        'machine': platform.machine(),
        'processor': platform.processor(),
        'total_memory': psutil.virtual_memory().total,
        'cpu_count': psutil.cpu_count()
    }
    
    return info

def get_registry_values(key_path):
    """Belirtilen Registry anahtarı değerlerini alır"""
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path)
        
        values = []
        i = 0
        while True:
            try:
                name, value, value_type = winreg.EnumValue(key, i)
                values.append({'name': name, 'value': value, 'type': value_type})
                i += 1
            except WindowsError:
                break
        
        winreg.CloseKey(key)
        return values
        
    except Exception as e:
        print(f"Registry'ten veri alınırken hata oluştu: {e}")
        return []

def set_registry_value(key_path, value_name, value_data, value_type=winreg.REG_SZ):
    """Registry anahtarına yeni değer ekler"""
    try:
        key = winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, key_path)
        winreg.SetValueEx(key, value_name, 0, value_type, value_data)
        winreg.CloseKey(key)
        return True
    except Exception as e:
        print(f"Registry ayarı yapılırken hata oluştu: {e}")
        return False

def kill_process_by_name(process_name):
    """Belirtilen isimdeki süreci sonlandırır"""
    try:
        subprocess.run(["taskkill", "/F", "/IM", process_name], 
                     check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError:
        return False

def start_process(process_path):
    """Belirtilen yoldaki işlemi başlatır"""
    try:
        subprocess.Popen(process_path)
        return True
    except Exception as e:
        print(f"İşlem başlatılırken hata oluştu: {e}")
        return False