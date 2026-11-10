"""
Birim Testleri: Cihaz Verilerini Dışa ve İçe Aktarma (test_exporter.py).
JSON ve CSV formatlarında veri kaybı olmadan dışa ve içe aktarma,
Türkçe karakter (UTF-8) bütünlüğü, tırnak/virgül sarma ve round-trip doğruluk testleri.
"""

import io
from pathlib import Path
import pytest

from exporter import (
    device_to_dict,
    export_to_csv,
    export_to_json,
    import_from_csv,
    import_from_json,
)
from scanner_core import DeviceInfo


@pytest.mark.unit
class TestDeviceToDict:
    """Cihaz veri modelini standart sözlüğe çevirme testleri."""

    def test_device_to_dict_from_dataclass(self):
        """DeviceInfo dataclass nesnesini doğru sözlüğe dönüştürmelidir."""
        device = DeviceInfo(
            ip="192.168.1.1",
            mac="50:D4:F7:11:22:33",
            vendor="TP-Link Corporation",
            hostname="gateway.lan",
            response_time_ms=1.2,
            status="reachable",
        )
        d = device_to_dict(device)
        assert isinstance(d, dict)
        assert d["ip"] == "192.168.1.1"
        assert d["mac"] == "50:D4:F7:11:22:33"
        assert d["vendor"] == "TP-Link Corporation"
        assert d["hostname"] == "gateway.lan"
        assert d["response_time_ms"] == 1.2
        assert d["status"] == "reachable"

    def test_device_to_dict_from_dict(self):
        """Halihazırda sözlük olan girdiyi doğrulayıp kopyalamalıdır."""
        raw = {
            "ip": "10.0.0.5",
            "mac": "AC:BC:32:00:11:22",
            "vendor": "Apple, Inc.",
            "hostname": None,
            "response_time_ms": None,
            "status": "reachable",
        }
        d = device_to_dict(raw)
        assert d["ip"] == "10.0.0.5"
        assert d["mac"] == "AC:BC:32:00:11:22"

    def test_device_to_dict_raises_for_invalid_input(self):
        """None veya eksik alanlı geçersiz nesneler ValueError veya TypeError fırlatmalıdır."""
        with pytest.raises((ValueError, TypeError)):
            device_to_dict(None)  # type: ignore

        with pytest.raises((ValueError, KeyError)):
            device_to_dict({"yanlis_alan": 123})


@pytest.mark.unit
class TestJsonExportImport:
    """JSON formatında dışa ve içe aktarma testleri."""

    def test_export_to_json_string(self, sample_devices):
        """JSON metni oluşturma ve geçerlilik testi."""
        json_str = export_to_json(sample_devices)
        assert isinstance(json_str, str)
        assert "192.168.1.1" in json_str
        assert "TP-Link Corporation" in json_str

    def test_export_to_json_preserves_turkish_characters(self, sample_devices):
        """Türkçe karakterler (ğ, ü, ş, ı, ö, ç, İ) Unicode kaçışına uğramadan UTF-8 yazılmalıdır."""
        json_str = export_to_json(sample_devices)
        # ensure_ascii=False doğrulama: \u011f yerine doğrudan 'ğ' olmalı
        assert "İş-İstasyonu-Örnek.lan" in json_str
        assert "ğüşıöç" in json_str
        assert "\\u" not in json_str  # Ham karakterler korunmalı

    def test_export_to_json_file(self, sample_devices, tmp_path: Path):
        """Hedef dosya yoluna UTF-8 olarak yazma."""
        out_file = tmp_path / "devices.json"
        export_to_json(sample_devices, target=out_file)

        assert out_file.exists()
        content = out_file.read_text(encoding="utf-8")
        assert "İş-İstasyonu-Örnek.lan" in content

    def test_import_from_json_string(self, sample_devices):
        """JSON metninden listeye geri dönüştürme."""
        json_str = export_to_json(sample_devices)
        loaded = import_from_json(json_str)

        assert isinstance(loaded, list)
        assert len(loaded) == len(sample_devices)
        assert loaded[0]["ip"] == sample_devices[0].ip
        assert loaded[0]["mac"] == sample_devices[0].mac

    def test_import_from_json_file(self, sample_devices, tmp_path: Path):
        """JSON dosyasından içe aktarma."""
        out_file = tmp_path / "devices.json"
        export_to_json(sample_devices, target=out_file)

        loaded = import_from_json(out_file)
        assert len(loaded) == len(sample_devices)
        assert loaded[3]["hostname"] == "İş-İstasyonu-Örnek.lan"

    def test_import_from_json_stream(self, sample_devices):
        """io.StringIO akışından içe aktarma."""
        json_str = export_to_json(sample_devices)
        stream = io.StringIO(json_str)

        loaded = import_from_json(stream)
        assert len(loaded) == len(sample_devices)

    def test_export_import_json_roundtrip_integrity(self, sample_devices):
        """JSON export -> import döngüsünde sıfır veri kaybı testi."""
        json_str = export_to_json(sample_devices)
        loaded = import_from_json(json_str)

        for original, imported in zip(sample_devices, loaded):
            assert original.ip == imported["ip"]
            assert original.mac == imported["mac"]
            assert original.vendor == imported["vendor"]
            assert original.hostname == imported["hostname"]
            assert original.response_time_ms == imported["response_time_ms"]
            assert original.status == imported["status"]

    def test_export_to_json_empty_list(self):
        """Boş liste dışa aktarıldığında '[]' dönmeli."""
        result = export_to_json([])
        assert result.strip() == "[]"

    def test_export_to_json_raises_for_none(self):
        """None liste verilirse ValueError fırlatılmalı."""
        with pytest.raises(ValueError):
            export_to_json(None)  # type: ignore

    @pytest.mark.parametrize(
        "corrupted_json",
        [
            "{bozuk_json",  # Geçersiz sözdizimi
            "12345",  # Liste olmayan JSON
            '{"ip": "1.1.1.1"}',  # Liste yerine tek sözlük
            "",  # Boş metin
        ],
    )
    def test_import_from_json_raises_for_invalid(self, corrupted_json):
        """Bozuk veya şemaya uymayan JSON'da ValueError fırlatılmalı."""
        with pytest.raises(ValueError):
            import_from_json(corrupted_json)


@pytest.mark.unit
class TestCsvExportImport:
    """CSV formatında dışa ve içe aktarma testleri (RFC 4180)."""

    def test_export_to_csv_string(self, sample_devices):
        """CSV metni oluşturma ve başlık kontrolü."""
        csv_str = export_to_csv(sample_devices)
        lines = csv_str.strip().splitlines()

        # İlk satır başlıklar olmalı
        assert lines[0] == "ip,mac,vendor,hostname,response_time_ms,status"
        # Cihaz sayısı + 1 başlık
        assert len(lines) == len(sample_devices) + 1

    def test_export_to_csv_handles_commas_in_vendor(self, sample_devices):
        """Üretici adında virgül olan (Apple, Inc.) alanlar çift tırnak ile sarılmalıdır."""
        csv_str = export_to_csv(sample_devices)
        # Apple, Inc. alanı "Apple, Inc." olarak tırnak içinde yer almalıdır
        assert '"Apple, Inc."' in csv_str

    def test_export_to_csv_preserves_turkish_characters(self, sample_devices, tmp_path: Path):
        """Türkçe karakterlerin CSV'de korunması."""
        out_file = tmp_path / "devices.csv"
        export_to_csv(sample_devices, target=out_file)

        content = out_file.read_text(encoding="utf-8")
        assert "İş-İstasyonu-Örnek.lan" in content
        assert "ğüşıöç" in content

    def test_import_from_csv_string(self, sample_devices):
        """CSV metninden içe aktarma ve tip dönüşümleri."""
        csv_str = export_to_csv(sample_devices)
        loaded = import_from_csv(csv_str)

        assert len(loaded) == len(sample_devices)
        assert loaded[0]["ip"] == "192.168.1.1"
        assert loaded[0]["vendor"] == "TP-Link Corporation"
        assert isinstance(loaded[0]["response_time_ms"], float)
        assert loaded[0]["response_time_ms"] == 1.45

    def test_import_from_csv_file(self, sample_devices, tmp_path: Path):
        """CSV dosyasından içe aktarma."""
        out_file = tmp_path / "devices.csv"
        export_to_csv(sample_devices, target=out_file)

        loaded = import_from_csv(out_file)
        assert len(loaded) == len(sample_devices)
        # Apple, Inc. virgüllü alanın başarıyla okunduğunu kontrol et
        assert loaded[1]["vendor"] == "Apple, Inc."

    def test_import_from_csv_handles_none_values(self, sample_devices):
        """Boş bırakılan hostname veya response_time_ms None olarak dönmelidir."""
        csv_str = export_to_csv(sample_devices)
        loaded = import_from_csv(csv_str)

        # Xiaomi cihazının hostname'i None idi
        xiaomi = next(d for d in loaded if d["ip"] == "192.168.1.42")
        assert xiaomi["hostname"] is None or xiaomi["hostname"] == ""

        # ASUS cihazının response_time_ms'i None idi
        asus = next(d for d in loaded if d["ip"] == "192.168.1.50")
        assert asus["response_time_ms"] is None

    def test_export_import_csv_roundtrip_integrity(self, sample_devices):
        """CSV export -> import döngüsünde sıfır veri kaybı testi."""
        csv_str = export_to_csv(sample_devices)
        loaded = import_from_csv(csv_str)

        for original, imported in zip(sample_devices, loaded):
            assert original.ip == imported["ip"]
            assert original.mac == imported["mac"]
            assert original.vendor == imported["vendor"]
            if original.hostname is not None:
                assert original.hostname == imported["hostname"]
            if original.response_time_ms is not None:
                assert abs(original.response_time_ms - imported["response_time_ms"]) < 0.001
            assert original.status == imported["status"]

    def test_export_to_csv_empty_list(self):
        """Boş listede sadece başlık satırı dönmelidir."""
        result = export_to_csv([])
        assert result.strip() == "ip,mac,vendor,hostname,response_time_ms,status"

    def test_export_to_csv_raises_for_none(self):
        """None liste verildiğinde ValueError fırlatılmalıdır."""
        with pytest.raises(ValueError):
            export_to_csv(None)  # type: ignore

    @pytest.mark.parametrize(
        "invalid_csv",
        [
            "",  # Boş metin
            "hatali,sutunlar,burada\n1,2,3",  # Gerekli ip, mac başlıkları yok
            "ip,mac\n192.168.1.1",  # Eksik sütunlu satır
        ],
    )
    def test_import_from_csv_raises_for_invalid(self, invalid_csv):
        """Bozuk CSV formatlarında ValueError fırlatılmalıdır."""
        with pytest.raises(ValueError):
            import_from_csv(invalid_csv)


@pytest.mark.integration
class TestLargeDataPerformance:
    """Büyük veri setleri (254 - 1000 cihaz) için dışa/içe aktarma kararlılığı."""

    def test_export_import_254_devices_json_and_csv(self, tmp_path: Path):
        """Bir C sınıfı subnet dolusu (254 cihaz) verinin kayıpsız aktarımı."""
        devices = [
            DeviceInfo(
                ip=f"192.168.1.{i}",
                mac=f"50:D4:F7:00:{(i // 256):02X}:{(i % 256):02X}",
                vendor="TP-Link Corporation",
                hostname=f"device-{i}.lan",
                response_time_ms=float(i) * 0.1,
                status="reachable",
            )
            for i in range(1, 255)
        ]

        # JSON Roundtrip
        json_file = tmp_path / "large_254.json"
        export_to_json(devices, target=json_file)
        loaded_json = import_from_json(json_file)
        assert len(loaded_json) == 254
        assert loaded_json[0]["ip"] == "192.168.1.1"
        assert loaded_json[-1]["ip"] == "192.168.1.254"

        # CSV Roundtrip
        csv_file = tmp_path / "large_254.csv"
        export_to_csv(devices, target=csv_file)
        loaded_csv = import_from_csv(csv_file)
        assert len(loaded_csv) == 254
        assert loaded_csv[0]["ip"] == "192.168.1.1"
        assert loaded_csv[-1]["ip"] == "192.168.1.254"
