#!/usr/bin/env python3
"""
Integration tests for Windows Manager library.
"""

import sys
import os

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from windows_manager import WindowsManager

def test_basic_import():
    """Test that the module can be imported."""
    try:
        wm = WindowsManager()
        print("✓ Basic import successful")
        return True
    except Exception as e:
        print(f"✗ Basic import failed: {e}")
        return False

def test_system_info():
    """Test system information retrieval."""
    try:
        wm = WindowsManager()
        system_info = wm.get_system_info()
        
        if system_info and 'OS Name' in system_info:
            print("✓ System info retrieval successful")
            print(f"  OS: {system_info['OS Name']}")
            return True
        else:
            print("✗ Failed to retrieve valid system info")
            return False
    except Exception as e:
        print(f"✗ System info test failed: {e}")
        return False

def test_network_info():
    """Test network adapter information retrieval."""
    try:
        wm = WindowsManager()
        network_info = wm.network_speed_test()
        
        if network_info and 'adapters' in network_info:
            print("✓ Network info retrieval successful")
            adapters = network_info['adapters']
            if adapters:
                print(f"  Found {len(adapters)} network adapters")
                for i, adapter in enumerate(adapters[:2]):  # Show first 2
                    print(f"    {i+1}. {adapter['name']}")
            else:
                print("  No network adapters found (this may be normal)")
            return True
        else:
            print("✗ Failed to retrieve valid network info")
            return False
    except Exception as e:
        print(f"✗ Network info test failed: {e}")
        return False

def test_audio_control():
    """Test audio volume control."""
    try:
        wm = WindowsManager()
        result = wm.adjust_audio_volume(50)
        
        if result:
            print("✓ Audio control test successful")
            return True
        else:
            print("✗ Audio control test failed (no error but returned False)")
            return False
    except Exception as e:
        print(f"✗ Audio control test failed: {e}")
        return False

def run_all_tests():
    """Run all integration tests."""
    print("Running Windows Manager Integration Tests")
    print("=" * 45)
    
    tests = [
        test_basic_import,
        test_system_info, 
        test_network_info,
        test_audio_control
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} raised exception: {e}")
    
    print("\n" + "=" * 45)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("✓ All tests passed!")
        return True
    else:
        print("✗ Some tests failed")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)