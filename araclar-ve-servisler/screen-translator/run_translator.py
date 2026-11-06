import sys
import os

# Mevcut dizini sys.path'e ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main_app import main

if __name__ == '__main__':
    main()
