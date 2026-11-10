import ctypes
import socket
import struct
import time
from typing import Optional, Tuple

class WindowsArpScanner:
    """Windows iphlpapi.dll SendARP API'sini kullanan yerel ARP tarayıcısı."""

    def __init__(self):
        try:
            self._send_arp = ctypes.windll.iphlpapi.SendARP
        except AttributeError:
            self._send_arp = None

    def scan_ip(self, ip_address: str, timeout_sec: float = 0.5) -> Optional[Tuple[str, float]]:
        """
        Belirtilen IP adresine ARP isteği gönderir.
        Başarılıysa (mac_adresi, yanit_suresi_ms) döndürür; yanıt yoksa None döndürür.
        """
        if not self._send_arp:
            return None

        try:
            dest_ip = struct.unpack('<I', socket.inet_aton(ip_address))[0]
        except (socket.error, struct.error):
            return None

        mac_buf = (ctypes.c_byte * 6)()
        mac_len = ctypes.c_ulong(6)

        t_start = time.perf_counter()
        try:
            res = self._send_arp(dest_ip, 0, ctypes.byref(mac_buf), ctypes.byref(mac_len))
            t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

            if res == 0:
                mac_bytes = bytearray(mac_buf)
                mac_str = ":".join(f"{b & 0xFF:02X}" for b in mac_bytes)
                return mac_str, round(t_elapsed_ms, 2)
        except Exception:
            return None

        return None
