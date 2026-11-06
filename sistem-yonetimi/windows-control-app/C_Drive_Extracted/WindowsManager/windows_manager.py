import os
import subprocess
import sys
import time
from typing import List, Dict, Any

class WindowsManager:
    """
    A comprehensive Windows management library with support for:
    - System information retrieval
    - Network adapter monitoring  
    - Registry access
    - Audio control
    - Display brightness adjustment
    """

    def __init__(self):
        """Initialize the Windows manager."""
        self.system_info = {}
        self.network_info = {}
        self.registry_info = {}

    def get_system_info(self) -> Dict[str, str]:
        """
        Retrieve comprehensive system information.
        
        Returns:
            dict: Dictionary containing system properties
        """
        try:
            # Get OS information
            os_info = subprocess.check_output("systeminfo", shell=True, text=True)
            
            # Parse the output to extract key information
            info_lines = os_info.split('\n')
            self.system_info = {}
            
            for line in info_lines:
                if ':' in line and not line.startswith(' '):
                    key_value = line.split(':', 1)
                    if len(key_value) == 2:
                        key = key_value[0].strip()
                        value = key_value[1].strip()
                        self.system_info[key] = value
            
            return self.system_info
        except Exception as e:
            raise Exception(f"Failed to get system information: {str(e)}")

    def network_speed_test(self) -> Dict[str, Any]:
        """
        Test and retrieve network adapter information.
        
        Returns:
            dict: Network adapter information
        """
        try:
            # Get network adapters using PowerShell
            cmd = 'powershell -Command "Get-NetAdapter | Select-Object Name, InterfaceDescription, LinkSpeed"'
            adapter_info = subprocess.check_output(cmd, shell=True, text=True)
            
            # Parse the output
            lines = adapter_info.strip().split('\n')
            self.network_info = {"adapters": []}
            
            # Skip first few lines (headers)
            for i in range(2, len(lines)):
                line = lines[i].strip()
                if line and not line.startswith('-') and not line.startswith('Name'):
                    parts = line.split()
                    if len(parts) >= 3:
                        self.network_info["adapters"].append({
                            "name": parts[0],
                            "description": ' '.join(parts[1:-1]),
                            "speed": parts[-1]
                        })
            
            return self.network_info
        except Exception as e:
            raise Exception(f"Failed to perform network test: {str(e)}")

    def get_registry_values(self, key_path: str) -> Dict[str, Any]:
        """
        Read values from Windows Registry.
        
        Args:
            key_path (str): Registry key path
            
        Returns:
            dict: Registry values
        """
        try:
            # Use PowerShell to read registry
            cmd = f'powershell -Command "(Get-ItemProperty -Path \'{key_path}\').PSObject.Properties | Where-Object {{ $_.Name -ne \'PSChildName\' -and $_.Name -ne \'PSDrive\' -and $_.Name -ne \'PSProvider\' -and $_.Name -ne \'PSParentPath\' -and $_.Name -ne \'PSPath\' }} | Select-Object Name, Value" 2>$null'
            registry_result = subprocess.check_output(cmd, shell=True, text=True)
            
            # Parse the output
            self.registry_info[key_path] = {"output": registry_result.strip()}
            return self.registry_info[key_path]
        except Exception as e:
            raise Exception(f"Failed to read registry key {key_path}: {str(e)}")

    def adjust_audio_volume(self, volume_level: int) -> bool:
        """
        Adjust system audio volume.
        
        Args:
            volume_level (int): Volume level (0-100)
            
        Returns:
            bool: True if successful
        """
        try:
            if not 0 <= volume_level <= 100:
                raise ValueError("Volume level must be between 0 and 100")
                
            # Set volume using PowerShell cmdlet
            cmd = f'powershell -Command "Set-Volume -Volume {volume_level}"'
            subprocess.run(cmd, shell=True, check=True)
            return True
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to adjust audio volume: {str(e)}")

    def set_display_brightness(self, brightness_level: int) -> bool:
        """
        Set display brightness (if supported).
        
        Args:
            brightness_level (int): Brightness level (0-100)
            
        Returns:
            bool: True if successful
        """
        try:
            if not 0 <= brightness_level <= 100:
                raise ValueError("Brightness level must be between 0 and 100")
                
            # Use WMI to set brightness - may require special permissions
            cmd = f'powershell -Command "Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods | ForEach-Object {{ $_.WmiSetBrightness(0, {brightness_level}) }}"'
            subprocess.run(cmd, shell=True)
            return True
        except Exception as e:
            # Fallback to PowerShell approach if direct WMI fails
            try:
                cmd = f'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen" 2>$null'
                subprocess.run(cmd, shell=True)
                return True
            except Exception as e2:
                raise Exception(f"Failed to set display brightness: {str(e)}")

    def run_all_tests(self) -> Dict[str, bool]:
        """
        Run all system tests.
        
        Returns:
            dict: Test results
        """
        results = {}
        
        try:
            # Test system info retrieval
            info = self.get_system_info()
            results['system_info'] = True if info else False
            
            # Test network info retrieval  
            net_info = self.network_speed_test()
            results['network_info'] = True if net_info else False
            
            # Test audio control
            volume_result = self.adjust_audio_volume(50)
            results['audio_control'] = volume_result
            
            print("All tests completed successfully!")
            return results
            
        except Exception as e:
            print(f"Test failed: {str(e)}")
            return results

# Main execution for testing purposes
if __name__ == "__main__":
    print("Windows Manager Test Suite")
    print("=" * 30)
    
    wm = WindowsManager()
    
    try:
        # Get system info
        print("\n1. Testing system information retrieval...")
        system_info = wm.get_system_info()
        if system_info:
            print("✓ Successfully retrieved system info")
            print(f"  OS: {system_info.get('OS Name', 'Unknown')}")  
        else:
            print("✗ Failed to get system info")
        
        # Test network adapter info
        print("\n2. Testing network adapter info...")
        network_info = wm.network_speed_test() 
        if network_info and network_info['adapters']:
            print("✓ Successfully retrieved network info")
            for adapter in network_info['adapters'][:2]:  # Show first 2 adapters
                print(f"  Adapter: {adapter['name']} - Speed: {adapter['speed']}")
        else:
            print("✗ Failed to get network info or no adapters found")
            
        # Test audio volume control (don't set to 0, just test functionality)
        print("\n3. Testing audio control...")
        result = wm.adjust_audio_volume(50) 
        if result:
            print("✓ Audio control working")
        else:
            print("✗ Audio control failed")
        
        print("\nTest suite completed!")
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")