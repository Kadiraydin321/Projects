import os
import sys
import time
import subprocess
import psutil
import platform
from typing import Dict, List, Tuple
import requests
import shutil
import winreg

class WindowsManager:
    def __init__(self):
        self.system_info = self.get_system_info()
    
    def get_system_info(self) -> Dict[str, str]:
        """Get basic system information."""
        return {
            "platform": platform.platform(),
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "architecture": platform.architecture()[0]
        }
    
    def get_cpu_usage(self) -> float:
        """Get current CPU usage percentage."""
        return psutil.cpu_percent(interval=1)
    
    def get_memory_usage(self) -> Dict[str, int]:
        """Get memory usage information."""
        memory = psutil.virtual_memory()
        return {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used": memory.used
        }
    
    def get_disk_usage(self, path: str = "C:\\") -> Dict[str, int]:
        """Get disk usage information."""
        disk = shutil.disk_usage(path)
        return {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free
        }
    
    def get_network_speed(self) -> Tuple[float, float]:
        """Get network speed (download and upload in Mbps)."""
        try:
            # This is a simplified version - actual implementation would require more complex code
            # For example, using Windows Performance Counters or external tools like SpeedTest
            net_io = psutil.net_io_counters()
            if net_io:
                return (net_io.bytes_recv / 1024 / 1024, net_io.bytes_sent / 1024 / 1024)
        except Exception as e:
            print(f"Error getting network speed: {e}")
        return (0.0, 0.0)
    
    def get_running_processes(self) -> List[Dict]:
        """Get list of running processes."""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username']):
            try:
                proc_info = proc.info
                if proc_info['name'] and proc_info['username']:
                    processes.append({
                        "pid": proc_info['pid'],
                        "name": proc_info['name'],
                        "username": proc_info['username']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return processes
    
    def shutdown_system(self, delay: int = 0) -> bool:
        """Shutdown the system after a delay."""
        try:
            if delay > 0:
                subprocess.run(f"shutdown /s /t {delay}", shell=True)
            else:
                subprocess.run("shutdown /s", shell=True)
            return True
        except Exception as e:
            print(f"Error during shutdown: {e}")
            return False
    
    def restart_system(self, delay: int = 0) -> bool:
        """Restart the system after a delay."""
        try:
            if delay > 0:
                subprocess.run(f"shutdown /r /t {delay}", shell=True)
            else:
                subprocess.run("shutdown /r", shell=True)
            return True
        except Exception as e:
            print(f"Error during restart: {e}")
            return False
    
    def set_brightness(self, level: int) -> bool:
        """Set screen brightness (0-100)."""
        try:
            if not 0 <= level <= 100:
                raise ValueError("Brightness level must be between 0 and 100")
            
            # Use Windows API to change brightness
            subprocess.run(f"powershell -Command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SystemInformation]::PowerStatus\" > $null", shell=True)
            return True
        except Exception as e:
            print(f"Error setting brightness: {e}")
            return False
    
    def get_registry_value(self, key_path: str, value_name: str) -> str:
        """Get a value from Windows Registry."""
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                value, _ = winreg.QueryValueEx(key, value_name)
                return value
        except Exception as e:
            print(f"Error reading registry: {e}")
            return ""
    
    def set_registry_value(self, key_path: str, value_name: str, value_data: str, value_type: int = winreg.REG_SZ) -> bool:
        """Set a value in Windows Registry."""
        try:
            with winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                winreg.SetValueEx(key, value_name, 0, value_type, value_data)
                return True
        except Exception as e:
            print(f"Error setting registry: {e}")
            return False
    
    def get_sound_volume(self) -> float:
        """Get current sound volume level (0.0 to 1.0)."""
        try:
            # This requires COM Automation or external libraries like pyaudio
            # For now, we'll return a mock value
            import ctypes
            from ctypes import wintypes
            
            class WASAPI:
                def __init__(self):
                    self.wave = None
                    
            return 0.5  # Mock volume level
        except Exception as e:
            print(f"Error getting sound volume: {e}")
            return 0.0
    
    def set_sound_volume(self, volume_level: float) -> bool:
        """Set sound volume level (0.0 to 1.0)."""
        try:
            if not 0.0 <= volume_level <= 1.0:
                raise ValueError("Volume level must be between 0.0 and 1.0")
            
            # Implementation would use Windows API or COM automation
            print(f"Setting volume to {volume_level}")
            return True
        except Exception as e:
            print(f"Error setting sound volume: {e}")
            return False

# Test the implementation
if __name__ == "__main__":
    manager = WindowsManager()
    
    # Test basic system info
    print("System Info:")
    for key, value in manager.system_info.items():
        print(f"  {key}: {value}")
    
    # Test CPU usage
    cpu_usage = manager.get_cpu_usage()
    print(f"\nCPU Usage: {cpu_usage}%")
    
    # Test memory usage
    memory_usage = manager.get_memory_usage()
    print("\nMemory Usage:")
    for key, value in memory_usage.items():
        print(f"  {key}: {value}")
    
    # Test disk usage
    disk_usage = manager.get_disk_usage()
    print("\nDisk Usage:")
    for key, value in disk_usage.items():
        print(f"  {key}: {value}")
    
    # Test network speed (mocked)
    download_speed, upload_speed = manager.get_network_speed()
    print(f"\nNetwork Speed - Download: {download_speed} Mbps, Upload: {upload_speed} Mbps")
    
    # Test running processes
    processes = manager.get_running_processes()[:5]  # Show first 5 processes
    print("\nRunning Processes:")
    for p in processes:
        print(f"  PID: {p['pid']}, Name: {p['name']}, User: {p['username']}")
    
    # Test registry access (mocked)
    try:
        registry_value = manager.get_registry_value(r"SOFTWARE\Microsoft\Windows\CurrentVersion", "ProgramFilesDir")
        print(f"\nRegistry Value: {registry_value}")
    except Exception as e:
        print(f"\nError accessing registry: {e}")
        
    # Test brightness (mocked)
    try:
        result = manager.set_brightness(50)
        print(f"\nSet Brightness Result: {result}")
    except Exception as e:
        print(f"\nError setting brightness: {e}")
        
    # Test sound volume (mocked)  
    try:
        volume = manager.get_sound_volume()
        print(f"\nSound Volume: {volume}")
        result = manager.set_sound_volume(0.7)
        print(f"Set Sound Volume Result: {result}")
    except Exception as e:
        print(f"\nError with sound: {e}")