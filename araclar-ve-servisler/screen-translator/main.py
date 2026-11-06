import os
import sys

# Mevcut dizini sys.path'e ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from main_app import main, MainApplication
except ImportError:
    from .main_app import main, MainApplication

if __name__ == '__main__':
    main()
