use aes::Aes128;
use cbc::cipher::block_padding::Pkcs7;
use cbc::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use md5::{Digest, Md5};

type Aes128CbcEnc = cbc::Encryptor<Aes128>;
type Aes128CbcDec = cbc::Decryptor<Aes128>;

#[derive(Debug, PartialEq, Eq)]
pub enum CryptoError {
    InvalidPadding,
    ChecksumMismatch,
    EmptyData,
    EncryptionError,
}

impl std::fmt::Display for CryptoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CryptoError::InvalidPadding => write!(f, "Geçersiz PKCS7 dolgusu"),
            CryptoError::ChecksumMismatch => {
                write!(f, "Sağlama toplamı (Checksum) doğrulaması başarısız")
            }
            CryptoError::EmptyData => write!(f, "Şifrelenecek veri boş"),
            CryptoError::EncryptionError => write!(f, "Şifreleme sırasında tampon hatası"),
        }
    }
}
impl std::error::Error for CryptoError {}

/// Token'dan (16 bayt) AES-128 anahtar ve IV türetir:
/// Key = MD5(token)
/// IV  = MD5(Key + token)
pub fn derive_key_iv(token: &[u8; 16]) -> ([u8; 16], [u8; 16]) {
    let mut hasher = Md5::new();
    hasher.update(token);
    let key: [u8; 16] = hasher.finalize().into();

    let mut hasher = Md5::new();
    hasher.update(key);
    hasher.update(token);
    let iv: [u8; 16] = hasher.finalize().into();

    (key, iv)
}

/// Düz metni AES-128-CBC + PKCS7 ile şifreler
pub fn encrypt_miio(
    key: &[u8; 16],
    iv: &[u8; 16],
    plaintext: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    if plaintext.is_empty() {
        return Ok(Vec::new());
    }
    let mut buf = vec![0u8; plaintext.len() + 16];
    buf[..plaintext.len()].copy_from_slice(plaintext);

    let encryptor = Aes128CbcEnc::new(key.into(), iv.into());
    let ct = encryptor
        .encrypt_padded_mut::<Pkcs7>(&mut buf, plaintext.len())
        .map_err(|_| CryptoError::EncryptionError)?;
    Ok(ct.to_vec())
}

/// Şifreli veriyi AES-128-CBC + PKCS7 ile çözer
pub fn decrypt_miio(
    key: &[u8; 16],
    iv: &[u8; 16],
    ciphertext: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    if ciphertext.is_empty() {
        return Ok(Vec::new());
    }
    if !ciphertext.len().is_multiple_of(16) {
        return Err(CryptoError::InvalidPadding);
    }
    let mut buf = ciphertext.to_vec();
    let decryptor = Aes128CbcDec::new(key.into(), iv.into());
    let pt = decryptor
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|_| CryptoError::InvalidPadding)?;
    Ok(pt.to_vec())
}

/// miIO paket sağlama toplamını (checksum) hesaplar:
/// MD5(header[0..16] + token[0..16] + ciphertext)
pub fn compute_checksum(header_16: &[u8; 16], token: &[u8; 16], ciphertext: &[u8]) -> [u8; 16] {
    let mut hasher = Md5::new();
    hasher.update(header_16);
    hasher.update(token);
    hasher.update(ciphertext);
    hasher.finalize().into()
}

/// Gelen paketin sağlama toplamını doğrular
pub fn verify_checksum(packet: &[u8], token: &[u8; 16]) -> bool {
    if packet.len() < 32 {
        return false;
    }
    let mut header_16 = [0u8; 16];
    header_16.copy_from_slice(&packet[0..16]);

    let mut expected_checksum = [0u8; 16];
    expected_checksum.copy_from_slice(&packet[16..32]);

    let ciphertext = &packet[32..];
    let actual_checksum = compute_checksum(&header_16, token, ciphertext);

    expected_checksum == actual_checksum
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_iv_derivation() {
        let token = hex::decode("0123456789abcdef0123456789abcdef").unwrap();
        let mut token_arr = [0u8; 16];
        token_arr.copy_from_slice(&token);

        let (key, iv) = derive_key_iv(&token_arr);
        assert_eq!(key.len(), 16);
        assert_eq!(iv.len(), 16);
        assert_ne!(key, iv);
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let token = [0x42u8; 16];
        let (key, iv) = derive_key_iv(&token);
        let msg = b"{\"id\":1001,\"method\":\"get_status\",\"params\":[]}";

        let encrypted = encrypt_miio(&key, &iv, msg).unwrap();
        assert_ne!(&encrypted, msg);
        assert_eq!(encrypted.len() % 16, 0);

        let decrypted = decrypt_miio(&key, &iv, &encrypted).unwrap();
        assert_eq!(decrypted, msg);
    }

    #[test]
    fn test_checksum_computation() {
        let token = [0x55u8; 16];
        let header_16 = [0x11u8; 16];
        let ct = [0x33u8; 32];

        let cs1 = compute_checksum(&header_16, &token, &ct);
        let cs2 = compute_checksum(&header_16, &token, &ct);
        assert_eq!(cs1, cs2);
    }
}
