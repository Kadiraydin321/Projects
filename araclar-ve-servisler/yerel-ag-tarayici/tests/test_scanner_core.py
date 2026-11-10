"""
Birim Testleri: Ağ Tarayıcı Çekirdek Motoru (test_scanner_core.py).
Subnet hesaplayıcı, SendARP Windows API wrapper (mock ile), IP aralığı üreteci,
ana makine ve eşzamanlı (concurrent) ağ tarama motoru testleri.
"""

from unittest.mock import MagicMock, patch
import pytest

from scanner_core import (
    DeviceInfo,
    SubnetInfo,
    calculate_subnet,
    format_mac_from_bytes,
    generate_ip_range,
    resolve_hostname,
    scan_host,
    scan_network,
    send_arp_windows,
)


@pytest.mark.unit
class TestSubnetCalculation:
    """Alt ağ sınırları, maske ve host IP listesi hesaplama testleri."""

    def test_calculate_subnet_standard_c_class_cidr(self):
        """192.168.1.0/24 için standart 254 host hesabı."""
        info = calculate_subnet("192.168.1.0/24")

        assert isinstance(info, SubnetInfo)
        assert info.network_address == "192.168.1.0"
        assert info.broadcast_address == "192.168.1.255"
        assert info.netmask == "255.255.255.0"
        assert info.prefix_length == 24
        assert info.total_hosts == 254
        assert len(info.usable_hosts) == 254
        assert info.usable_hosts[0] == "192.168.1.1"
        assert info.usable_hosts[-1] == "192.168.1.254"

    def test_calculate_subnet_from_host_ip_in_network(self):
        """Ağ adresi yerine ağ içindeki bir host IP verildiğinde doğru ağ tespit edilmeli."""
        info = calculate_subnet("192.168.1.105/24")
        assert info.network_address == "192.168.1.0"
        assert info.broadcast_address == "192.168.1.255"
        assert info.usable_hosts[0] == "192.168.1.1"

    def test_calculate_subnet_with_explicit_netmask(self):
        """IP ve netmask ayrı parametreler olarak verildiğinde."""
        info = calculate_subnet("10.0.0.1", "255.255.255.0")
        assert info.network_address == "10.0.0.0"
        assert info.prefix_length == 24
        assert info.total_hosts == 254

    def test_calculate_subnet_small_point_to_point_slash_30(self):
        """/30 alt ağı: 2 adet kullanılabilir host içermelidir."""
        info = calculate_subnet("10.10.10.0/30")
        assert info.total_hosts == 2
        assert info.usable_hosts == ["10.10.10.1", "10.10.10.2"]

    def test_calculate_subnet_single_host_slash_32(self):
        """/32 tekil IP (point-to-point host)."""
        info = calculate_subnet("192.168.1.50/32")
        assert info.total_hosts == 1
        assert info.usable_hosts == ["192.168.1.50"]
        assert info.network_address == "192.168.1.50"

    def test_calculate_subnet_rfc3021_slash_31(self):
        """/31 noktadan noktaya bağlantı (RFC 3021)."""
        info = calculate_subnet("10.0.0.0/31")
        assert info.total_hosts == 2
        assert info.usable_hosts == ["10.0.0.0", "10.0.0.1"]

    @pytest.mark.parametrize(
        "invalid_input",
        [
            "192.168.1.0/33",  # 32'den büyük prefix
            "192.168.1.0/-1",  # Negatif prefix
            "999.999.999.999/24",  # Geçersiz IP
            "gecersiz_alt_ag",  # Alakasız metin
            "",  # Boş metin
        ],
    )
    def test_calculate_subnet_raises_for_invalid_input(self, invalid_input):
        """Geçersiz subnet tanımları ValueError fırlatmalıdır."""
        with pytest.raises(ValueError):
            calculate_subnet(invalid_input)


@pytest.mark.unit
class TestIpRangeGenerator:
    """IP aralığı üreteci (generate_ip_range) testleri."""

    def test_generate_ip_range_standard(self):
        """Belirtilen iki IP arasındaki ardışık liste."""
        ips = generate_ip_range("192.168.1.10", "192.168.1.14")
        expected = [
            "192.168.1.10",
            "192.168.1.11",
            "192.168.1.12",
            "192.168.1.13",
            "192.168.1.14",
        ]
        assert ips == expected

    def test_generate_ip_range_single_ip(self):
        """Başlangıç ve bitiş aynı IP olduğunda tek elemanlı liste dönmeli."""
        ips = generate_ip_range("10.0.0.1", "10.0.0.1")
        assert ips == ["10.0.0.1"]

    def test_generate_ip_range_crossing_octet_boundary(self):
        """Oktet sınırını (255 -> 0) aşan aralık hesabı."""
        ips = generate_ip_range("192.168.1.254", "192.168.2.2")
        expected = [
            "192.168.1.254",
            "192.168.1.255",
            "192.168.2.0",
            "192.168.2.1",
            "192.168.2.2",
        ]
        assert ips == expected

    def test_generate_ip_range_raises_when_start_greater_than_end(self):
        """Başlangıç IP'si bitiş IP'sinden büyükse ValueError fırlatılmalı."""
        with pytest.raises(ValueError):
            generate_ip_range("192.168.1.50", "192.168.1.20")

    def test_generate_ip_range_raises_for_invalid_ip(self):
        """Geçersiz IP girildiğinde ValueError fırlatılmalı."""
        with pytest.raises(ValueError):
            generate_ip_range("192.168.1.1", "gecersiz-ip")


@pytest.mark.unit
class TestFormatMacFromBytes:
    """Ham MAC bayt dizisini biçimlendirme testleri."""

    def test_format_mac_valid_bytes(self):
        """6 baytlık ham dizi iki nokta ile ayrılmış büyük harfli string olmalı."""
        raw_mac = b"\x50\xd4\xf7\x11\x22\x33"
        assert format_mac_from_bytes(raw_mac) == "50:D4:F7:11:22:33"

    def test_format_mac_zero_bytes(self):
        """Sıfırlardan oluşan 6 bayt."""
        raw_mac = b"\x00" * 6
        assert format_mac_from_bytes(raw_mac) == "00:00:00:00:00:00"

    def test_format_mac_broadcast_bytes(self):
        """Tüm bitleri 1 olan 6 bayt."""
        raw_mac = b"\xff" * 6
        assert format_mac_from_bytes(raw_mac) == "FF:FF:FF:FF:FF:FF"

    @pytest.mark.parametrize(
        "invalid_bytes",
        [
            b"\x00" * 5,  # 5 bayt (eksik)
            b"\x00" * 7,  # 7 bayt (fazla)
            b"",  # Boş bayt dizisi
        ],
    )
    def test_format_mac_raises_for_invalid_byte_length(self, invalid_bytes):
        """6 bayt dışındaki diziler ValueError fırlatmalıdır."""
        with pytest.raises(ValueError):
            format_mac_from_bytes(invalid_bytes)


@pytest.mark.unit
class TestSendArpWindowsMock:
    """Windows SendARP API çağrısının mock ile test edilmesi."""

    @patch("scanner_core.ctypes", create=True)
    def test_send_arp_success(self, mock_ctypes):
        """SendARP 0 (NO_ERROR) döndüğünde MAC ve DeviceInfo üretilmeli."""
        # Mock ctypes inet_addr ve SendARP yapılandırması
        mock_windll = MagicMock()
        mock_ctypes.windll.iphlpapi = mock_windll

        # SendARP çağrıldığında hedef tampona MAC yazsın ve 0 dönsün
        def side_effect_send_arp(dest_ip, src_ip, p_mac, p_len):
            # 6 baytlık TP-Link MAC simülasyonu: 50-D4-F7-11-22-33
            p_mac[0] = 0x50
            p_mac[1] = 0xD4
            p_mac[2] = 0xF7
            p_mac[3] = 0x11
            p_mac[4] = 0x22
            p_mac[5] = 0x33
            return 0  # NO_ERROR

        mock_windll.SendARP.side_effect = side_effect_send_arp

        result = send_arp_windows("192.168.1.1", timeout_ms=500)

        assert result is not None
        assert isinstance(result, DeviceInfo)
        assert result.ip == "192.168.1.1"
        assert result.mac == "50:D4:F7:11:22:33"
        assert result.status == "reachable"
        assert result.response_time_ms is not None
        assert result.response_time_ms >= 0

    @patch("scanner_core.ctypes", create=True)
    def test_send_arp_unreachable_host(self, mock_ctypes):
        """Cihaz kapalı veya ulaşılamaz olduğunda (SendARP 31: ERROR_GEN_FAILURE) None dönmeli."""
        mock_windll = MagicMock()
        mock_ctypes.windll.iphlpapi = mock_windll
        mock_windll.SendARP.return_value = 31  # ERROR_GEN_FAILURE

        result = send_arp_windows("192.168.1.250", timeout_ms=300)
        assert result is None

    @patch("scanner_core.ctypes", create=True)
    def test_send_arp_handles_os_error_gracefully(self, mock_ctypes):
        """Beklenmeyen ctypes veya sistem hatalarında program çökmeyip None dönmeli."""
        mock_windll = MagicMock()
        mock_ctypes.windll.iphlpapi = mock_windll
        mock_windll.SendARP.side_effect = OSError("Ctypes failure")

        result = send_arp_windows("192.168.1.1")
        assert result is None

    def test_send_arp_raises_value_error_for_invalid_ip(self):
        """Geçersiz IP adresi verildiğinde ValueError fırlatılmalı."""
        with pytest.raises(ValueError):
            send_arp_windows("999.999.999.999")


@pytest.mark.unit
class TestResolveHostname:
    """DNS ters çözümleme (PTR) testleri."""

    @patch("socket.gethostbyaddr")
    def test_resolve_hostname_success(self, mock_dns):
        """DNS yanıt verdiğinde hostname başarıyla dönmeli."""
        mock_dns.return_value = ("modem.ev.lan", [], ["192.168.1.1"])
        assert resolve_hostname("192.168.1.1") == "modem.ev.lan"

    @patch("socket.gethostbyaddr")
    def test_resolve_hostname_not_found(self, mock_dns):
        """Host çözülemediğinde None dönmelidir."""
        import socket
        mock_dns.side_effect = socket.herror(1, "Unknown host")
        assert resolve_hostname("192.168.1.200") is None


@pytest.mark.unit
class TestScanHost:
    """Tekil ana makine tarama testleri."""

    @patch("scanner_core.send_arp_windows")
    @patch("scanner_core.resolve_hostname")
    def test_scan_host_reachable_with_hostname(self, mock_dns, mock_arp):
        """Ulaşılabilen ve ismi çözülen cihaz."""
        mock_arp.return_value = DeviceInfo(
            ip="192.168.1.15",
            mac="AC:BC:32:44:55:66",
            vendor="Apple, Inc.",
            hostname=None,
            response_time_ms=3.5,
            status="reachable",
        )
        mock_dns.return_value = "Ahmet-MacBook.local"

        result = scan_host("192.168.1.15", resolve_names=True)

        assert result is not None
        assert result.ip == "192.168.1.15"
        assert result.vendor == "Apple, Inc."
        assert result.hostname == "Ahmet-MacBook.local"

    @patch("scanner_core.send_arp_windows")
    def test_scan_host_unreachable(self, mock_arp):
        """Ulaşılamayan host durumunda None dönmelidir."""
        mock_arp.return_value = None
        result = scan_host("192.168.1.222")
        assert result is None


@pytest.mark.integration
class TestScanNetworkConcurrent:
    """Çoklu iş parçacığı (ThreadPoolExecutor) ile eşzamanlı ağ tarama testleri."""

    @patch("scanner_core.scan_host")
    def test_scan_network_discovers_and_sorts_devices(self, mock_scan):
        """Taranan IP'lerden aktif olanlar tespit edilmeli ve IP'ye göre sıralanmalıdır."""
        # 3 IP taranıyor: .1 aktif, .2 kapalı, .3 aktif
        device_1 = DeviceInfo("192.168.1.1", "50:D4:F7:11:22:33", "TP-Link Corporation")
        device_3 = DeviceInfo("192.168.1.3", "AC:BC:32:44:55:66", "Apple, Inc.")

        def mock_scan_side_effect(ip, timeout_ms=1000, resolve_names=False):
            if ip == "192.168.1.1":
                return device_1
            elif ip == "192.168.1.3":
                return device_3
            return None

        mock_scan.side_effect = mock_scan_side_effect

        targets = ["192.168.1.3", "192.168.1.2", "192.168.1.1"]
        discovered = scan_network(targets, max_workers=4)

        assert len(discovered) == 2
        # IP sırasına göre kontrol
        assert discovered[0].ip == "192.168.1.1"
        assert discovered[1].ip == "192.168.1.3"

    @patch("scanner_core.scan_host")
    def test_scan_network_progress_callback(self, mock_scan):
        """Her IP tarandığında ilerleme (progress) geri çağrımı çalışmalıdır."""
        mock_scan.return_value = None
        targets = ["192.168.1.1", "192.168.1.2", "192.168.1.3"]

        calls = []

        def on_progress(completed, total, device):
            calls.append((completed, total, device))

        scan_network(targets, max_workers=2, progress_callback=on_progress)

        assert len(calls) == 3
        # Son çağrıda tamamlanan sayısı hedefe eşit olmalıdır
        assert calls[-1][0] == 3
        assert calls[-1][1] == 3

    def test_scan_network_empty_targets(self):
        """Hedef listesi boş olduğunda boş liste dönmelidir."""
        assert scan_network([]) == []
