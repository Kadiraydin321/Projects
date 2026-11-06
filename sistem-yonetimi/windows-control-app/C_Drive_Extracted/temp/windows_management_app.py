import os
import sys
import subprocess
import platform
from datetime import datetime

def get_system_info():
    """Get basic system information"""
    return {
        'platform': platform.system(),
        'platform_version': platform.version(),
        'architecture': platform.architecture()[0],
        'processor': platform.processor() or platform.machine(),
        'node': platform.node()
    }

def get_network_info():
    """Get network interface information"""
    try:
        result = subprocess.run(['ipconfig'], capture_output=True, text=True, shell=True)
        return result.stdout
    except Exception as e:
        return f"Error retrieving network info: {str(e)}"

def get_disk_space():
    """Get disk space information"""
    try:
        total, used, free = shutil.disk_usage("/")
        return {
            'total': total,
            'used': used,
            'free': free
        }
    except Exception as e:
        return f"Error retrieving disk space: {str(e)}"

def test_network_speed():
    """Test network speed using a simple approach"""
    try:
        # This is a placeholder for actual network speed testing
        # In a real application, you'd use a proper speed test library
        return "Network speed test would be implemented here"
    except Exception as e:
        return f"Error during network speed test: {str(e)}"

def get_registry_info():
    """Get Windows Registry information"""
    if platform.system() != "Windows":
        return "Registry information is only available on Windows systems"
        
    try:
        import winreg
        # Example: Get Windows version from registry
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
        product_name, _ = winreg.QueryValueEx(key, "ProductName")
        winreg.CloseKey(key)
        return f"Windows Version: {product_name}"
    except Exception as e:
        return f"Error retrieving registry info: {str(e)}"

def get_audio_volume():
    """Get current audio volume"""
    if platform.system() == "Windows":
        try:
            import ctypes
            from ctypes import wintypes
            
            class AudioUtilities:
                @staticmethod
                def get_master_volume():
                    # This would require proper COM setup for audio control
                    return "Volume control would be implemented here"
                    
            return AudioUtilities.get_master_volume()
        except Exception as e:
            return f"Error retrieving audio volume: {str(e)}"
    else:
        return "Audio volume information is only available on Windows systems"

def get_brightness():
    """Get current screen brightness"""
    if platform.system() == "Windows":
        try:
            # This would require a proper brightness control API
            return "Brightness control would be implemented here"
        except Exception as e:
            return f"Error retrieving brightness: {str(e)}"
    else:
        return "Brightness information is only available on Windows systems"

def main():
    print("Windows Management Application v1.0")
    print("=" * 50)
    
    # Display system info
    system_info = get_system_info()
    print(f"\nSystem Information:")
    for key, value in system_info.items():
        print(f"  {key}: {value}")
        
    # Display network info
    network_info = get_network_info()
    print(f"\nNetwork Information:")
    print(network_info)
    
    # Display disk space
    disk_space = get_disk_space()
    print(f"\nDisk Space:")
    if isinstance(disk_space, dict):
        for key, value in disk_space.items():
            print(f"  {key}: {value / (1024**3):.2f} GB")
    else:
        print(f"  {disk_space}")
    
    # Network speed test
    network_speed = test_network_speed()
    print(f"\nNetwork Speed Test:")
    print(network_speed)
    
    # Registry info
    registry_info = get_registry_info()
    print(f"\nRegistry Information:")
    print(registry_info)
    
    # Audio volume
    audio_volume = get_audio_volume()
    print(f"\nAudio Volume:")
    print(audio_volume)
    
    # Brightness
    brightness = get_brightness()
    print(f"\nScreen Brightness:")
    print(brightness)

if __name__ == "__main__":
    main()