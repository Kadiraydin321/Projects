package com.omnibackup.transfer

import com.omnibackup.transfer.core.stream.OnTheFlyZipStreamer
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.ZipInputStream

class OnTheFlyZipStreamerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private val streamer = OnTheFlyZipStreamer(bufferSize = 4096)

    @Test
    fun testStreamFolderToZipIntegrityAndContent() = runBlocking {
        val rootDir = tempFolder.newFolder("WhatsApp")
        val dbDir = File(rootDir, "Databases").apply { mkdirs() }
        val mediaDir = File(rootDir, "Media/WhatsApp Images").apply { mkdirs() }
        val statusesDir = File(rootDir, "Media/.Statuses").apply { mkdirs() }

        // Test dosyaları
        val dbFile = File(dbDir, "msgstore.db.crypt14").apply {
            writeBytes("WhatsAppEncryptedDatabaseContentSample123456789".toByteArray(Charsets.UTF_8))
        }
        val imgFile = File(mediaDir, "sample_photo.jpg").apply {
            writeBytes(ByteArray(8192) { (it % 256).toByte() })
        }
        val nomediaFile = File(mediaDir, ".nomedia").apply {
            writeBytes(ByteArray(0)) // 0 Bayt edge case
        }
        // Hariç tutulması gereken geçici durum dosyası
        File(statusesDir, "status_temp.jpg").apply {
            writeBytes("TemporaryStatusBytesShouldBeExcluded".toByteArray(Charsets.UTF_8))
        }

        val totalEstimated = dbFile.length() + imgFile.length() + nomediaFile.length()
        val outStream = ByteArrayOutputStream()
        val progressList = mutableListOf<OnTheFlyZipStreamer.ProgressInfo>()

        // Canlı ZIP akışı yürüt
        streamer.streamFolderToZip(
            rootDir = rootDir,
            outputStream = outStream,
            totalEstimatedBytes = totalEstimated
        ) { progress ->
            progressList.add(progress)
        }

        val zipBytes = outStream.toByteArray()
        assertTrue("Üretilen ZIP baytları boş olmamalı", zipBytes.isNotEmpty())

        // ZipInputStream ile üretilen ZIP akışını doğrula
        val zipIn = ZipInputStream(ByteArrayInputStream(zipBytes))
        val extractedEntries = mutableMapOf<String, ByteArray>()

        var entry = zipIn.nextEntry
        while (entry != null) {
            val content = zipIn.readBytes()
            extractedEntries[entry.name] = content
            zipIn.closeEntry()
            entry = zipIn.nextEntry
        }
        zipIn.close()

        // 1. Entry sayısı doğrulaması: 3 dosya olmalı (db, img, .nomedia), .Statuses olmamalı
        assertEquals(3, extractedEntries.size)

        // 2. Dosyaların varlığı ve isimleri
        val hasDb = extractedEntries.keys.any { it.endsWith("msgstore.db.crypt14") }
        val hasImg = extractedEntries.keys.any { it.endsWith("sample_photo.jpg") }
        val hasNomedia = extractedEntries.keys.any { it.endsWith(".nomedia") }
        val hasStatus = extractedEntries.keys.any { it.contains(".Statuses") || it.contains("status_temp") }

        assertTrue("msgstore.db ZIP içinde bulunmalı", hasDb)
        assertTrue("sample_photo.jpg ZIP içinde bulunmalı", hasImg)
        assertTrue(".nomedia ZIP içinde bulunmalı", hasNomedia)
        assertFalse(".Statuses dosyası ZIP içinde bulunmamalı", hasStatus)

        // 3. İçerik ve bayt bütünlüğü doğrulaması
        val dbEntryKey = extractedEntries.keys.first { it.endsWith("msgstore.db.crypt14") }
        assertArrayEquals("Veritabanı içeriği bozulmadan sıkıştırılmalı", dbFile.readBytes(), extractedEntries[dbEntryKey])

        val imgEntryKey = extractedEntries.keys.first { it.endsWith("sample_photo.jpg") }
        assertArrayEquals("Resim baytları birebir aynı olmalı", imgFile.readBytes(), extractedEntries[imgEntryKey])

        val nomediaEntryKey = extractedEntries.keys.first { it.endsWith(".nomedia") }
        assertEquals(0, extractedEntries[nomediaEntryKey]?.size)

        // 4. Progress callback doğrulaması
        assertTrue("Progress bildirimleri tetiklenmiş olmalı", progressList.isNotEmpty())
        val lastProgress = progressList.last()
        assertEquals(totalEstimated, lastProgress.bytesTransferred)
        assertEquals(100f, lastProgress.percentage, 0.01f)
    }

    @Test
    fun testStreamSingleFile() = runBlocking {
        val testFile = tempFolder.newFile("sample_backup.zip").apply {
            writeBytes("LargeStreamSingleFilePayload1234567890".toByteArray(Charsets.UTF_8))
        }

        val outStream = ByteArrayOutputStream()
        val progressList = mutableListOf<OnTheFlyZipStreamer.ProgressInfo>()

        streamer.streamSingleFile(testFile, outStream) { p ->
            progressList.add(p)
        }

        val streamedBytes = outStream.toByteArray()
        assertArrayEquals(testFile.readBytes(), streamedBytes)

        assertTrue(progressList.isNotEmpty())
        val finalProgress = progressList.last()
        assertEquals(testFile.length(), finalProgress.bytesTransferred)
        assertEquals(100f, finalProgress.percentage, 0.01f)
        assertEquals(testFile.name, finalProgress.currentFileName)
    }

    @Test
    fun testEmptyFolderStreaming() = runBlocking {
        val emptyDir = tempFolder.newFolder("EmptyWhatsApp")
        val outStream = ByteArrayOutputStream()
        var callbackTriggered = false

        streamer.streamFolderToZip(emptyDir, outStream, 0L) {
            callbackTriggered = true
        }

        // Boş klasörde ZIP header ve footer yazılır ancak entry olmaz
        val zipBytes = outStream.toByteArray()
        assertTrue(zipBytes.isNotEmpty())

        val zipIn = ZipInputStream(ByteArrayInputStream(zipBytes))
        val entry = zipIn.nextEntry
        assertEquals(null, entry)
        zipIn.close()

        assertFalse(callbackTriggered)
    }

    @Test
    fun testStreamFilesToZipMultipleFiles() = runBlocking {
        val f1 = tempFolder.newFile("photo1.jpg").apply { writeBytes("PHOTO1_CONTENT".toByteArray()) }
        val f2 = tempFolder.newFile("video1.mp4").apply { writeBytes("VIDEO1_CONTENT_LONGER".toByteArray()) }

        val outStream = ByteArrayOutputStream()
        var progressCount = 0

        streamer.streamFilesToZip(
            files = listOf(f1, f2),
            outputStream = outStream,
            totalEstimatedBytes = f1.length() + f2.length()
        ) {
            progressCount++
        }

        val zipBytes = outStream.toByteArray()
        assertTrue(zipBytes.isNotEmpty())

        val zipIn = ZipInputStream(ByteArrayInputStream(zipBytes))
        val extractedNames = mutableListOf<String>()
        var entry = zipIn.nextEntry
        while (entry != null) {
            extractedNames.add(entry.name)
            zipIn.closeEntry()
            entry = zipIn.nextEntry
        }
        zipIn.close()

        assertEquals(2, extractedNames.size)
        assertTrue(extractedNames.contains("photo1.jpg"))
        assertTrue(extractedNames.contains("video1.mp4"))
        assertTrue(progressCount > 0)
    }

    @Test
    fun testStreamFileListToZip() = runBlocking {
        val f1 = tempFolder.newFile("apk1.apk").apply { writeBytes("FAKE_APK_BYTES".toByteArray()) }
        val f2 = tempFolder.newFile("data.json").apply { writeBytes("{\"setting\": true}".toByteArray()) }

        val items = listOf(
            com.omnibackup.transfer.core.stream.FileItem(f1, "Apps/MyTestApp/base.apk"),
            com.omnibackup.transfer.core.stream.FileItem(f2, "Apps/MyTestApp/data/files/data.json")
        )

        val outStream = ByteArrayOutputStream()
        val totalBytes = f1.length() + f2.length()
        var reportedFinalBytes = 0L

        streamer.streamFileListToZip(
            items = items,
            outputStream = outStream,
            totalEstimatedBytes = totalBytes
        ) { p ->
            reportedFinalBytes = p.bytesTransferred
        }

        val zipBytes = outStream.toByteArray()
        assertTrue(zipBytes.isNotEmpty())

        val zipIn = ZipInputStream(ByteArrayInputStream(zipBytes))
        val extractedMap = mutableMapOf<String, String>()
        var entry = zipIn.nextEntry
        while (entry != null) {
            extractedMap[entry.name] = zipIn.readBytes().toString(Charsets.UTF_8)
            zipIn.closeEntry()
            entry = zipIn.nextEntry
        }
        zipIn.close()

        assertEquals(2, extractedMap.size)
        assertEquals("FAKE_APK_BYTES", extractedMap["Apps/MyTestApp/base.apk"])
        assertEquals("{\"setting\": true}", extractedMap["Apps/MyTestApp/data/files/data.json"])
        assertEquals(totalBytes, reportedFinalBytes)
    }

    @Test
    fun testStreamFilesToZipCollisionHandling() = runBlocking {
        val dir1 = tempFolder.newFolder("dir1")
        val dir2 = tempFolder.newFolder("dir2")

        val fileA = File(dir1, "image.jpg").apply { writeBytes("First Image Data".toByteArray()) }
        val fileB = File(dir2, "image.jpg").apply { writeBytes("Second Image Data".toByteArray()) }

        val outStream = ByteArrayOutputStream()
        streamer.streamFilesToZip(
            files = listOf(fileA, fileB),
            outputStream = outStream,
            totalEstimatedBytes = fileA.length() + fileB.length()
        ) {}

        val zipIn = ZipInputStream(ByteArrayInputStream(outStream.toByteArray()))
        val entryNames = mutableListOf<String>()
        var entry = zipIn.nextEntry
        while (entry != null) {
            entryNames.add(entry.name)
            zipIn.closeEntry()
            entry = zipIn.nextEntry
        }
        zipIn.close()

        // Çakışan dosya adı otomatik olarak _1 ile yeniden adlandırılmalı
        assertEquals(2, entryNames.size)
        assertTrue(entryNames.contains("image.jpg"))
        assertTrue(entryNames.contains("image_1.jpg"))
    }
}
