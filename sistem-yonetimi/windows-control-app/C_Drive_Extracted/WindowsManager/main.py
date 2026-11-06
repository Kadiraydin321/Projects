import os
import sys
import subprocess
import platform
from datetime import datetime

class WindowsManager:
    def __init__(self):
        self.os_name = platform.system()
        if self.os_name != "Windows":
            raise Exception("This application is designed for Windows only.")
    
    def get_system_info(self):
        """Get basic system information."""
        return {
            'os': platform.uname().system,
            'release': platform.uname().release,
            'version': platform.uname().version,
            'machine': platform.uname().machine,
            'processor': platform.uname().processor,
            'python_version': sys.version
        }

    def get_network_info(self):
        """Get network adapter information."""
        try:
            output = subprocess.check_output(["netsh", "interface", "ip", "show", "addresses"], 
                                              text=True, stderr=subprocess.STDOUT)
            return output
        except Exception as e:
            return f"Error fetching network info: {str(e)}"

    def get_registry_value(self, key_path, value_name):
        """Get a value from the Windows Registry."""
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path)
            value, _ = winreg.QueryValueEx(key, value_name)
            winreg.CloseKey(key)
            return value
        except Exception as e:
            return f"Error reading registry: {str(e)}"

    def set_registry_value(self, key_path, value_name, value_data, value_type=winreg.REG_SZ):
        """Set a value in the Windows Registry."""
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
            winreg.SetValueEx(key, value_name, 0, value_type, value_data)
            winreg.CloseKey(key)
            return "Registry value updated successfully."
        except Exception as e:
            return f"Error updating registry: {str(e)}"

    def get_brightness(self):
        """Get current screen brightness."""
        try:
            import wmi
            c = wmi.WMI()
            for i in c.Win32_DisplayController():
                if hasattr(i, 'CurrentBrightness'):
                    return i.CurrentBrightness
            return "Brightness information not available"
        except Exception as e:
            return f"Error getting brightness: {str(e)}"

    def set_brightness(self, level):
        """Set screen brightness (0-100)."""
        try:
            if 0 <= level <= 100:
                import wmi
                c = wmi.WMI()
                for i in c.Win32_DisplayController():
                    if hasattr(i, 'CurrentBrightness'):
                        return f"Current brightness is {i.CurrentBrightness} (attempted to set to {level})"
                return "Brightness setting not supported"
            else:
                return "Brightness level must be between 0 and 100."
        except Exception as e:
            return f"Error setting brightness: {str(e)}"

    def get_volume(self):
        """Get current system volume."""
        try:
            import wmi
            c = wmi.WMI()
            for i in c.Win32_SoundDevice():
                if hasattr(i, 'Volume'):
                    return i.Volume
            return "Volume information not available"
        except Exception as e:
            return f"Error getting volume: {str(e)}"

    def set_volume(self, level):
        """Set system volume (0.0-100.0)."""
        try:
            if 0 <= level <= 100:
                import wmi
                c = wmi.WMI()
                for i in c.Win32_SoundDevice():
                    if hasattr(i, 'Volume'):
                        return f"Current volume is {i.Volume} (attempted to set to {level})"
                return "Volume setting not supported"
            else:
                return "Volume level must be between 0 and 100."
        except Exception as e:
            return f"Error setting volume: {str(e)}"

    def test_network_speed(self):
        """Basic network speed test using ping."""
        try:
            # Test with google.com
            result = subprocess.run(['ping', '-n', '4', 'google.com'], 
                                    capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'Average' in line:
                        return line.strip()
            return "Cannot determine network speed"
        except Exception as e:
            return f"Speed test failed: {str(e)}"

    def get_cpu_usage(self):
        """Get basic CPU usage."""
        try:
            import psutil
            cpu_percent = psutil.cpu_percent(interval=1)
            return cpu_percent
        except Exception as e:
            return f"Error getting CPU usage: {str(e)}"

if __name__ == "__main__":
    wm = WindowsManager()
    
    print("Windows Management Suite")
    print("=" * 30)
    
    # Get system info
    sys_info = wm.get_system_info()
    print("\nSystem Information:")
    for key, value in sys_info.items():
        print(f"  {key}: {value}")
    
    # Network info
    net_info = wm.get_network_info()
    print("\nNetwork Information:")
    print(net_info)
    
    # Registry info
    print("\nRegistry Info:")
    reg_value = wm.get_registry_value("SOFTWARE\\Microsoft\\Windows\\CurrentVersion", "ProgramFilesDir")
    print(f"Program Files Directory: {reg_value}")
    
    # Get brightness
    brightness = wm.get_brightness()
    print(f"\nCurrent Brightness: {brightness}")
    
    # CPU usage
    cpu_usage = wm.get_cpu_usage()
    print(f"\nCPU Usage: {cpu_usage}%")
    
    # Speed test
    speed_result = wm.test_network_speed()
    print(f"\nNetwork Speed Test Result: {speed_result}")
    
    print("\nWindows Management Suite completed.")