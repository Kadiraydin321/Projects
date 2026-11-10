#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GhIDA Environment & Integration Diagnostic Checker
Verifies Python version, dependencies, IDA Pro integration, Ghidra installation, and configuration.
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile

# ANSI color codes
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_banner():
    banner = f"""{CYAN}{BOLD}
======================================================================
       GhIDA Environment & Integration Diagnostic Tool
======================================================================{RESET}"""
    print(banner)

def log_status(status, component, message):
    if status == "OK":
        symbol = f"{GREEN}[OK]{RESET}"
    elif status == "WARN":
        symbol = f"{YELLOW}[WARN]{RESET}"
    else:
        symbol = f"{RED}[FAIL]{RESET}"
    print(f"  {symbol} {BOLD}{component:<22}{RESET}: {message}")

def check_python():
    v = sys.version_info
    ver_str = f"{v.major}.{v.minor}.{v.micro}"
    if v.major >= 3:
        log_status("OK", "Python Version", f"Python {ver_str} detected (64-bit: {sys.maxsize > 2**32})")
        return True
    elif v.major == 2 and v.minor >= 7:
        log_status("WARN", "Python Version", f"Python {ver_str} detected (Python 2.7 legacy mode)")
        return True
    else:
        log_status("FAIL", "Python Version", f"Unsupported Python {ver_str}. Python 3.8+ or 2.7 required.")
        return False

def check_dependency(pkg_name):
    try:
        mod = __import__(pkg_name)
        ver = getattr(mod, "__version__", "installed")
        log_status("OK", f"Package '{pkg_name}'", f"v{ver} found ({os.path.dirname(getattr(mod, '__file__', ''))})")
        return True
    except ImportError:
        log_status("FAIL", f"Package '{pkg_name}'", f"Not installed. Install via: pip install {pkg_name}")
        return False

def check_java():
    java_cmd = shutil.which("java")
    if not java_cmd:
        log_status("WARN", "Java Runtime", "java executable not found on PATH. Ghidra requires Java 11+ or 17+ (JDK/JRE).")
        return False
    try:
        proc = subprocess.run([java_cmd, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
        out = proc.stderr if proc.stderr else proc.stdout
        first_line = out.splitlines()[0] if out else "Unknown Java version"
        log_status("OK", "Java Runtime", f"{first_line} found at {java_cmd}")
        return True
    except Exception as e:
        log_status("WARN", "Java Runtime", f"Error checking Java version: {e}")
        return False

def check_config(config_file=None):
    if not config_file:
        config_file = os.path.join(tempfile.gettempdir(), "ghida_config.json")
    
    if not os.path.isfile(config_file):
        log_status("WARN", "GhIDA Config", f"Config file not found at {config_file} (Will be created on first launch or by installer)")
        return None
    
    try:
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except UnicodeDecodeError:
            with open(config_file, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
        
        ghidra_path = data.get("GHIDRA_INSTALLATION_PATH", "")
        use_server = data.get("USE_GHIDRA_SERVER", False)
        server_url = data.get("GHIDRA_SERVER_URL", "")
        
        details = []
        if use_server:
            details.append(f"Server Mode: {server_url}")
        elif ghidra_path:
            details.append(f"Local Ghidra: {ghidra_path}")
        else:
            details.append("No Ghidra path configured")

        log_status("OK", "GhIDA Config", f"Valid JSON at {config_file} ({', '.join(details)})")
        return data
    except Exception as e:
        log_status("FAIL", "GhIDA Config", f"Corrupt config at {config_file}: {e}")
        return None

def check_ghidra_installation(ghidra_path):
    if not ghidra_path:
        log_status("WARN", "Ghidra Path", "Ghidra path not specified. Autodetecting or manual setup needed.")
        return False
    
    if not os.path.isdir(ghidra_path):
        log_status("FAIL", "Ghidra Path", f"Directory does not exist: {ghidra_path}")
        return False
    
    is_windows = platform.system() == "Windows"
    bat_name = "analyzeHeadless.bat" if is_windows else "analyzeHeadless"
    headless_path = os.path.join(ghidra_path, "support", bat_name)
    
    if not os.path.isfile(headless_path):
        # Also check direct folder
        direct_headless = os.path.join(ghidra_path, bat_name)
        if os.path.isfile(direct_headless):
            log_status("WARN", "Ghidra Path", f"Headless script found in root, expected in support/ folder: {direct_headless}")
            return True
        log_status("FAIL", "Ghidra Path", f"{bat_name} not found at {headless_path}")
        return False
    
    log_status("OK", "Ghidra Path", f"Found valid Ghidra headless binary at {headless_path}")
    return True

def check_ida_plugins(ida_path):
    if not ida_path:
        # Check standard user plugin path on Windows
        appdata = os.environ.get("APPDATA")
        if appdata:
            user_plugin_dir = os.path.join(appdata, "Hex-Rays", "IDA Pro", "plugins")
            if os.path.isdir(user_plugin_dir):
                ida_path = user_plugin_dir
    
    if not ida_path:
        log_status("WARN", "IDA Pro Plugins", "No IDA installation or plugins directory provided for verification.")
        return False
    
    plugin_dir = ida_path if ida_path.lower().endswith("plugins") else os.path.join(ida_path, "plugins")
    
    if not os.path.isdir(plugin_dir):
        log_status("WARN", "IDA Pro Plugins", f"Plugins directory does not exist: {plugin_dir}")
        return False
    
    ghida_file = os.path.join(plugin_dir, "ghida.py")
    ghida_folder = os.path.join(plugin_dir, "ghida_plugin")
    
    has_file = os.path.isfile(ghida_file)
    has_folder = os.path.isdir(ghida_folder)
    
    if has_file and has_folder:
        log_status("OK", "IDA Pro Plugins", f"GhIDA is correctly installed in {plugin_dir}")
        return True
    elif has_file or has_folder:
        log_status("WARN", "IDA Pro Plugins", f"Partial GhIDA installation in {plugin_dir} (ghida.py: {has_file}, ghida_plugin/: {has_folder})")
        return False
    else:
        log_status("WARN", "IDA Pro Plugins", f"GhIDA is not installed in {plugin_dir}")
        return False

def main():
    parser = argparse.ArgumentParser(description="GhIDA Environment Diagnostic Checker")
    parser.add_argument("--ida-path", "-i", help="Path to IDA Pro installation or plugins directory")
    parser.add_argument("--ghidra-path", "-g", help="Path to Ghidra root installation directory")
    parser.add_argument("--config-file", "-c", help="Path to ghida_config.json file")
    args = parser.parse_args()

    print_banner()
    print(f"\n{BOLD}[1] Python Environment & Dependencies{RESET}")
    py_ok = check_python()
    req_ok = check_dependency("requests")
    pyg_ok = check_dependency("pygments")

    print(f"\n{BOLD}[2] System Runtimes & Ghidra Prerequisites{RESET}")
    java_ok = check_java()

    print(f"\n{BOLD}[3] GhIDA Configuration File{RESET}")
    config_data = check_config(args.config_file)

    print(f"\n{BOLD}[4] Ghidra Installation Verification{RESET}")
    ghidra_path_to_test = args.ghidra_path
    if not ghidra_path_to_test and config_data:
        ghidra_path_to_test = config_data.get("GHIDRA_INSTALLATION_PATH")
    ghidra_ok = check_ghidra_installation(ghidra_path_to_test)

    print(f"\n{BOLD}[5] IDA Pro Plugin Integration{RESET}")
    ida_ok = check_ida_plugins(args.ida_path)

    print(f"\n{BOLD}======================================================================{RESET}")
    all_ready = py_ok and req_ok and pyg_ok and ida_ok
    if all_ready:
        print(f"{GREEN}{BOLD}[SUCCESS] GhIDA environment is fully configured and ready to use in IDA Pro!{RESET}")
        print(f"  -> Hotkey: {BOLD}Ctrl+Alt+D{RESET}")
        print(f"  -> Menu  : {BOLD}Edit > Plugins > GhIDA Decompiler{RESET}\n")
        return 0
    else:
        print(f"{YELLOW}{BOLD}[INFO] Diagnostics finished. Review items marked [FAIL] or [WARN] above.{RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
