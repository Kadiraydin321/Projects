import os
import sys
import subprocess
import psutil
import platform
from datetime import datetime

class WindowsManager:
    def __init__(self):
        self.system_info = {
            'os': platform.system(),
            'version': platform.version(),
            'machine': platform.machine()
        }

    def get_system_info(self):
        """Get basic system information"""
        return self.system_info

    def get_cpu_usage(self):
        """Get CPU usage percentage"""
        return psutil.cpu_percent(interval=1)

    def get_memory_usage(self):
        """Get memory usage information"""
        memory = psutil.virtual_memory()
        return {
            'total': memory.total,
            'available': memory.available,
            'percent': memory.percent
        }

    def get_disk_usage(self):
        """Get disk usage information"""
        disk = psutil.disk_usage('/')
        return {
            'total': disk.total,
            'used': disk.used,
            'free': disk.free,
            'percent': disk.percent
        }

    def run_command(self, command):
        """Run a command and return output"""
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            return result.stdout if result.stdout else "Command executed successfully"
        except Exception as e:
            return f"Error: {str(e)}"

    def get_running_processes(self):
        """Get list of running processes"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username']):
            try:
                process_info = proc.info
                process_info['memory_mb'] = round(proc.memory_info().rss / 1024 / 1024, 2)
                processes.append(process_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return sorted(processes, key=lambda x: x['memory_mb'], reverse=True)

    def get_network_info(self):
        """Get network interface information"""
        try:
            net_io = psutil.net_io_counters()
            return {
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv
            }
        except Exception as e:
            return f"Error getting network info: {str(e)}"

    def get_power_info(self):
        """Get power information"""
        try:
            # For Windows, we can use PowerShell commands
            result = subprocess.run(["powershell", "(Get-WmiObject -Class Win32_Battery).EstimatedChargeRemaining"], 
                                  capture_output=True, text=True)
            return {
                'battery_percentage': int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0,
                'charging': 'Unknown'  # This would require more complex checking
            }
        except Exception as e:
            return f"Error getting power info: {str(e)}"

if __name__ == "__main__":
    wm = WindowsManager()
    
    print("=== Windows System Manager ===")
    print(f"OS: {wm.get_system_info()}")
    print(f"CPU Usage: {wm.get_cpu_usage()}%")
    print(f"Memory Usage: {wm.get_memory_usage()}")
    print(f"Disk Usage: {wm.get_disk_usage()}")
    
    # Test running processes
    processes = wm.get_running_processes()
    print("Top 5 Memory Consuming Processes:")
    for proc in processes[:5]:
        print(f"Process: {proc['name']} (PID: {proc['pid']}) - Memory: {proc['memory_mb']} MB")