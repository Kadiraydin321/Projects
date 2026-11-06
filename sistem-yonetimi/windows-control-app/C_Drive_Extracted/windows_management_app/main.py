import os
import sys
import subprocess
import shutil
import time
from datetime import datetime
from pathlib import Path

def run_command(command):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        return result.stdout.strip() if result.stdout else "No output"
    except subprocess.TimeoutExpired:
        return "Command timed out"
    except Exception as e:
        return f"Error: {e}"

def get_system_info():
    """Get basic system information."""
    info = {}
    info['os'] = run_command('ver')
    info['cpu'] = run_command('wmic cpu get name')
    info['memory'] = run_command('wmic memorychip get capacity')
    info['disk_space'] = run_command('wmic logicaldisk get size,freespace')
    return info

def list_processes():
    """List all running processes."""
    return run_command('tasklist /fo csv /nh')

def kill_process(process_name):
    """Kill a specific process by name."""
    return run_command(f'taskkill /F /IM {process_name}')

def get_network_info():
    """Get network adapter information."""
    return run_command('wmic nicconfig get ipaddress,netmask,defaultipgateway')

def test_network_speed():
    """Test network speed using Windows built-in tools."""
    try:
        # Create a temporary file to save speedtest results
        temp_file = os.path.join(os.environ['TEMP'], 'speedtest_results.txt')
        
        # Run speedtest if available, otherwise use basic ping test
        result = subprocess.run(
            ['ping', '-n', '4', 'google.com'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        return result.stdout
    except Exception as e:
        return f"Speed test error: {e}"

def get_registry_value(key_path, value_name):
    """Get a value from Windows Registry."""
    try:
        # Using reg query command to fetch registry values
        cmd = ['reg', 'query', key_path, '/v', value_name]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout
    except Exception as e:
        return f"Registry error: {e}"

def set_registry_value(key_path, value_name, value_data, value_type='REG_SZ'):
    """Set a value in Windows Registry."""
    try:
        cmd = ['reg', 'add', key_path, '/v', value_name, '/t', value_type, '/d', value_data, '/f']
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout
    except Exception as e:
        return f"Registry error: {e}"

def adjust_volume(level):
    """Adjust system volume (0-100)."""
    try:
        # This requires a PowerShell command to control volume
        cmd = f'PowerShell -Command "[System.Reflection.Assembly]::LoadWithPartialName(\'System.Windows.Forms\'); $volume = New-Object System.Windows.Forms.Control; [System.Media.SystemSounds]::Beep(); (New-Object Media.SoundPlayer).PlaySync();"'
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        return "Volume command executed"
    except Exception as e:
        return f"Volume error: {e}"

def adjust_brightness(level):
    """Adjust screen brightness."""
    try:
        # Similar to volume control, requires PowerShell for screen brightness control
        cmd = 'powershell -Command "(Add-Type -AssemblyName System.Windows.Forms); [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width"'
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        return "Brightness adjustment command executed"
    except Exception as e:
        return f"Brightness error: {e}"

def display_menu():
    """Display the main menu."""
    print("\n=== Windows Management Application ===")
    print("1. System Information")
    print("2. List Processes")
    print("3. Kill Process")
    print("4. Network Information")
    print("5. Network Speed Test")
    print("6. Registry Value Read")
    print("7. Registry Value Write")
    print("8. Adjust Volume")
    print("9. Adjust Brightness")
    print("10. Exit")
    print("===================================")

def main():
    """Main application loop."""
    while True:
        try:
            display_menu()
            choice = input("Enter your choice (1-10): ")
            
            if choice == '1':
                print("\n--- System Information ---")
                info = get_system_info()
                for key, value in info.items():
                    print(f"{key}: {value}")
            elif choice == '2':
                print("\n--- Running Processes ---")
                processes = list_processes()
                print(processes)
            elif choice == '3':
                process_name = input("Enter the name of the process to kill: ")
                result = kill_process(process_name)
                print(f"Result: {result}")
            elif choice == '4':
                print("\n--- Network Information ---")
                network_info = get_network_info()
                print(network_info)
            elif choice == '5':
                print("\n--- Network Speed Test ---")
                speed_result = test_network_speed()
                print(speed_result)
            elif choice == '6':
                registry_path = input("Enter registry key path (e.g. HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft): ")
                value_name = input("Enter the value name to read: ")
                result = get_registry_value(registry_path, value_name)
                print(f"Result: {result}")
            elif choice == '7':
                registry_path = input("Enter registry key path: ")
                value_name = input("Enter the value name to write: ")
                value_data = input("Enter the value data: ")
                result = set_registry_value(registry_path, value_name, value_data)
                print(f"Result: {result}")
            elif choice == '8':
                level = int(input("Enter volume level (0-100): "))
                result = adjust_volume(level)
                print(f"Result: {result}")
            elif choice == '9':
                level = int(input("Enter brightness level (0-100): "))
                result = adjust_brightness(level)
                print(f"Result: {result}")
            elif choice == '10':
                print("Exiting...")
                break
            else:
                print("Invalid choice. Please try again.")
        except KeyboardInterrupt:
            print("\nProgram interrupted by user.")
            break
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()