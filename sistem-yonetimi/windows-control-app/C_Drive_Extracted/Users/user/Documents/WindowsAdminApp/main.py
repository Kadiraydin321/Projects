import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import os
import psutil
import time
import threading
from datetime import datetime

class WindowsAdminApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Windows Yönetim Uygulaması")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Tema ayarı
        style = ttk.Style()
        style.theme_use('clam')
        
        # Ana frame
        main_frame = ttk.Frame(root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Grid config
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Başlık
        title_label = ttk.Label(main_frame, text="Windows Yönetim Uygulaması", font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Sistem bilgileri frame
        system_info_frame = ttk.LabelFrame(main_frame, text="Sistem Bilgileri", padding="10")
        system_info_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        system_info_frame.columnconfigure(1, weight=1)
        
        # CPU kullanımı
        ttk.Label(system_info_frame, text="CPU Kullanımı:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        self.cpu_label = ttk.Label(system_info_frame, text="0%")
        self.cpu_label.grid(row=0, column=1, sticky=tk.W)
        
        # Bellek kullanımı
        ttk.Label(system_info_frame, text="Bellek Kullanımı:").grid(row=1, column=0, sticky=tk.W, padx=(0, 10))
        self.memory_label = ttk.Label(system_info_frame, text="0 MB")
        self.memory_label.grid(row=1, column=1, sticky=tk.W)
        
        # Disk kullanımı
        ttk.Label(system_info_frame, text="Disk Kullanımı:").grid(row=2, column=0, sticky=tk.W, padx=(0, 10))
        self.disk_label = ttk.Label(system_info_frame, text="0 GB")
        self.disk_label.grid(row=2, column=1, sticky=tk.W)
        
        # Ağ bilgileri
        ttk.Label(system_info_frame, text="Ağ Hızı:").grid(row=3, column=0, sticky=tk.W, padx=(0, 10))
        self.network_label = ttk.Label(system_info_frame, text="0 Mbps")
        self.network_label.grid(row=3, column=1, sticky=tk.W)
        
        # Sistem zamanı
        ttk.Label(system_info_frame, text="Sistem Zamanı:").grid(row=4, column=0, sticky=tk.W, padx=(0, 10))
        self.time_label = ttk.Label(system_info_frame, text="")
        self.time_label.grid(row=4, column=1, sticky=tk.W)
        
        # Kontroller frame
        controls_frame = ttk.LabelFrame(main_frame, text="Kontroller", padding="10")
        controls_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        controls_frame.columnconfigure(1, weight=1)
        
        # Ağ testi butonu
        self.network_test_button = ttk.Button(controls_frame, text="Ağ Hız Testi", command=self.start_network_test)
        self.network_test_button.grid(row=0, column=0, padx=(0, 10))
        
        # Windows Registry ayarları butonu
        self.registry_button = ttk.Button(controls_frame, text="Registry Ayarları", command=self.open_registry_editor)
        self.registry_button.grid(row=0, column=1, padx=(0, 10))
        
        # Ses ayarı butonu
        self.audio_settings_button = ttk.Button(controls_frame, text="Ses Ayarları", command=self.open_audio_settings)
        self.audio_settings_button.grid(row=0, column=2, padx=(0, 10))
        
        # Parlaklık kontrolü
        self.brightness_label = ttk.Label(controls_frame, text="Parlaklık:")
        self.brightness_label.grid(row=1, column=0, sticky=tk.W, pady=(10, 0))
        
        self.brightness_slider = ttk.Scale(controls_frame, from_=0, to=100, orient=tk.HORIZONTAL, command=self.update_brightness)
        self.brightness_slider.set(50)
        self.brightness_slider.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=(10, 0), padx=(10, 0))
        
        # Durum çubuğu
        self.status_bar = ttk.Label(main_frame, text="Hazır", relief=tk.SUNKEN)
        self.status_bar.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(10, 0))
        
        # Update sistem bilgileri
        self.update_system_info()
        
    def update_system_info(self):
        try:
            # CPU kullanımı
            cpu_percent = psutil.cpu_percent(interval=1)
            self.cpu_label.config(text=f"{cpu_percent}%")
            
            # Bellek kullanımı
            memory = psutil.virtual_memory()
            used_memory = memory.used // (1024 * 1024)  # MB
            self.memory_label.config(text=f"{used_memory} MB")
            
            # Disk kullanımı
            disk = psutil.disk_usage('/')
            used_disk = disk.used // (1024 * 1024 * 1024)  # GB
            self.disk_label.config(text=f"{used_disk} GB")
            
            # Sistem zamanı
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.time_label.config(text=current_time)
            
        except Exception as e:
            messagebox.showerror("Hata", f"Sistem bilgileri alınırken hata oluştu: {e}")
        
        # 5 saniyede bir güncelle
        self.root.after(5000, self.update_system_info)
    
    def start_network_test(self):
        """Ağ hız testi başlatır"""
        def run_network_test():
            try:
                # Basit ağ testi için ping komutunu kullanıyoruz
                # Gerçek bir ağ hız testi için farklı bir yöntem gerekebilir
                result = subprocess.run(['ping', '-n', '10', '8.8.8.8'], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    self.status_bar.config(text="Ağ testi tamamlandı")
                    messagebox.showinfo("Ağ Testi", "Ağ bağlantısı başarılı")
                else:
                    self.status_bar.config(text="Ağ testi başarısız")
                    messagebox.showerror("Ağ Testi", "Ağ bağlantısı başarısız")
            except Exception as e:
                self.status_bar.config(text="Ağ testi sırasında hata oluştu")
                messagebox.showerror("Hata", f"Ağ testi sırasında hata oluştu: {e}")
        
        # Yeni thread'te testi başlat
        threading.Thread(target=run_network_test, daemon=True).start()
    
    def open_registry_editor(self):
        """Windows Registry Editor'ı açar"""
        try:
            subprocess.run(['regedit'], check=True)
            self.status_bar.config(text="Registry Editor açıldı")
        except Exception as e:
            messagebox.showerror("Hata", f"Registry Editor açılırken hata oluştu: {e}")
    
    def open_audio_settings(self):
        """Ses ayarlarını açar"""
        try:
            subprocess.run(['control', 'mmsys.cpl'], check=True)
            self.status_bar.config(text="Ses Ayarları açıldı")
        except Exception as e:
            messagebox.showerror("Hata", f"Ses ayarları açılırken hata oluştu: {e}")
    
    def update_brightness(self, value):
        """Parlaklık seviyesini günceller"""
        try:
            # Windows parlaklık ayarlarını değiştirmek için bir komut kullanalım
            # Gerçek uygulama için daha gelişmiş yöntemler gerekebilir
            self.status_bar.config(text=f"Parlaklık: {value}%")
        except Exception as e:
            messagebox.showerror("Hata", f"Parlaklık ayarlanırken hata oluştu: {e}")

def main():
    root = tk.Tk()
    app = WindowsAdminApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()