package com.omnibackup.transfer

import com.omnibackup.transfer.core.security.AuthSecurity
import com.omnibackup.transfer.core.server.TransferMetricsTracker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthSecurityTest {

    @Test
    fun testGeneratePinFormatAndEntropy() {
        val pinSet = mutableSetOf<String>()
        val regex = Regex("^\\d{4}$")

        // 100 ardışık PIN üretip formatını ve rastgelelik dağılımını test et
        for (i in 1..100) {
            val pin = AuthSecurity.generatePin()
            assertEquals("PIN tam 4 karakter uzunluğunda olmalı", 4, pin.length)
            assertTrue("PIN sadece rakamlardan oluşmalı", regex.matches(pin))
            pinSet.add(pin)
        }

        // 100 üretimde yeterli entropi olmalı (en az 80 benzersiz PIN beklenir)
        assertTrue("Rastgelelik düzeyi yüksek olmalı", pinSet.size >= 80)
    }

    @Test
    fun testIsValidPinFormat() {
        // Geçerli PIN'ler
        assertTrue(AuthSecurity.isValidPinFormat("1234"))
        assertTrue(AuthSecurity.isValidPinFormat("0000"))
        assertTrue(AuthSecurity.isValidPinFormat("9999"))
        assertTrue(AuthSecurity.isValidPinFormat("0421"))
        assertTrue(AuthSecurity.isValidPinFormat(" 1234 ")) // Boşluklu ama trim sonrası geçerli

        // Geçersiz PIN'ler
        assertFalse(AuthSecurity.isValidPinFormat("123"))     // 3 basamaklı
        assertFalse(AuthSecurity.isValidPinFormat("12345"))   // 5 basamaklı
        assertFalse(AuthSecurity.isValidPinFormat("abcd"))    // Harf
        assertFalse(AuthSecurity.isValidPinFormat("12a4"))    // Alfanümerik
        assertFalse(AuthSecurity.isValidPinFormat("12 4"))    // İç boşluk
        assertFalse(AuthSecurity.isValidPinFormat(""))        // Boş metin
        assertFalse(AuthSecurity.isValidPinFormat(null))      // Null
    }

    @Test
    fun testValidatePinLogic() {
        val secretPin = "7492"

        // Doğru PIN doğrulaması
        assertTrue(AuthSecurity.validatePin(secretPin, "7492"))
        assertTrue(AuthSecurity.validatePin(secretPin, " 7492 ")) // Trim toleransı

        // Hatalı PIN denemeleri (Yetkisiz erişim)
        assertFalse(AuthSecurity.validatePin(secretPin, "7493"))
        assertFalse(AuthSecurity.validatePin(secretPin, "0000"))
        assertFalse(AuthSecurity.validatePin(secretPin, "1234"))
        assertFalse(AuthSecurity.validatePin(secretPin, ""))
        assertFalse(AuthSecurity.validatePin(secretPin, null))
        assertFalse(AuthSecurity.validatePin(secretPin, "749"))
        assertFalse(AuthSecurity.validatePin(secretPin, "74920"))
    }

    @Test
    fun testExtractPinFromRequestSources() {
        // 1. Sadece Query Parameter mevcutsa
        val pin1 = AuthSecurity.extractPin(queryParam = "1234", headerPin = null)
        assertEquals("1234", pin1)

        // 2. Sadece Header (X-Auth-PIN) mevcutsa
        val pin2 = AuthSecurity.extractPin(queryParam = null, headerPin = "5678")
        assertEquals("5678", pin2)

        // 3. İkisi de mevcutsa (Query param öncelikli)
        val pin3 = AuthSecurity.extractPin(queryParam = "1111", headerPin = "2222")
        assertEquals("1111", pin3)

        // 4. Query boş metin ise Header devreye girmeli
        val pin4 = AuthSecurity.extractPin(queryParam = "   ", headerPin = "3333")
        assertEquals("3333", pin4)

        // 5. İkisi de boş/null ise
        val pin5 = AuthSecurity.extractPin(queryParam = null, headerPin = null)
        assertNull(pin5)

        val pin6 = AuthSecurity.extractPin(queryParam = "", headerPin = "  ")
        assertNull(pin6)
    }

    @Test
    fun testTransferMetricsTrackerCalculations() {
        val totalBytes = 100L * 1024L * 1024L // 100 MB
        val tracker = TransferMetricsTracker(totalBytes)

        // İlk metrik güncellemesi
        val metric = tracker.updateProgress(50L * 1024L * 1024L, "msgstore.db.crypt14")
        if (metric != null) {
            assertEquals(totalBytes, metric.totalBytes)
            assertEquals(50L * 1024L * 1024L, metric.bytesTransferred)
            assertEquals(50.0f, metric.percentage, 0.5f)
            assertEquals("msgstore.db.crypt14", metric.currentFile)
            assertFalse(metric.isCompleted)
        }

        // Bitiş durumu testi
        val finalMetric = tracker.finish()
        assertEquals(totalBytes, finalMetric.bytesTransferred)
        assertEquals(100.0f, finalMetric.percentage, 0.01f)
        assertTrue(finalMetric.isCompleted)
        assertEquals("Tamamlandı", finalMetric.currentFile)
        assertEquals(0L, finalMetric.etaSeconds)
    }
}
