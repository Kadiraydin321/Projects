#!/usr/bin/env python3
"""
Basic usage example for Windows Manager library.
"""

from windows_manager import WindowsManager

def main():
    print("Windows Manager - Basic Usage Example")
    print("=" * 40)
    
    # Create manager instance
    wm = WindowsManager()
    
    try:
        # Get system information
        print("\n1. System Information:")
        system_info = wm.get_system_info()
        
        if system_info:
            for key, value in list(system_info.items())[:5]:  # Show first 5 items
                print(f"  {key}: {value}")
        else:
            print("  No system info available")
            
        # Get network adapters
        print("\n2. Network Adapters:")
        network_info = wm.network_speed_test()
        
        if network_info and network_info['adapters']:
            for adapter in network_info['adapters']:
                print(f"  {adapter['name']}: {adapter['speed']}")
        else:
            print("  No network adapters found or error occurred")
            
        # Control audio volume (set to 60%)
        print("\n3. Audio Control:")
        if wm.adjust_audio_volume(60):
            print("  ✓ Volume set to 60%")
        else:
            print("  ✗ Failed to set volume")
            
        print("\nExample usage completed successfully!")
        
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    main()