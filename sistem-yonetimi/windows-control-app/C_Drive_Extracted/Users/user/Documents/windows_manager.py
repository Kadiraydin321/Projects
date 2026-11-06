import os
import sys
import subprocess
import psutil
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time

class WindowsManager:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Windows Yönetim Aracı")
        self.root.geometry("600x500")
        self.setup_ui()

    def setup_ui(self):
        # Ana çerçeve
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Sistem bilgileri
        info_frame = ttk.LabelFrame(main_frame, text="Sistem Bilgileri", padding="10")
        info_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.cpu_label = ttk.Label(info_frame, text="CPU: ")
        self.cpu_label.grid(row=0, column=0, sticky=tk.W)
        self.memory_label = ttk.Label(info_frame, text="Bellek: ")
        self.memory_label.grid(row=1, column=0, sticky=tk.W)
        self.disk_label = ttk.Label(info_frame, text="Disk: ")
        self.disk_label.grid(row=2, column=0, sticky=tk.W)

        # Görev Yöneticisi
        task_frame = ttk.LabelFrame(main_frame, text="Görev Yöneticisi", padding="10")
        task_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.process_listbox = tk.Listbox(task_frame, height=10)
        self.process_listbox.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar = ttk.Scrollbar(task_frame, orient=tk.VERTICAL, command=self.process_listbox.yview)
        scrollbar.grid(row=0, column=2, sticky=(tk.N, tk.S))
        self.process_listbox.configure(yscrollcommand=scrollbar.set)
        
        ttk.Button(task_frame, text="Görevleri Yenile", command=self.refresh_processes).grid(row=1, column=0, pady=5)
        ttk.Button(task_frame, text="Görev Sonlandır", command=self.kill_process).grid(row=1, column=1, pady=5)
        
        # Ağ Testi
        network_frame = ttk.LabelFrame(main_frame, text="Ağ Testi", padding="10")
        network_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.network_result = tk.Text(network_frame, height=5, width=60)
        self.network_result.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        ttk.Button(network_frame, text="Bağlantı Testi", command=self.test_network_connection).grid(row=1, column=0, pady=5)
        ttk.Button(network_frame, text="İnternet Hız Testi", command=self.test_internet_speed).grid(row=1, column=1, pady=5)
        
        # Windows Registry
        registry_frame = ttk.LabelFrame(main_frame, text="Windows Registry", padding="10")
        registry_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.registry_entry = ttk.Entry(registry_frame, width=50)
        self.registry_entry.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 5))
        ttk.Button(registry_frame, text="Kayıt Defterini Aç", command=self.open_registry).grid(row=1, column=0, pady=5)
        ttk.Button(registry_frame, text="Kayıtları Listele", command=self.list_registry_keys).grid(row=1, column=1, pady=5)
        
        # Ses ve Parlaklık
        audio_brightness_frame = ttk.LabelFrame(main_frame, text="Ses ve Parlaklık Kontrolleri", padding="10")
        audio_brightness_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        ttk.Label(audio_brightness_frame, text="Ses Seviyesi:").grid(row=0, column=0, sticky=tk.W)
        self.volume_scale = ttk.Scale(audio_brightness_frame, from_=0, to=100, orient=tk.HORIZONTAL)
        self.volume_scale.grid(row=0, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 5))
        ttk.Button(audio_brightness_frame, text="Ses Ayarını Uygula", command=self.set_volume).grid(row=1, column=0, pady=5)
        
        ttk.Label(audio_brightness_frame, text="Parlaklık Seviyesi:").grid(row=2, column=0, sticky=tk.W)
        self.brightness_scale = ttk.Scale(audio_brightness_frame, from_=0, to=100, orient=tk.HORIZONTAL)
        self.brightness_scale.grid(row=2, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 5))
        ttk.Button(audio_brightness_frame, text="Parlaklık Ayarını Uygula", command=self.set_brightness).grid(row=3, column=0, pady=5)
        
        # Sistem Komutları
        command_frame = ttk.LabelFrame(main_frame, text="Sistem Komutları", padding="10")
        command_frame.grid(row=5, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.command_entry = ttk.Entry(command_frame, width=50)
        self.command_entry.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 5))
        ttk.Button(command_frame, text="Komut Çalıştır", command=self.execute_command).grid(row=1, column=0, pady=5)
        ttk.Button(command_frame, text="Komutları Temizle", command=self.clear_commands).grid(row=1, column=1, pady=5)
        
        # Komut geçmişi
        self.command_history = tk.Text(command_frame, height=4, width=60)
        self.command_history.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))

        # Sistem bilgilerini güncelle
        self.update_system_info()
        self.refresh_processes()

    def update_system_info(self):
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            self.cpu_label.config(text=f"CPU: {cpu_percent}%")
            self.memory_label.config(text=f"Bellek: {memory.percent}% ({memory.available // (1024**2)} MB / {memory.total // (1024**2)} MB)")
            self.disk_label.config(text=f"Disk: {disk.percent}% ({disk.free // (1024**2)} MB / {disk.total // (1024**2)} MB)")
        except Exception as e:
            messagebox.showerror("Hata", f"Sistem bilgileri alınırken hata oluştu: {str(e)}")

    def refresh_processes(self):
        try:
            self.process_listbox.delete(0, tk.END)
            for process in psutil.process_iter(['pid', 'name', 'username']):
                try:
                    self.process_listbox.insert(tk.END, f"{process.info['name']} (PID: {process.info['pid']}) - {process.info['username']}")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            messagebox.showerror("Hata", f"Görevler yenilenirken hata oluştu: {str(e)}")

    def kill_process(self):
        try:
            selection = self.process_listbox.curselection()
            if not selection:
                messagebox.showwarning("Uyarı", "Lütfen bir görev seçin")
                return
                
            selected_process = self.process_listbox.get(selection[0]).split(' (')[1].split(')')[0]
            pid = int(selected_process)
            process = psutil.Process(pid)
            process.terminate()
            messagebox.showinfo("Bilgi", "Görev başarıyla sonlandırıldı")
            self.refresh_processes()
        except Exception as e:
            messagebox.showerror("Hata", f"Görev sonlandırılırken hata oluştu: {str(e)}")

    def test_network_connection(self):
        self.network_result.delete(1.0, tk.END)
        try:
            # Localhost testi
            result = subprocess.run(['ping', '-n', '4', 'localhost'], capture_output=True, text=True, timeout=10)
            self.network_result.insert(tk.END, f"Localhost Testi:\n{result.stdout}\n")
            
            # Google bağlantısı testi
            result = subprocess.run(['ping', '-n', '4', 'google.com'], capture_output=True, text=True, timeout=10)
            self.network_result.insert(tk.END, f"Google Bağlantısı Testi:\n{result.stdout}\n")
        except subprocess.TimeoutExpired:
            self.network_result.insert(tk.END, "Bağlantı testi zaman aşımına uğradı\n")
        except Exception as e:
            self.network_result.insert(tk.END, f"Hata: {str(e)}\n")

    def test_internet_speed(self):
        try:
            # Hız testi yapmak için speedtest komutu kullanıyoruz
            result = subprocess.run(['speedtest', '--simple'], capture_output=True, text=True, timeout=30)
            self.network_result.insert(tk.END, f"İnternet Hız Testi:\n{result.stdout}\n")
        except Exception as e:
            self.network_result.insert(tk.END, f"Hız testi için speedtest bulunamadı. Gerekli yazılıım yüklenmeli.\n")
            self.network_result.insert(tk.END, f"Hata: {str(e)}\n")

    def open_registry(self):
        try:
            registry_key = self.registry_entry.get()
            if not registry_key:
                messagebox.showwarning("Uyarı", "Lütfen bir kayıt defteri anahtarı girin")
                return
                
            subprocess.run(['reg', 'edit', registry_key], check=True)
            messagebox.showinfo("Bilgi", "Kayıt defteri başarıyla açıldı")
        except Exception as e:
            messagebox.showerror("Hata", f"Kayıt defteri açılırken hata oluştu: {str(e)}")

    def list_registry_keys(self):
        try:
            registry_key = self.registry_entry.get()
            if not registry_key:
                messagebox.showwarning("Uyarı", "Lütfen bir kayıt defteri anahtarı girin")
                return
                
            result = subprocess.run(['reg', 'query', registry_key], capture_output=True, text=True, check=True)
            self.network_result.insert(tk.END, f"Kayıt Defteri Anahtarı: {registry_key}\n{result.stdout}\n\n")
        except Exception as e:
            messagebox.showerror("Hata", f"Kayıt defteri listelenirken hata oluştu: {str(e)}")

    def set_volume(self):
        try:
            volume = int(self.volume_scale.get())
            subprocess.run(['powershell', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Control]::SendKeys("^{Volume_Mute}")'], check=True)
            messagebox.showinfo("Bilgi", f"Ses seviyesi ayarlandı: {volume}%")
        except Exception as e:
            messagebox.showerror("Hata", f"Ses ayarı yapılırken hata oluştu: {str(e)}")

    def set_brightness(self):
        try:
            brightness = int(self.brightness_scale.get())
            # Windows parlaklık ayarı
            subprocess.run(['powershell', '-Command', f'(Get-WmiObject -Namespace root\\wmi -Class WmiMonitorBrightness).WmiSetBrightness({brightness}, 0)'], check=True)
            messagebox.showinfo("Bilgi", f"Parlaklık seviyesi ayarlandı: {brightness}%")
        except Exception as e:
            messagebox.showerror("Hata", f"Parlaklık ayarı yapılırken hata oluştu: {str(e)}")

    def execute_command(self):
        try:
            command = self.command_entry.get()
            if not command:
                messagebox.showwarning("Uyarı", "Lütfen bir komut girin")
                return
                
            self.command_history.insert(tk.END, f"> {command}\n")
            self.command_entry.delete(0, tk.END)
            
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
            output = result.stdout + result.stderr
            self.command_history.insert(tk.END, output)
            self.command_history.see(tk.END)
        except subprocess.TimeoutExpired:
            self.command_history.insert(tk.END, "Komut zaman aşımına uğradı\n")
        except Exception as e:
            messagebox.showerror("Hata", f"Komut çalıştırılırken hata oluştu: {str(e)}")

    def clear_commands(self):
        self.command_history.delete(1.0, tk.END)

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = WindowsManager()
    app.run()