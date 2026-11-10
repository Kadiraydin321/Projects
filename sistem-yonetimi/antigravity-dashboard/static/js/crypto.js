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

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFFd9R4a3Oyxz
// SIG // q7B6DlRXOVyE3jnwoIIDGDCCAxQwggH8oAMCAQICECO+
// SIG // hXVV+mywSC4lkmKyRmIwDQYJKoZIhvcNAQELBQAwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMw
// SIG // HhcNMjYxMTA4MDk0NDE1WhcNMzYxMTA4MDk1NDE1WjAi
// SIG // MSAwHgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0
// SIG // czCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
// SIG // ALVYf1oFZ+beC823GUw/yiFUsl2ZhDf63Sw7QSsQIRVi
// SIG // MW2Rw6LTiIx6yMI38a9WZZ8ahXBYzaO/TGi0CVFnzt2k
// SIG // 7uwbB/03/pr1EBGrKERJFcHcJ6er1x38W8jMZDlxNMtt
// SIG // oNKv/S8xRVwbVC5fgvf63B/tMj6nfXunysARotCNe8MY
// SIG // d8lrdZfhxyhfDrAYD4has6tKJTFfqZtxWGfN/TBnQFGB
// SIG // zozhZBsbQJHZJZEwIrQX4iFSNU4zGnG57FbqIPap83OE
// SIG // uoXU9FR2diXWr7D1njVNxD6M3RwJIB5QMtlBKimKAqwL
// SIG // b0ii5jT7+uNgRv8H4xb+YKU+96pCNE54dqECAwEAAaNG
// SIG // MEQwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsG
// SIG // AQUFBwMDMB0GA1UdDgQWBBTSFBrNRdyMOGEM9VQ5lS2m
// SIG // CvSzZjANBgkqhkiG9w0BAQsFAAOCAQEAJF3bNWKL9NJV
// SIG // a/dn1dHylI79o1oUOawP/4M7vVU8iJZLIpfWC8Mb335d
// SIG // Jr6zpAMwKsAbN5nvoFeQtGFjkMzKPoUlWF0mVbeKLATi
// SIG // lk7//BV9JeXheD3V6xu0q5HuS0CA/u2yJw+TT8nuErZJ
// SIG // 2JLO4O8OghdIv2Xj6FUS0C47ebQRTUgt4Xtgr+no3QPV
// SIG // Sp4NXGxoj0KbDX1gxvrmQ3NuyWJ+nw1IR6pimzZvKXIV
// SIG // wgmBwo0udXB/na//NhpO07XX2J1T9GNOfUuc2rtuFocB
// SIG // Gog4j1dz+k4e2naHoGJ54/OFzAK20C38phicGH0EKnmf
// SIG // ZoEKnlGBoPSwBnYzbJPjuzGCAdcwggHTAgEBMDYwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMC
// SIG // ECO+hXVV+mywSC4lkmKyRmIwCQYFKw4DAhoFAKB4MBgG
// SIG // CisGAQQBgjcCAQwxCjAIoAKAAKECgAAwGQYJKoZIhvcN
// SIG // AQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFJJs
// SIG // 1fJnFpiK0Zo1c9qlzblWlEeEMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAIJ8F8AK14mYcXmy227LnLsyXa4m+Be57Cu++s1H
// SIG // MNb4CnWqbQUsb3y7vm7OlfORJfidiSQ5ACh8Tr0cR2bU
// SIG // WCBplmjKUgCDXtXekbnbe+B48R6LI9qv1SoMwxbY0IZ6
// SIG // ZfT98hOqzq7mF/iUd8X2bGojwpum3+VsZW7MgnbQEh6U
// SIG // HNvewaNYd2ihqOJlxuhf7Hh+mic3C4X809BWa0Pk+GuG
// SIG // RPrcJRPV4r04k+/eReeCQ14rSK8NKe4NRne+i++XJQNk
// SIG // JLp+BlphQbO/9qrZGGxfkt9CpZMLDsPX4jKSgeMwh6tW
// SIG // meC9QpnzlnfRe8fqBUvMzE+KB7SSwR+Bn3VE1x0=
// SIG // End signature block
