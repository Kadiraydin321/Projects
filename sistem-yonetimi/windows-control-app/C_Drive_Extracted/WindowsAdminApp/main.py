import os
import sys
import subprocess
import platform
from datetime import datetime

class WindowsAdminApp:
    def __init__(self):
        self.app_name = "Windows Admin Tool"
        self.version = "1.0.0"
        self.log_file = "app_log.txt"
        
    def log_action(self, action):
        """Log actions to file"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {action}\n")
    
    def get_system_info(self):
        """Get basic system information"""
        self.log_action("Getting system information")
        info = {
            "OS": platform.platform(),
            "Architecture": platform.architecture()[0],
            "Processor": platform.processor(),
            "System": platform.system(),
            "Release": platform.release(),
            "Version": platform.version()
        }
        return info
    
    def run_command(self, command):
        """Run a Windows command"""
        self.log_action(f"Running command: {command}")
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
            return f"Error: {e.stderr}"
    
    def get_network_info(self):
        """Get network adapter information"""
        self.log_action("Getting network information")
        command = "ipconfig /all"
        return self.run_command(command)
    
    def get_disk_usage(self):
        """Get disk usage information"""
        self.log_action("Getting disk usage")
        command = "wmic logicaldisk get size,freespace,caption"
        return self.run_command(command)

def main():
    app = WindowsAdminApp()
    print(f"Welcome to {app.app_name} v{app.version}")
    
    while True:
        print("\n--- Main Menu ---")
        print("1. System Info")
        print("2. Network Info")
        print("3. Disk Usage")
        print("4. Run Custom Command")
        print("5. Exit")
        
        choice = input("Enter your choice (1-5): ")
        
        if choice == '1':
            info = app.get_system_info()
            for key, value in info.items():
                print(f"{key}: {value}")
                
        elif choice == '2':
            network_info = app.get_network_info()
            print(network_info)
            
        elif choice == '3':
            disk_info = app.get_disk_usage()
            print(disk_info)
            
        elif choice == '4':
            custom_command = input("Enter command to run: ")
            result = app.run_command(custom_command)
            print(result)
            
        elif choice == '5':
            print("Goodbye!")
            break
            
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()