import os
import shutil
import subprocess
import sys
from pathlib import Path

def clean_temp_files():
    """Clean temporary files from Windows Temp directory."""
    try:
        temp_dir = Path(os.environ.get('TEMP', 'C:\\Windows\\Temp'))
        if not temp_dir.exists():
            print(f"Temporary directory does not exist: {temp_dir}")
            return False
            
        cleaned_count = 0
        for item in temp_dir.iterdir():
            try:
                if item.is_file():
                    item.unlink()
                    cleaned_count += 1
                elif item.is_dir():
                    shutil.rmtree(item)
                    cleaned_count += 1
            except (PermissionError, OSError) as e:
                print(f"Warning: Could not delete {item}: {e}")
                continue
                
        print(f"Cleaned {cleaned_count} items from temporary directory.")
        return True
        
    except Exception as e:
        print(f"Error cleaning temp files: {e}")
        return False

def clean_recycle_bin():
    """Clean the Recycle Bin."""
    try:
        if sys.platform == "win32":
            # Use PowerShell to clear Recycle Bin
            subprocess.run([
                'powershell', '-Command', 
                'Clear-RecycleBin -Force'
            ], check=True, capture_output=True)
            print("Recycle Bin cleaned successfully.")
            return True
        else:
            print("Recycle Bin cleaning is only supported on Windows.")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"Error cleaning Recycle Bin: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def flush_dns_cache():
    """Flush DNS cache."""
    try:
        if sys.platform == "win32":
            subprocess.run([
                'ipconfig', '/flushdns'
            ], check=True, capture_output=True)
            print("DNS cache flushed successfully.")
            return True
        else:
            print("DNS cache flushing is only supported on Windows.")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"Error flushing DNS cache: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def main():
    """Main function to run all cleaning operations."""
    print("Starting system cleanup...")
    
    success_count = 0
    total_operations = 3
    
    if clean_temp_files():
        success_count += 1
        
    if clean_recycle_bin():
        success_count += 1
        
    if flush_dns_cache():
        success_count += 1
    
    print(f"\nCleaning completed. {success_count}/{total_operations} operations successful.")
    
if __name__ == "__main__":
    main()