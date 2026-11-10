"""
OUI (Organizationally Unique Identifier) Database and Lookup Module.
Provides vendor resolution based on MAC address first 3 octets,
along with normalization and special MAC classification (Broadcast, Multicast, Randomized).
"""

from typing import Dict, Final

UNKNOWN_VENDOR: Final[str] = "Bilinmeyen Üretici"
BROADCAST_VENDOR: Final[str] = "Broadcast"
MULTICAST_VENDOR: Final[str] = "Multicast"
RANDOMIZED_MAC_VENDOR: Final[str] = "Rastgele/Özel MAC (Locally Administered)"

OUI_DATABASE: Dict[str, str] = {
    # Apple
    "00:1A:11": "Apple, Inc.",
    "00:1E:52": "Apple, Inc.",
    "F0:18:98": "Apple, Inc.",
    "AC:BC:32": "Apple, Inc.",
    "BC:D0:74": "Apple, Inc.",
    # Samsung
    "00:12:47": "Samsung Electronics",
    "00:15:99": "Samsung Electronics",
    "50:85:69": "Samsung Electronics",
    "A8:7B:39": "Samsung Electronics",
    "DC:71:44": "Samsung Electronics",
    # Intel
    "00:1B:21": "Intel Corporate",
    "00:21:6A": "Intel Corporate",
    "34:E6:D7": "Intel Corporate",
    "F8:63:3F": "Intel Corporate",
    # TP-Link
    "50:D4:F7": "TP-Link Corporation",
    "E8:48:B8": "TP-Link Corporation",
    "14:CC:20": "TP-Link Corporation",
    "54:AF:97": "TP-Link Corporation",
    # Xiaomi
    "64:09:80": "Xiaomi Communications",
    "74:51:BA": "Xiaomi Communications",
    "AC:C1:EE": "Xiaomi Communications",
    "D4:97:0B": "Xiaomi Communications",
    # ASUS
    "00:1D:60": "ASUSTek Computer",
    "04:D9:F5": "ASUSTek Computer",
    "10:BF:48": "ASUSTek Computer",
    "2C:4D:54": "ASUSTek Computer",
    # Diğer popüler üreticiler
    "B8:27:EB": "Raspberry Pi Foundation",
    "DC:A6:32": "Raspberry Pi Foundation",
    "00:50:56": "VMware, Inc.",
    "08:00:27": "Oracle VirtualBox",
    "70:85:C2": "Huawei Technologies",
    "00:0C:29": "VMware, Inc.",
}


def normalize_mac(mac: str) -> str:
    """
    Normalizes any MAC address representation to standard uppercase 'XX:XX:XX:XX:XX:XX'.
    Supports formats:
      - 00:11:22:33:44:55
      - 00-11-22-33-44-55
      - 0011.2233.4455
      - 001122334455
    Raises ValueError on None, empty string, invalid characters or wrong length.
    """
    if mac is None or not isinstance(mac, str):
        raise ValueError("MAC adresi geçerli bir metin olmalıdır.")
    s = mac.strip()
    if not s:
        raise ValueError("MAC adresi boş olamaz.")

    if ":" in s:
        parts = s.split(":")
        if len(parts) != 6:
            raise ValueError(f"Geçersiz MAC adresi formatı (6 bayt bekleniyor): {mac}")
        if any(len(p) != 2 or not all(c in "0123456789abcdefABCDEF" for c in p) for p in parts):
            raise ValueError(f"Geçersiz MAC karakterleri veya bayt uzunluğu: {mac}")
        hex_digits = "".join(parts)
    elif "-" in s:
        parts = s.split("-")
        if len(parts) != 6:
            raise ValueError(f"Geçersiz MAC adresi formatı (6 bayt bekleniyor): {mac}")
        if any(len(p) != 2 or not all(c in "0123456789abcdefABCDEF" for c in p) for p in parts):
            raise ValueError(f"Geçersiz MAC karakterleri veya bayt uzunluğu: {mac}")
        hex_digits = "".join(parts)
    elif "." in s:
        parts = s.split(".")
        if len(parts) != 3:
            raise ValueError(f"Geçersiz Cisco MAC formatı (3 grup bekleniyor): {mac}")
        if any(len(p) != 4 or not all(c in "0123456789abcdefABCDEF" for c in p) for p in parts):
            raise ValueError(f"Geçersiz MAC karakterleri veya grup uzunluğu: {mac}")
        hex_digits = "".join(parts)
    else:
        if len(s) != 12 or not all(c in "0123456789abcdefABCDEF" for c in s):
            raise ValueError(f"Geçersiz düz MAC adresi (12 onaltılık karakter bekleniyor): {mac}")
        hex_digits = s

    return ":".join(hex_digits[i : i + 2].upper() for i in range(0, 12, 2))


def is_broadcast_mac(mac: str) -> bool:
    """Returns True if the normalized MAC is FF:FF:FF:FF:FF:FF."""
    return normalize_mac(mac) == "FF:FF:FF:FF:FF:FF"


def is_multicast_mac(mac: str) -> bool:
    """Returns True if the MAC is a multicast address (LSB of 1st octet is 1)."""
    norm = normalize_mac(mac)
    first_byte = int(norm[:2], 16)
    return bool(first_byte & 0x01)


def is_locally_administered_mac(mac: str) -> bool:
    """
    Returns True if the MAC is locally administered / randomized (U/L bit = 1 in 1st octet).
    Second hex digit of first byte is 2, 6, A, or E (e.g., DA:xx, 02:xx, FE:xx).
    """
    norm = normalize_mac(mac)
    first_byte = int(norm[:2], 16)
    return bool(first_byte & 0x02)


def lookup_oui(mac: str) -> str:
    """
    Resolves the vendor name for the given MAC address string.
    Returns:
      - Vendor name string if in database
      - 'Broadcast' if FF:FF:FF:FF:FF:FF
      - 'Multicast' if multicast
      - 'Rastgele/Özel MAC (Locally Administered)' if locally administered bit is set
      - 'Bilinmeyen Üretici' if OUI is unknown
    Raises ValueError on invalid/malformed MAC address.
    """
    norm = normalize_mac(mac)
    if is_broadcast_mac(norm):
        return BROADCAST_VENDOR

    if is_multicast_mac(norm):
        return MULTICAST_VENDOR

    oui_prefix = norm[:8]
    if oui_prefix in OUI_DATABASE:
        return OUI_DATABASE[oui_prefix]

    if is_locally_administered_mac(norm):
        return RANDOMIZED_MAC_VENDOR

    return UNKNOWN_VENDOR
