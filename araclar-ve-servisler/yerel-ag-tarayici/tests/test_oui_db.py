"""
Birim Testleri: OUI Veritabanı ve MAC Çözümleme (test_oui_db.py).
MAC adresi normalizasyonu, yayın/çoklu yayın ayrımı, rastgele/özel MAC tespiti
ve Apple, Samsung, Intel, TP-Link, Xiaomi, ASUS gibi bilinen üretici çözümlemeleri.
"""

import pytest

from oui_db import (
    BROADCAST_VENDOR,
    MULTICAST_VENDOR,
    OUI_DATABASE,
    RANDOMIZED_MAC_VENDOR,
    UNKNOWN_VENDOR,
    is_broadcast_mac,
    is_locally_administered_mac,
    is_multicast_mac,
    lookup_oui,
    normalize_mac,
)


@pytest.mark.unit
class TestMacNormalization:
    """MAC adreslerini standart XX:XX:XX:XX:XX:XX formatına dönüştürme testleri."""

    def test_normalize_standard_colon_format(self):
        """İki nokta ile ayrılmış standart MAC adresi."""
        raw = "00:11:22:33:44:55"
        assert normalize_mac(raw) == "00:11:22:33:44:55"

    def test_normalize_lowercase_to_uppercase(self):
        """Küçük harfli MAC adresi büyük harfe dönüştürülmeli."""
        raw = "ac:bc:32:00:aa:ff"
        assert normalize_mac(raw) == "AC:BC:32:00:AA:FF"

    def test_normalize_hyphen_separated_mac(self):
        """Tire ile ayrılmış Windows formatındaki MAC adresi."""
        raw = "50-D4-F7-11-22-33"
        assert normalize_mac(raw) == "50:D4:F7:11:22:33"

    def test_normalize_cisco_dot_notation(self):
        """Cisco formatındaki (aabb.ccdd.eeff) MAC adresi."""
        raw = "50d4.f711.2233"
        assert normalize_mac(raw) == "50:D4:F7:11:22:33"

    def test_normalize_raw_hex_string_without_delimiters(self):
        """Ayraçsız düz 12 karakterlik onaltılık metin."""
        raw = "508569AABBCC"
        assert normalize_mac(raw) == "50:85:69:AA:BB:CC"

    def test_normalize_strips_leading_trailing_whitespace(self):
        """Başta ve sonda yer alan boşluklar temizlenmeli."""
        raw = "   34:E6:D7:01:02:03 \t\n"
        assert normalize_mac(raw) == "34:E6:D7:01:02:03"

    @pytest.mark.parametrize(
        "invalid_mac",
        [
            "",  # Boş metin
            "   ",  # Sadece boşluk
            "00:11:22:33:44",  # Eksik bayt (5 bayt)
            "00:11:22:33:44:55:66",  # Fazla bayt (7 bayt)
            "00:11:22:33:44:ZZ",  # Onaltılık olmayan geçersiz karakter
            "GG:HH:II:JJ:KK:LL",  # Tamamen geçersiz harfler
            "192.168.1.1",  # IP adresi verilmesi durumu
        ],
    )
    def test_normalize_raises_value_error_for_invalid_mac(self, invalid_mac):
        """Geçersiz veya bozuk MAC adresleri ValueError fırlatmalı."""
        with pytest.raises(ValueError):
            normalize_mac(invalid_mac)

    def test_normalize_raises_type_error_for_none(self):
        """None girişi TypeError veya ValueError ile yakalanmalı."""
        with pytest.raises((TypeError, ValueError)):
            normalize_mac(None)  # type: ignore


@pytest.mark.unit
class TestSpecialMacClassifications:
    """Yayın (Broadcast), Çoklu Yayın (Multicast) ve Rastgele/Özel MAC adreslerinin tespiti."""

    def test_broadcast_mac_detection(self):
        """FF:FF:FF:FF:FF:FF yayın adresidir."""
        assert is_broadcast_mac("FF:FF:FF:FF:FF:FF") is True
        assert is_broadcast_mac("ff-ff-ff-ff-ff-ff") is True
        assert is_broadcast_mac("00:11:22:33:44:55") is False

    @pytest.mark.parametrize(
        "multicast_mac",
        [
            "01:00:5E:00:00:01",  # IPv4 Multicast
            "01:80:C2:00:00:00",  # Spanning Tree BPDU
            "33:33:00:00:00:01",  # IPv6 All Nodes Multicast
            "01-00-5E-7F-FF-FA",  # SSDP Multicast
        ],
    )
    def test_multicast_mac_detection(self, multicast_mac):
        """1. baytın en anlamsız biti (LSB) 1 olan adresler çoklu yayındır."""
        assert is_multicast_mac(multicast_mac) is True

    def test_unicast_mac_is_not_multicast(self):
        """Standart tekli yayın (unicast) adresleri multicast olmamalıdır."""
        assert is_multicast_mac("00:1A:11:22:33:44") is False
        assert is_multicast_mac("AC:BC:32:00:00:01") is False

    @pytest.mark.parametrize(
        "local_mac",
        [
            "DA:A1:19:11:22:33",  # 0xDA = 1101 1010 -> U/L bit = 1
            "02:00:00:00:00:01",  # 0x02 = 0000 0010 -> U/L bit = 1
            "FE:ED:FA:CE:00:01",  # 0xFE = 1111 1110 -> U/L bit = 1
            "16:22:33:44:55:66",  # 0x16 = 0001 0110 -> U/L bit = 1
        ],
    )
    def test_locally_administered_mac_detection(self, local_mac):
        """
        İlk baytın U/L (Universal/Local) biti 1 olan cihazlar (modern Android/iOS rastgele MAC'leri)
        tespit edilmelidir.
        """
        assert is_locally_administered_mac(local_mac) is True

    def test_globally_unique_mac_is_not_locally_administered(self):
        """Üretici tarafından atanan küresel tekil MAC adreslerinde U/L biti 0 olmalıdır."""
        assert is_locally_administered_mac("AC:BC:32:11:22:33") is False
        assert is_locally_administered_mac("00:1D:60:AA:BB:CC") is False


@pytest.mark.unit
class TestOuiLookup:
    """Bilinen üreticilerin (Apple, Samsung, Intel, TP-Link, Xiaomi, ASUS) çözümlenmesi."""

    @pytest.mark.parametrize(
        "mac, expected_vendor",
        [
            # Apple cihazları
            ("00:1A:11:AA:BB:CC", "Apple, Inc."),
            ("00:1E:52:12:34:56", "Apple, Inc."),
            ("F0:18:98:99:88:77", "Apple, Inc."),
            ("AC:BC:32:44:55:66", "Apple, Inc."),
            ("BC:D0:74:01:02:03", "Apple, Inc."),
            # Samsung cihazları
            ("00:12:47:11:22:33", "Samsung Electronics"),
            ("00:15:99:44:55:66", "Samsung Electronics"),
            ("50:85:69:AA:BB:CC", "Samsung Electronics"),
            ("A8:7B:39:00:11:22", "Samsung Electronics"),
            ("DC:71:44:77:88:99", "Samsung Electronics"),
            # Intel ağ kartları
            ("00:1B:21:55:66:77", "Intel Corporate"),
            ("00:21:6A:11:22:33", "Intel Corporate"),
            ("34:E6:D7:01:02:03", "Intel Corporate"),
            ("F8:63:3F:AA:BB:CC", "Intel Corporate"),
            # TP-Link yönlendiriciler
            ("50:D4:F7:11:22:33", "TP-Link Corporation"),
            ("E8:48:B8:22:33:44", "TP-Link Corporation"),
            ("14:CC:20:99:88:77", "TP-Link Corporation"),
            ("54:AF:97:55:44:33", "TP-Link Corporation"),
            # Xiaomi telefon ve IoT
            ("64:09:80:77:88:99", "Xiaomi Communications"),
            ("74:51:BA:12:34:56", "Xiaomi Communications"),
            ("AC:C1:EE:01:02:03", "Xiaomi Communications"),
            ("D4:97:0B:AA:BB:CC", "Xiaomi Communications"),
            # ASUS bilgisayar ve modemler
            ("00:1D:60:DE:AD:BE", "ASUSTek Computer"),
            ("04:D9:F5:EF:BE:AD", "ASUSTek Computer"),
            ("10:BF:48:00:11:22", "ASUSTek Computer"),
            ("2C:4D:54:33:44:55", "ASUSTek Computer"),
            # Raspberry Pi ve Sanallaştırma
            ("B8:27:EB:01:02:03", "Raspberry Pi Foundation"),
            ("00:50:56:AA:BB:CC", "VMware, Inc."),
            ("08:00:27:12:34:56", "Oracle VirtualBox"),
        ],
    )
    def test_lookup_known_vendors(self, mac, expected_vendor):
        """Tüm ana üreticiler 3 baytlık OUI önekiyle doğru çözümlenmelidir."""
        assert lookup_oui(mac) == expected_vendor

    def test_lookup_case_and_delimiter_insensitivity(self):
        """Büyük/küçük harf ve ayraç farkı aramayı etkilememelidir."""
        assert lookup_oui("ac-bc-32-44-55-66") == "Apple, Inc."
        assert lookup_oui("acbc.3244.5566") == "Apple, Inc."
        assert lookup_oui("50d4f7112233") == "TP-Link Corporation"

    def test_lookup_broadcast_address(self):
        """Yayın adresi özel olarak sınıflandırılmalıdır."""
        assert lookup_oui("FF:FF:FF:FF:FF:FF") == BROADCAST_VENDOR

    def test_lookup_multicast_address(self):
        """Çoklu yayın adresi özel olarak sınıflandırılmalıdır."""
        assert lookup_oui("01:00:5E:00:00:05") == MULTICAST_VENDOR

    def test_lookup_locally_administered_randomized_mac(self):
        """iOS/Android özel Wi-Fi adresi (randomized MAC) olarak işaretlenmelidir."""
        # 0xDA: Locally administered bit = 1, Multicast bit = 0
        assert lookup_oui("DA:A1:19:11:22:33") == RANDOMIZED_MAC_VENDOR

    def test_lookup_unknown_vendor(self):
        """Veritabanında bulunmayan küresel MAC adresi Bilinmeyen Üretici dönmelidir."""
        assert lookup_oui("00:00:00:12:34:56") == UNKNOWN_VENDOR

    def test_lookup_raises_for_invalid_mac(self):
        """Bozuk MAC adresi durumunda ValueError fırlatılmalıdır."""
        with pytest.raises(ValueError):
            lookup_oui("invalid-mac-address")
