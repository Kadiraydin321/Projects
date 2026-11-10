package com.omnibackup.transfer.core.security

import java.security.MessageDigest
import java.security.SecureRandom

/**
 * Güvenli PIN üretimi, doğrulaması ve oturum yetkilendirme işlemlerini yürüten güvenlik çekirdeği.
 */
object AuthSecurity {

    private val secureRandom = SecureRandom()

    /**
     * 4 haneli (0000 - 9999) kriptografik olarak güvenli rastgele bir PIN üretir.
     */
    fun generatePin(): String {
        val number = secureRandom.nextInt(10000)
        return String.format("%04d", number)
    }

    /**
     * Verilen PIN'in 4 haneli sayısal biçimde olup olmadığını denetler.
     */
    fun isValidPinFormat(pin: String?): Boolean {
        if (pin.isNullOrBlank()) return false
        val trimmed = pin.trim()
        return trimmed.length == 4 && trimmed.all { it.isDigit() }
    }

    /**
     * Zamanlama saldırılarına (timing attack) karşı dayanıklı sabit zamanlı (constant-time)
     * PIN karşılaştırması yapar.
     */
    fun validatePin(expectedPin: String, providedPin: String?): Boolean {
        if (providedPin == null) return false
        val trimmedProvided = providedPin.trim()
        if (trimmedProvided.length != expectedPin.length) {
            return false
        }

        // MessageDigest.isEqual sabit zamanlı karşılaştırma sunar
        return MessageDigest.isEqual(
            expectedPin.toByteArray(Charsets.UTF_8),
            trimmedProvided.toByteArray(Charsets.UTF_8)
        )
    }

    /**
     * İstek parametresi (query) veya HTTP başlığından (header) PIN token'ını çıkarır.
     */
    fun extractPin(queryParam: String?, headerPin: String?): String? {
        val pin = queryParam?.takeIf { it.isNotBlank() } ?: headerPin?.takeIf { it.isNotBlank() }
        return pin?.trim()
    }
}
