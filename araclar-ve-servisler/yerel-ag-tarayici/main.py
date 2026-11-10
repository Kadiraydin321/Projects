import tkinter as tk
from ui.main_window import NetworkScannerApp

def main():
    root = tk.Tk()
    app = NetworkScannerApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
