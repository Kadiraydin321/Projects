/**
 * SecureCrypto - Client-side zero-knowledge encryption utility
 * Uses standard Web Crypto API (AES-GCM 256-bit & PBKDF2)
 */
const SecureCrypto = {
    // Helper: Convert Uint8Array to Base64
    arrayBufferToBase64: function(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    // Helper: Convert Base64 to Uint8Array
    base64ToArrayBuffer: function(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // Derive CryptoKey using PBKDF2 from a password and salt
    deriveKey: async function(password, salt) {
        const encoder = new TextEncoder();
        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Encrypts a plaintext string using a password
     * Format: base64(salt (16b) + iv (12b) + ciphertext)
     */
    encrypt: async function(plaintext, password) {
        try {
            const encoder = new TextEncoder();
            const rawData = encoder.encode(plaintext);

            // Generate random salt and IV
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Derive key
            const key = await this.deriveKey(password, salt);

            // Encrypt data
            const ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                    tagLength: 128
                },
                key,
                rawData
            );

            // Combine salt + iv + ciphertext into a single byte array
            const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

            // Convert to Base64
            return this.arrayBufferToBase64(combined.buffer);
        } catch (e) {
            console.error("Encryption failed:", e);
            throw new Error("Şifreleme başarısız oldu.");
        }
    },

    /**
     * Decrypts a combined Base64 string using a password
     */
    decrypt: async function(encryptedBase64, password) {
        try {
            // Convert Base64 back to Uint8Array
            const combined = new Uint8Array(this.base64ToArrayBuffer(encryptedBase64));

            // Extract salt (16 bytes) and IV (12 bytes)
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const ciphertext = combined.slice(28);

            // Derive key from password and extracted salt
            const key = await this.deriveKey(password, salt);

            // Decrypt ciphertext
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                    tagLength: 128
                },
                key,
                ciphertext
            );

            // Decode bytes back to string
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (e) {
            console.error("Decryption failed:", e);
            throw new Error("Şifre çözme başarısız! Parola yanlış olabilir.");
        }
    }
};
