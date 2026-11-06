import os
import subprocess
import psutil
import platform
from datetime import datetime

class WindowsManager:
    def __init__(self):
        self.os_name = platform.system()
    
    def get_cpu_usage(self):
        return psutil.cpu_percent(interval=1)
    
    def get_memory_usage(self):
        memory = psutil.virtual_memory()
        return {
            'total': memory.total,
            'available': memory.available,
            'percent': memory.percent
        }
    
    def get_disk_usage(self):
        disk = psutil.disk_usage('/')
        return {
            'total': disk.total,
            'used': disk.used,
            'free': disk.free,
            'percent': disk.percent
        }
    
    def get_network_stats(self):
        net_io = psutil.net_io_counters()
        return {
            'bytes_sent': net_io.bytes_sent,
            'bytes_recv': net_io.bytes_recv,
            'packets_sent': net_io.packets_sent,
            'packets_recv': net_io.packets_recv
        }
    
    def get_running_processes(self, limit=10):
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'cpu_percent']):
            try:
                process_info = proc.info
                processes.append({
                    'pid': process_info['pid'],
                    'name': process_info['name'],
                    'memory_mb': round(process_info['memory_info'].rss / 1024 / 1024, 2),
                    'cpu_percent': round(process_info['cpu_percent'], 2)
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:limit]
    
    def reboot_system(self):
        try:
            subprocess.run(['shutdown', '/r', '/t', '0'], check=True)
            return "System reboot initiated"
        except subprocess.CalledProcessError:
            return "Failed to initiate reboot"
    
    def shutdown_system(self):
        try:
            subprocess.run(['shutdown', '/s', '/t', '0'], check=True)
            return "System shutdown initiated"
        except subprocess.CalledProcessError:
            return "Failed to initiate shutdown"

if __name__ == "__main__":
    wm = WindowsManager()
    print("CPU Usage:", wm.get_cpu_usage())
    print("Memory Usage:", wm.get_memory_usage())
    print("Disk Usage:", wm.get_disk_usage())
    print("Network Stats:", wm.get_network_stats())
    print("Running Processes:", wm.get_running_processes())