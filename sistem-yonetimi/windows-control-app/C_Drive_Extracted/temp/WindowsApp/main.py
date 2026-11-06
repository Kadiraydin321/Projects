import os
import sys
import subprocess
import platform
from datetime import datetime

class WindowsManager:
    def __init__(self):
        self.system = platform.system()
        
    def get_system_info(self):
        """Get basic system information"""
        return {
            'system': self.system,
            'node': platform.node(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'architecture': platform.architecture()[0]
        }
    
    def get_cpu_info(self):
        """Get CPU information using systeminfo command"""
        try:
            output = subprocess.check_output(['systeminfo'], shell=True, text=True)
            lines = output.split('\n')
            for line in lines:
                if 'Processor' in line:
                    return line.strip()
        except Exception as e:
            return f"Error retrieving CPU info: {str(e)}"
    
    def get_memory_info(self):
        """Get memory information using wmic command"""
        try:
            output = subprocess.check_output(['wmic', 'OS', 'get', 'TotalVisibleMemorySize'], shell=True, text=True)
            lines = output.split('\n')
            if len(lines) > 1:
                memory_mb = int(lines[1].strip()) // 1024
                return f"{memory_mb} MB"
        except Exception as e:
            return f"Error retrieving memory info: {str(e)}"
    
    def get_disk_info(self):
        """Get disk space information"""
        try:
            total, used, free = shutil.disk_usage("/")
            return {
                'total': f"{total // (2**30)} GB",
                'used': f"{used // (2**30)} GB",
                'free': f"{free // (2**30)} GB"
            }
        except Exception as e:
            return f"Error retrieving disk info: {str(e)}"
    
    def run_command(self, command):
        """Execute a shell command and return output"""
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            return {
                'success': True,
                'output': result.stdout,
                'error': result.stderr
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e)
            }

def main():
    print("Windows Management Utility v1.0")
    print("=" * 40)
    
    wm = WindowsManager()
    
    # Display system info
    print("\nSystem Information:")
    sys_info = wm.get_system_info()
    for key, value in sys_info.items():
        print(f"  {key.title()}: {value}")
    
    # Display CPU info
    print("\nCPU Information:")
    cpu_info = wm.get_cpu_info()
    print(f"  {cpu_info}")
    
    # Display memory info
    print("\nMemory Information:")
    mem_info = wm.get_memory_info()
    print(f"  {mem_info}")
    
    # Display disk info
    print("\nDisk Space:")
    disk_info = wm.get_disk_info()
    for key, value in disk_info.items():
        print(f"  {key.title()}: {value}")
    
    print("\nTasks:")
    print("1. View running processes")
    print("2. View network connections")
    print("3. View system services")
    print("4. Test internet connectivity")
    print("5. Exit")
    
    while True:
        choice = input("\nEnter your choice (1-5): ")
        if choice == '1':
            print("\nRunning processes:")
            result = wm.run_command('tasklist')
            if result['success']:
                print(result['output'])
            else:
                print(f"Error: {result['error']}")
        elif choice == '2':
            print("\nNetwork connections:")
            result = wm.run_command('netstat -an')
            if result['success']:
                print(result['output'])
            else:
                print(f"Error: {result['error']}")
        elif choice == '3':
            print("\nSystem services:")
            result = wm.run_command('sc query state= all')
            if result['success']:
                print(result['output'])
            else:
                print(f"Error: {result['error']}")
        elif choice == '4':
            print("\nTesting internet connectivity...")
            result = wm.run_command('ping google.com -n 1')
            if result['success']:
                print("Connection successful!")
            else:
                print(f"Connection failed: {result['error']}")
        elif choice == '5':
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()