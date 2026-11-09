use crate::crypto::{compute_checksum, decrypt_miio, encrypt_miio, verify_checksum, CryptoError};

pub const MIIO_MAGIC: u16 = 0x2131;
pub const HEADER_LEN: usize = 32;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MiioHeader {
    pub magic: u16,
    pub length: u16,
    pub unknown: u32,
    pub did: u32,
    pub stamp: u32,
    pub checksum: [u8; 16],
}

impl MiioHeader {
    pub fn parse(buf: &[u8]) -> Result<Self, String> {
        if buf.len() < HEADER_LEN {
            return Err(format!(
                "miIO başlığı en az 32 bayt olmalı! Alınan: {} bayt",
                buf.len()
            ));
        }
        let magic = u16::from_be_bytes([buf[0], buf[1]]);
        if magic != MIIO_MAGIC {
            return Err(format!(
                "Geçersiz miIO sihri: 0x{:04x} (beklenen: 0x{:04x})",
                magic, MIIO_MAGIC
            ));
        }
        let length = u16::from_be_bytes([buf[2], buf[3]]);
        let unknown = u32::from_be_bytes([buf[4], buf[5], buf[6], buf[7]]);
        let did = u32::from_be_bytes([buf[8], buf[9], buf[10], buf[11]]);
        let stamp = u32::from_be_bytes([buf[12], buf[13], buf[14], buf[15]]);
        let mut checksum = [0u8; 16];
        checksum.copy_from_slice(&buf[16..32]);

        Ok(Self {
            magic,
            length,
            unknown,
            did,
            stamp,
            checksum,
        })
    }

    pub fn is_handshake(&self) -> bool {
        self.length == 32
            && (self.checksum == [0xff; 16] || self.did == 0xffffffff || self.did == 0)
    }

    #[allow(dead_code)]
    pub fn to_bytes(&self) -> [u8; HEADER_LEN] {
        let mut buf = [0u8; HEADER_LEN];
        buf[0..2].copy_from_slice(&self.magic.to_be_bytes());
        buf[2..4].copy_from_slice(&self.length.to_be_bytes());
        buf[4..8].copy_from_slice(&self.unknown.to_be_bytes());
        buf[8..12].copy_from_slice(&self.did.to_be_bytes());
        buf[12..16].copy_from_slice(&self.stamp.to_be_bytes());
        buf[16..32].copy_from_slice(&self.checksum);
        buf
    }

    /// Handshake isteğine dönülecek 32-baytlık yanıt başlığı üretir
    pub fn build_handshake_response(did: u32, stamp: u32) -> [u8; HEADER_LEN] {
        let mut buf = [0u8; HEADER_LEN];
        buf[0..2].copy_from_slice(&MIIO_MAGIC.to_be_bytes());
        buf[2..4].copy_from_slice(&(HEADER_LEN as u16).to_be_bytes());
        buf[4..8].copy_from_slice(&0u32.to_be_bytes());
        buf[8..12].copy_from_slice(&did.to_be_bytes());
        buf[12..16].copy_from_slice(&stamp.to_be_bytes());
        buf[16..32].copy_from_slice(&[0xff; 16]); // handshake cevabında checksum 0xff
        buf
    }
}

/// Gelen şifreli bir miIO UDP paketini çözüp ham JSON stringini döner
pub fn parse_and_decrypt_packet(
    packet: &[u8],
    token: &[u8; 16],
    key: &[u8; 16],
    iv: &[u8; 16],
) -> Result<(MiioHeader, String), CryptoError> {
    if packet.len() < HEADER_LEN {
        return Err(CryptoError::EmptyData);
    }
    let header = MiioHeader::parse(packet).map_err(|_| CryptoError::InvalidPadding)?;

    // Checksum doğrula
    if !verify_checksum(packet, token) {
        return Err(CryptoError::ChecksumMismatch);
    }

    let payload_end = (header.length as usize).min(packet.len());
    let ciphertext = &packet[HEADER_LEN..payload_end];
    let decrypted_bytes = decrypt_miio(key, iv, ciphertext)?;
    let json_str = String::from_utf8(decrypted_bytes).map_err(|_| CryptoError::InvalidPadding)?;

    Ok((header, json_str))
}

/// Yanıt JSON'ını şifreleyip tam miIO UDP paketini üretir
pub fn build_encrypted_response(
    did: u32,
    stamp: u32,
    json_response: &str,
    token: &[u8; 16],
    key: &[u8; 16],
    iv: &[u8; 16],
) -> Result<Vec<u8>, CryptoError> {
    let encrypted_payload = encrypt_miio(key, iv, json_response.as_bytes())?;
    let total_len = (HEADER_LEN + encrypted_payload.len()) as u16;

    let mut header_16 = [0u8; 16];
    header_16[0..2].copy_from_slice(&MIIO_MAGIC.to_be_bytes());
    header_16[2..4].copy_from_slice(&total_len.to_be_bytes());
    header_16[4..8].copy_from_slice(&0u32.to_be_bytes());
    header_16[8..12].copy_from_slice(&did.to_be_bytes());
    header_16[12..16].copy_from_slice(&stamp.to_be_bytes());

    let checksum = compute_checksum(&header_16, token, &encrypted_payload);

    let mut full_packet = Vec::with_capacity(total_len as usize);
    full_packet.extend_from_slice(&header_16);
    full_packet.extend_from_slice(&checksum);
    full_packet.extend_from_slice(&encrypted_payload);

    Ok(full_packet)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::derive_key_iv;

    #[test]
    fn test_handshake_roundtrip() {
        let resp = MiioHeader::build_handshake_response(0x12345678, 100);
        let header = MiioHeader::parse(&resp).unwrap();
        assert_eq!(header.magic, MIIO_MAGIC);
        assert_eq!(header.did, 0x12345678);
        assert_eq!(header.stamp, 100);
        assert!(header.is_handshake());
    }

    #[test]
    fn test_packet_encryption_and_decryption_flow() {
        let token = [0x77u8; 16];
        let (key, iv) = derive_key_iv(&token);
        let did = 0x04e12345;
        let stamp = 500;
        let msg = "{\"id\":1,\"result\":[\"ok\"]}";

        let packet = build_encrypted_response(did, stamp, msg, &token, &key, &iv).unwrap();
        let (parsed_header, decrypted) =
            parse_and_decrypt_packet(&packet, &token, &key, &iv).unwrap();

        assert_eq!(parsed_header.did, did);
        assert_eq!(parsed_header.stamp, stamp);
        assert_eq!(decrypted, msg);
    }
}
