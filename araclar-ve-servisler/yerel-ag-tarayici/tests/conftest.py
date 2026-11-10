"""
Pytest Fixtures ve Test Verisi Yapılandırması (conftest.py).
Yerel ağ tarayıcı motorunun birim ve entegrasyon testlerinde kullanılan
örnek cihaz modelleri, mock yapıları ve sınır durum verileri.
"""

from typing import Any, Dict, List
import pytest

from scanner_core import DeviceInfo


@pytest.fixture
def sample_devices() -> List[DeviceInfo]:
    """Testler için standartlaştırılmış, gerçekçi cihaz listesi döndürür."""
    return [
        DeviceInfo(
            ip="192.168.1.1",
            mac="50:D4:F7:11:22:33",
            vendor="TP-Link Corporation",
            hostname="tplink-gateway.local",
            response_time_ms=1.45,
            status="reachable",
        ),
        DeviceInfo(
            ip="192.168.1.15",
            mac="AC:BC:32:44:55:66",
            vendor="Apple, Inc.",
            hostname="Mehmet-iPhone.local",
            response_time_ms=4.12,
            status="reachable",
        ),
        DeviceInfo(
            ip="192.168.1.20",
            mac="50:85:69:AA:BB:CC",
            vendor="Samsung Electronics",
            hostname="Galaxy-S24.local",
            response_time_ms=2.87,
            status="reachable",
        ),
        DeviceInfo(
            ip="192.168.1.35",
            mac="34:E6:D7:01:02:03",
            vendor="Intel Corporate",
            hostname="İş-İstasyonu-Örnek.lan",
            response_time_ms=0.89,
            status="reachable",
        ),
        DeviceInfo(
            ip="192.168.1.42",
            mac="64:09:80:77:88:99",
            vendor="Xiaomi Communications",
            hostname=None,
            response_time_ms=12.4,
            status="reachable",
        ),
        DeviceInfo(
            ip="192.168.1.50",
            mac="04:D9:F5:DE:AD:BE",
            vendor="ASUSTek Computer",
            hostname="ASUS-ROG-Laptop",
            response_time_ms=None,
            status="reachable",
        ),
        DeviceInfo(
            ip="192.168.1.99",
            mac="00:00:00:11:22:33",
            vendor="Bilinmeyen Üretici",
            hostname="Özel-Cihaz_Test_ğüşıöç",
            response_time_ms=5.5,
            status="reachable",
        ),
    ]


@pytest.fixture
def sample_device_dicts() -> List[Dict[str, Any]]:
    """Sözlük formatında cihaz verileri."""
    return [
        {
            "ip": "192.168.1.1",
            "mac": "50:D4:F7:11:22:33",
            "vendor": "TP-Link Corporation",
            "hostname": "tplink-gateway.local",
            "response_time_ms": 1.45,
            "status": "reachable",
        },
        {
            "ip": "192.168.1.15",
            "mac": "AC:BC:32:44:55:66",
            "vendor": "Apple, Inc.",
            "hostname": "Mehmet-iPhone.local",
            "response_time_ms": 4.12,
            "status": "reachable",
        },
        {
            "ip": "192.168.1.99",
            "mac": "00:00:00:11:22:33",
            "vendor": "Bilinmeyen Üretici",
            "hostname": "Türkçe-Karakter-İçeren-Cihaz-ğüşiöç",
            "response_time_ms": 5.5,
            "status": "reachable",
        },
    ]


@pytest.fixture
def empty_devices() -> List[DeviceInfo]:
    """Boş liste sınır durumu."""
    return []
