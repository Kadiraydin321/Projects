import subprocess
import sys
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_powershell_script(script: str) -> subprocess.CompletedProcess:
    """
    Run a PowerShell script and return the result.
    
    Args:
        script (str): PowerShell script to execute
        
    Returns:
        subprocess.CompletedProcess: Result of the PowerShell execution
    """
    try:
        # Execute PowerShell script
        result = subprocess.run(
            ['powershell', '-Command', script],
            capture_output=True,
            text=True,
            check=True
        )
        return result
    except subprocess.CalledProcessError as e:
        logger.error(f"PowerShell script execution failed: {e}")
        raise

def get_driver_updates() -> List[Dict[str, Any]]:
    """
    Get available driver updates using winget.
    
    Returns:
        List[Dict[str, Any]]: List of available driver updates
    """
    logger.info("Checking for driver updates...")
    
    try:
        # Use winget to list available updates including drivers
        result = run_powershell_script("winget upgrade --source winget")
        
        # Parse the output to extract driver information
        lines = result.stdout.strip().split('\n')
        updates = []
        
        for line in lines:
            if 'Microsoft' in line or 'Driver' in line or 'driver' in line:
                updates.append({
                    'name': line.strip(),
                    'type': 'driver'
                })
                
        logger.info(f"Found {len(updates)} driver updates")
        return updates
    except Exception as e:
        logger.error(f"Error checking driver updates: {e}")
        return []

def get_system_updates() -> List[Dict[str, Any]]:
    """
    Get available system updates using PowerShell.
    
    Returns:
        List[Dict[str, Any]]: List of available system updates
    """
    logger.info("Checking for system updates...")
    
    try:
        # Use PowerShell to check for Windows Updates
        script = '''
        $updates = Get-WindowsUpdate -AcceptAll -NoReboot
        $updates | ForEach-Object {
            Write-Output $_.Title
        }
        '''
        
        result = run_powershell_script(script)
        lines = result.stdout.strip().split('\n')
        updates = []
        
        for line in lines:
            if line.strip():
                updates.append({
                    'name': line.strip(),
                    'type': 'system'
                })
                
        logger.info(f"Found {len(updates)} system updates")
        return updates
    except Exception as e:
        logger.error(f"Error checking system updates: {e}")
        return []

def install_updates(updates: List[Dict[str, Any]]) -> bool:
    """
    Install the specified updates using winget.
    
    Args:
        updates (List[Dict[str, Any]]): List of updates to install
        
    Returns:
        bool: True if installation successful, False otherwise
    """
    logger.info(f"Installing {len(updates)} updates...")
    
    try:
        for update in updates:
            name = update.get('name', '')
            if not name:
                continue
                
            # Use winget to install the specific update
            script = f'winget install "{name}" --source winget'
            result = run_powershell_script(script)
            
            logger.info(f"Installed: {name}")
            
        logger.info("All updates installed successfully")
        return True
    except Exception as e:
        logger.error(f"Error installing updates: {e}")
        return False

def main():
    """
    Main function to check and install updates.
    """
    logger.info("Starting update manager...")
    
    try:
        # Get driver updates
        drivers = get_driver_updates()
        
        # Get system updates
        systems = get_system_updates()
        
        # Combine all updates
        all_updates = drivers + systems
        
        if not all_updates:
            logger.info("No updates available")
            return
            
        logger.info(f"Found {len(all_updates)} updates to install")
        
        # Install all updates
        success = install_updates(all_updates)
        
        if success:
            logger.info("All updates installed successfully!")
        else:
            logger.error("Some updates failed to install")
            
    except Exception as e:
        logger.error(f"Error in main function: {e}")

if __name__ == "__main__":
    main()