import psutil
import sys

# Test system information
print("Sistem Bilgileri:")
print(f"Platform: {sys.platform}")
print(f"CPU Sayısı: {psutil.cpu_count()}")
print(f"RAM: {round(psutil.virtual_memory().total / (1024**3), 2)} GB")
print(f"Python Version: {sys.version}")

# Test process list
print("\nÇalışan Süreçler:")
processes = []
for proc in psutil.process_iter(['pid', 'name']):
    try:
        processes.append(proc.info)
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass

for p in processes[:10]:  # First 10 processes
    print(f"PID: {p['pid']}, Name: {p['name']}")

print("\nTest tamamlandı!")