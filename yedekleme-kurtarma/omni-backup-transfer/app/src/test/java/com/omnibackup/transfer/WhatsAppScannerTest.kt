package com.omnibackup.transfer

import com.omnibackup.transfer.core.scanner.WhatsAppScanner
import com.omnibackup.transfer.core.scanner.WhatsAppType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class WhatsAppScannerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    @Test
    fun testFormatBytesFormatting() {
        assertEquals("0 B", WhatsAppScanner.formatBytes(0L))
        assertEquals("512 B", WhatsAppScanner.formatBytes(512L))
        assertEquals("1.0 KB", WhatsAppScanner.formatBytes(1024L))
        assertEquals("1.5 KB", WhatsAppScanner.formatBytes(1536L))
        assertEquals("1.00 MB", WhatsAppScanner.formatBytes(1024L * 1024L))
        assertEquals("2.50 MB", WhatsAppScanner.formatBytes((2.5 * 1024 * 1024).toLong()))
        assertEquals("1.00 GB", WhatsAppScanner.formatBytes(1024L * 1024L * 1024L))
        assertEquals("3.45 GB", WhatsAppScanner.formatBytes((3.45 * 1024 * 1024 * 1024).toLong()))
    }

    @Test
    fun testScanAllWithModernWhatsAppStructure() {
        val rootDir = tempFolder.root
        // Android 11+ Modern Dizin: Android/media/com.whatsapp/WhatsApp
        val modernWhatsApp = File(rootDir, "Android/media/com.whatsapp/WhatsApp").apply { mkdirs() }
        val dbDir = File(modernWhatsApp, "Databases").apply { mkdirs() }
        val mediaDir = File(modernWhatsApp, "Media/WhatsApp Images").apply { mkdirs() }
        val backupsDir = File(modernWhatsApp, "Backups").apply { mkdirs() }

        // Veritabanı dosyaları
        File(dbDir, "msgstore.db.crypt14").writeBytes(ByteArray(1024) { 1 }) // 1 KB
        File(dbDir, "chatsettingsbackup.db.crypt14").writeBytes(ByteArray(512) { 2 }) // 512 B

        // Medya dosyaları
        File(mediaDir, "IMG_001.jpg").writeBytes(ByteArray(2048) { 3 }) // 2 KB
        File(mediaDir, ".nomedia").writeBytes(ByteArray(0)) // 0 B

        // Yedek ayar dosyası
        File(backupsDir, "backup_settings.json.crypt14").writeBytes(ByteArray(256) { 4 }) // 256 B

        // .Statuses geçici klasörü ve dosyası (bu atlanmalı)
        val statusesDir = File(modernWhatsApp, "Media/.Statuses").apply { mkdirs() }
        File(statusesDir, "status_video.mp4").writeBytes(ByteArray(5000) { 9 })

        val results = WhatsAppScanner.scanAll(rootDir)
        assertEquals(1, results.size)

        val info = results.first()
        assertEquals(WhatsAppType.WHATSAPP, info.type)
        assertEquals("whatsapp", info.id)
        assertEquals("WhatsApp", info.displayName)
        assertEquals(modernWhatsApp.absolutePath, info.rootDir.absolutePath)
        assertNotNull(info.databasesDir)
        assertNotNull(info.mediaDir)
        assertNotNull(info.backupsDir)

        val stats = info.stats
        // Toplam beklenen dosyalar: msgstore, chatSettings, image1, nomedia, backupFile = 5 adet (.Statuses atlandı)
        assertEquals(5L, stats.totalFilesCount)
        val expectedTotalBytes = 1024L + 512L + 2048L + 0L + 256L
        assertEquals(expectedTotalBytes, stats.totalSizeBytes)

        // Veritabanı istatistikleri
        assertEquals(2L, stats.databaseFilesCount)
        assertEquals(1536L, stats.databaseBytes)

        // Medya istatistikleri (image1 + nomedia)
        assertEquals(2L, stats.mediaFilesCount)
        assertEquals(2048L, stats.mediaBytes)

        // Yedek istatistikleri
        assertEquals(1L, stats.backupFilesCount)
        assertEquals(256L, stats.backupBytes)

        // En son yedek zamanı
        assertTrue(stats.latestBackupTimestamp > 0)
        assertFalse(stats.latestBackupDateFormatted == "Bilinmiyor")
    }

    @Test
    fun testScanAllWithWhatsAppBusinessLegacyStructure() {
        val rootDir = tempFolder.root
        // Android 10 ve Öncesi Klasik Dizin: "WhatsApp Business"
        val legacyW4b = File(rootDir, "WhatsApp Business").apply { mkdirs() }
        val dbDir = File(legacyW4b, "Databases").apply { mkdirs() }
        val mediaDir = File(legacyW4b, "Media/WhatsApp Business Documents").apply { mkdirs() }

        File(dbDir, "msgstore.db.crypt15").writeBytes(ByteArray(4096) { 5 })
        File(mediaDir, "invoice.pdf").writeBytes(ByteArray(8192) { 6 })

        val results = WhatsAppScanner.scanAll(rootDir)
        assertEquals(1, results.size)

        val info = results.first()
        assertEquals(WhatsAppType.WHATSAPP_BUSINESS, info.type)
        assertEquals("whatsapp_business", info.id)
        assertEquals("WhatsApp Business", info.displayName)
        assertEquals(legacyW4b.absolutePath, info.rootDir.absolutePath)

        val stats = info.stats
        assertEquals(2L, stats.totalFilesCount)
        assertEquals(4096L + 8192L, stats.totalSizeBytes)
        assertEquals(1L, stats.databaseFilesCount)
        assertEquals(4096L, stats.databaseBytes)
        assertEquals(1L, stats.mediaFilesCount)
        assertEquals(8192L, stats.mediaBytes)
    }

    @Test
    fun testScanAllWithDirectPackageNameStructure() {
        val rootDir = tempFolder.root
        // Android 11+ Doğrudan Paket Adı Altı: Android/media/com.whatsapp/Databases
        val directWa = File(rootDir, "Android/media/com.whatsapp").apply { mkdirs() }
        val dbDir = File(directWa, "Databases").apply { mkdirs() }
        val mediaDir = File(directWa, "Media").apply { mkdirs() }

        File(dbDir, "msgstore.db.crypt14").writeBytes(ByteArray(2048))
        File(mediaDir, "test.jpg").writeBytes(ByteArray(1024))

        val results = WhatsAppScanner.scanAll(rootDir)
        assertEquals(1, results.size)

        val info = results.first()
        assertEquals(WhatsAppType.WHATSAPP, info.type)
        assertEquals(directWa.absolutePath, info.rootDir.absolutePath)
        assertEquals(2L, info.stats.totalFilesCount)
        assertEquals(3072L, info.stats.totalSizeBytes)
    }

    @Test
    fun testScanAllDetectsBothWhatsAppAndBusinessConcurrently() {
        val rootDir = tempFolder.root

        // 1. WhatsApp Modern
        val wa = File(rootDir, "Android/media/com.whatsapp/WhatsApp/Databases").apply { mkdirs() }
        File(wa, "msgstore.db.crypt14").writeBytes(ByteArray(100))

        // 2. WhatsApp Business Modern
        val w4b = File(rootDir, "Android/media/com.whatsapp.w4b/WhatsApp Business/Databases").apply { mkdirs() }
        File(w4b, "msgstore.db.crypt15").writeBytes(ByteArray(200))

        val results = WhatsAppScanner.scanAll(rootDir)
        assertEquals(2, results.size)

        val types = results.map { it.type }.toSet()
        assertTrue(types.contains(WhatsAppType.WHATSAPP))
        assertTrue(types.contains(WhatsAppType.WHATSAPP_BUSINESS))
    }

    @Test
    fun testGetFilesToBackupExcludesStatusesCompletely() {
        val rootDir = tempFolder.root
        val waDir = File(rootDir, "WhatsApp").apply { mkdirs() }
        val mediaDir = File(waDir, "Media").apply { mkdirs() }
        val statusDir = File(mediaDir, ".Statuses").apply { mkdirs() }
        val statusSubDir = File(statusDir, "daily").apply { mkdirs() }

        val realFile = File(mediaDir, "WhatsApp Video/sample.mp4").apply {
            parentFile?.mkdirs()
            writeBytes(ByteArray(500))
        }

        File(statusDir, "status1.jpg").writeBytes(ByteArray(100))
        File(statusSubDir, "status2.mp4").writeBytes(ByteArray(200))

        val files = WhatsAppScanner.getFilesToBackup(waDir).toList()

        assertEquals(1, files.size)
        assertEquals(realFile.absolutePath, files.first().absolutePath)
        assertFalse(files.any { it.name.contains("status") })
    }

    @Test
    fun testEmptyOrInvalidDirectoryHandling() {
        val emptyDir = tempFolder.newFolder("EmptyDir")
        val results = WhatsAppScanner.scanAll(emptyDir)
        assertTrue(results.isEmpty())

        // Boş bir klasör için calculateStats çağrısı
        val stats = WhatsAppScanner.calculateStats(emptyDir, null, null, null)
        assertEquals(0L, stats.totalFilesCount)
        assertEquals(0L, stats.totalSizeBytes)
        assertEquals("0 B", stats.formattedSize)
        assertEquals("Bilinmiyor", stats.latestBackupDateFormatted)
    }
}
