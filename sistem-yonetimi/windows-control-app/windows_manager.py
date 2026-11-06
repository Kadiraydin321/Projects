import subprocess
import os
import sys
import json
from datetime import datetime
import psutil
import time
import threading

class WindowsManager:
    def __init__(self):
        self.current_user = os.getlogin()
    
    def get_system_info(self):
        """Get basic system information"""
        info = {
            "hostname": os.environ.get('COMPUTERNAME', 'Unknown'),
            "username": self.current_user,
            "os": sys.platform,
            "cpu_count": psutil.cpu_count(),
            "memory_total": round(psutil.virtual_memory().total / (1024**3), 2),
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        return info
    
    def get_network_speed(self):
        """Get network usage stats"""
        net_io = psutil.net_io_counters()
        if net_io:
            return {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            }
        return None
    
    def get_registry_value(self, key_path, value_name):
        """Get a value from Windows Registry"""
        try:
            # Using reg.exe to query registry (Windows only)
            result = subprocess.run(
                ['reg', 'query', key_path, '/v', value_name],
                capture_output=True,
                text=True,
                shell=True
            )
            
            if result.returncode == 0:
                # Parse the output
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if value_name in line:
                        return line.split()[-1]  # Return the value
            return None
        except Exception as e:
            print(f"Registry query failed: {e}")
            return None
    
    def set_registry_value(self, key_path, value_name, value_data, value_type='REG_SZ'):
        """Set a value in Windows Registry"""
        try:
            # Using reg.exe to set registry value
            result = subprocess.run(
                ['reg', 'add', key_path, '/v', value_name, '/d', value_data, '/t', value_type, '/f'],
                capture_output=True,
                text=True,
                shell=True
            )
            
            return result.returncode == 0
        except Exception as e:
            print(f"Registry set failed: {e}")
            return False
    
    def get_volume_level(self):
        """Get system volume level"""
        try:
            # Using PowerShell to get volume level
            result = subprocess.run(
                ['powershell', '-Command', 'Get-Volume | Select-Object -ExpandProperty DriveLetter'],
                capture_output=True,
                text=True,
                shell=True
            )
            
            volume_info = []
            drives = psutil.disk_partitions()
            for drive in drives:
                try:
                    usage = psutil.disk_usage(drive.mountpoint)
                    volume_info.append({
                        "drive": drive.device,
                        "total": round(usage.total / (1024**3), 2),
                        "used": round(usage.used / (1024**3), 2),
                        "free": round(usage.free / (1024**3), 2),
                        "percent": usage.percent
                    })
                except Exception:
                    continue
            
            return volume_info
        except Exception as e:
            print(f"Volume level query failed: {e}")
            return []
    
    def set_volume_level(self, level):
        """Set system volume level"""
        try:
            # Using PowerShell to set volume
            result = subprocess.run(
                ['powershell', '-Command', f'Set-Volume -Volume "{level}"'],
                capture_output=True,
                text=True,
                shell=True
            )
            return result.returncode == 0
        except Exception as e:
            print(f"Set volume failed: {e}")
            return False
    
    def get_brightness(self):
        """Get screen brightness"""
        try:
            # Using PowerShell to get screen brightness
            result = subprocess.run(
                ['powershell', '-Command', 'Get-WmiObject -Class Win32_Brightness'],
                capture_output=True,
                text=True,
                shell=True
            )
            
            if result.returncode == 0:
                output = result.stdout.strip()
                # Simplified parsing
                return "Brightness data retrieved"
            return None
        except Exception as e:
            print(f"Brightness query failed: {e}")
            return None
    
    def set_brightness(self, level):
        """Set screen brightness (0-100)"""
        try:
            # Using PowerShell to set brightness
            result = subprocess.run(
                ['powershell', '-Command', f'Set-WmiObject -Class Win32_Brightness -Namespace root\\WMI -Value {{Brightness={level}}}'],
                capture_output=True,
                text=True,
                shell=True
            )
            return result.returncode == 0
        except Exception as e:
            print(f"Brightness set failed: {e}")
            return False
    
    def list_running_processes(self, limit=10):
        """List currently running processes"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username']):
            try:
                processes.append(proc.info)
                if len(processes) >= limit:
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return processes
    
    def get_disk_usage(self):
        """Get disk usage information"""
        drives = psutil.disk_partitions()
        usage_info = []
        
        for drive in drives:
            try:
                usage = psutil.disk_usage(drive.mountpoint)
                usage_info.append({
                    "device": drive.device,
                    "mountpoint": drive.mountpoint,
                    "filesystem": drive.fstype,
                    "total": round(usage.total / (1024**3), 2),
                    "used": round(usage.used / (1024**3), 2),
                    "free": round(usage.free / (1024**3), 2),
                    "percent": usage.percent
                })
            except Exception:
                # If we can't access a drive, skip it
                continue
        
        return usage_info
    
    def test_network_speed(self):
        """Test network speed using system commands"""
        try:
            # Using iperf3 from Python - this is a simplified version
            # In reality, you might want to install and use iPerf3 or similar tools
            
            net_io = psutil.net_io_counters()
            
            # Wait a moment to get a better measurement
            time.sleep(1)
            
            net_io_after = psutil.net_io_counters()
            
            if net_io and net_io_after:
                download_speed = (net_io_after.bytes_recv - net_io.bytes_recv) / 1024  # KB/s
                upload_speed = (net_io_after.bytes_sent - net_io.bytes_sent) / 1024  # KB/s
                
                return {
                    "download_speed_kb_sec": round(download_speed, 2),
                    "upload_speed_kb_sec": round(upload_speed, 2)
                }
            
            return None
        except Exception as e:
            print(f"Network speed test failed: {e}")
            return None

# Example usage and testing function
def main():
    win_manager = WindowsManager()
    
    print("=== Windows Management System ===")
    print("System Info:")
    system_info = win_manager.get_system_info()
    for key, value in system_info.items():
        print(f"  {key}: {value}")
    
    print("\nNetwork Speed:")
    network_speed = win_manager.get_network_speed()
    if network_speed:
        for key, value in network_speed.items():
            print(f"  {key}: {value}")
    
    print("\nRunning Processes:")
    processes = win_manager.list_running_processes(5)
    for proc in processes:
        print(f"  PID: {proc['pid']}, Name: {proc['name']}")
    
    print("\nDisk Usage:")
    disk_usage = win_manager.get_disk_usage()
    for usage in disk_usage:
        print(f"  Drive {usage['device']}: {usage['percent']}% used")
    
    print("\nTesting network speed...")
    test_result = win_manager.test_network_speed()
    if test_result:
        print(f"  Download: {test_result['download_speed_kb_sec']} KB/s")
        print(f"  Upload: {test_result['upload_speed_kb_sec']} KB/s")

if __name__ == "__main__":
    main()