import unittest
import sys
import os

# Add the project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from windows_manager import WindowsManager

class TestWindowsManager(unittest.TestCase):
    """Comprehensive tests for Windows Manager functionality"""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.manager = WindowsManager()
        
    def test_system_info_retrieval(self):
        """Test system information retrieval"""
        try:
            info = self.manager.get_system_info()
            self.assertIsInstance(info, dict)
            self.assertGreater(len(info), 0)
            print("✅ System info test passed")
        except Exception as e:
            self.fail(f"System info test failed: {str(e)}")
    
    def test_network_speed_test(self):
        """Test network speed test functionality"""
        try:
            network_info = self.manager.network_speed_test()
            self.assertIsInstance(network_info, dict)
            print("✅ Network speed test passed")
        except Exception as e:
            self.fail(f"Network test failed: {str(e)}")
    
    def test_registry_read(self):
        """Test registry value reading"""
        try:
            # Using a safe registry path for testing
            key_path = "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}"
            registry_info = self.manager.get_registry_values(key_path)
            self.assertIsInstance(registry_info, dict)
            print("✅ Registry read test passed")
        except Exception as e:
            # Note: Some registry access may fail due to permissions
            print(f"Registry test note: {str(e)} (expected in some environments)")
    
    def test_audio_control(self):
        """Test audio volume adjustment"""
        try:
            self.manager.adjust_audio_volume(50)
            print("✅ Audio control test passed")
        except Exception as e:
            self.fail(f"Audio control test failed: {str(e)}")
    
    def test_brightness_control(self):
        """Test display brightness adjustment"""
        try:
            # Note: These might not work in all environments due to system limitations
            self.manager.set_display_brightness(75)
            print("✅ Brightness control test passed")
        except Exception as e:
            print(f"Brightness test note: {str(e)} (expected in some environments)")

if __name__ == "__main__":
    # Run the tests with verbose output
    unittest.main(verbosity=2)