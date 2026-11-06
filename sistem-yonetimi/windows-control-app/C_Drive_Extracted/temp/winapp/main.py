import os
import sys
import subprocess
import platform

def check_windows():
    return platform.system() == "Windows"

def run_command(command):
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        return f"Error: {e}"

def get_system_info():
    if not check_windows():
        return "This tool only works on Windows"
    
    info = {
        "OS": run_command("systeminfo | findstr /B /C:\"OS Name\""),
        "Version": run_command("systeminfo | findstr /B /C:\"OS Version\""),
        "Processor": run_command("wmic cpu get name | findstr /v \"Name\""),
        "RAM": run_command("wmic memorychip get capacity | findstr /v \"Capacity\"")
    }
    
    return info

def main():
    print("Windows Management Tool v1.0")
    print("=" * 30)
    
    if not check_windows():
        print("This tool only works on Windows systems.")
        return
    
    print("System Information:")
    info = get_system_info()
    for key, value in info.items():
        print(f"{key}: {value.strip()}")

if __name__ == "__main__":
    main()