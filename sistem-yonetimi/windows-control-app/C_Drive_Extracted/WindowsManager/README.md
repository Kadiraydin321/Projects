# Windows Manager

A comprehensive Python library for managing Windows system components including:
- System information retrieval
- Network adapter monitoring
- Registry access
- Audio volume control
- Display brightness adjustment

## Features

### Core Functionality
- Retrieve detailed system information
- Monitor network adapter status and performance  
- Access Windows registry values
- Control audio volume levels
- Adjust display brightness

### Installation

```bash
pip install windows-manager
```

### Usage Examples

```python
from windows_manager import WindowsManager

# Create manager instance
wm = WindowsManager()

# Get system information
system_info = wm.get_system_info()
print(f"OS: {system_info.get('OS Name', 'Unknown')}")

# Check network adapters
networks = wm.network_speed_test()
for adapter in networks.get('adapters', []):
    print(f"Adapter: {adapter['name']} - Speed: {adapter['speed']}")

# Control audio volume
wm.adjust_audio_volume(75)  # Set to 75%

# Control display brightness
wm.set_display_brightness(50)  # Set to 50%
```

## Requirements

- Python 3.6+
- Windows operating system
- PowerShell access

## Development

### Clone the repository
```bash
git clone https://github.com/yourusername/windows-manager.git
cd windows-manager
pip install -e .
```

### Run tests
```bash
python test_windows_manager.py
```

## License

MIT License