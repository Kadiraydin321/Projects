package com.omnibackup.transfer

import com.omnibackup.transfer.core.server.UploadManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.ByteArrayInputStream
import java.io.File
import java.io.IOException
import java.io.InputStream

class UploadManagerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    @Test
    fun testSanitizeFileNameSecurity() {
        val manager = UploadManager(customStorageDir = tempFolder.root)

        assertEquals("photo.jpg", manager.sanitizeFileName("photo.jpg"))
        assertEquals("passwd", manager.sanitizeFileName("../../etc/passwd"))
        assertEquals("script.sh", manager.sanitizeFileName("..\\..\\script.sh"))
        assertEquals("test_file_.png", manager.sanitizeFileName("test?file*.png"))

        val emptySanitized = manager.sanitizeFileName("   ")
        assertTrue("Boş dosya adı varsayılan isim almalı", emptySanitized.startsWith("uploaded_"))
    }

    @Test
    fun testSanitizeCorruptAndMaliciousFileNames() {
        val manager = UploadManager(customStorageDir = tempFolder.root)

        // Çoklu path traversal girişimleri
        assertEquals("shadow", manager.sanitizeFileName("../../../../../../etc/shadow"))
        assertEquals("cmd.exe", manager.sanitizeFileName("C:\\Windows\\System32\\cmd.exe"))
        assertEquals("exploit.sh", manager.sanitizeFileName("..\\..\\..\\..\\exploit.sh"))

        // Geçersiz ve zararlı dosya sistemi karakterleri (: * ? " < > | \0)
        val malicious = "bad\u0000file:name*?<>|.png"
        val sanitized = manager.sanitizeFileName(malicious)
        assertFalse(sanitized.contains(":"))
        assertFalse(sanitized.contains("*"))
        assertFalse(sanitized.contains("?"))
        assertFalse(sanitized.contains("<"))
        assertFalse(sanitized.contains(">"))
        assertFalse(sanitized.contains("|"))
        assertFalse(sanitized.contains("\u0000"))
        assertTrue(sanitized.endsWith(".png"))

        // Yalnızca yol ayraçları veya boşluklar içeren bozuk dosya adları
        assertTrue(manager.sanitizeFileName("\t\n  ").startsWith("uploaded_"))
        assertTrue(manager.sanitizeFileName("////").startsWith("uploaded_"))
        assertTrue(manager.sanitizeFileName("\\\\\\\\").startsWith("uploaded_"))

        // Geçerli karmaşık dosya adı
        assertEquals("Backup (2026) - Full [v2].tar.gz", manager.sanitizeFileName("Backup (2026) - Full [v2].tar.gz"))
    }

    @Test
    fun testResolveDestinationFileCollision() {
        val manager = UploadManager(customStorageDir = tempFolder.root)

        val firstCandidate = manager.resolveDestinationFile("document.pdf")
        assertEquals("document.pdf", firstCandidate.name)
        firstCandidate.writeText("first content")

        val secondCandidate = manager.resolveDestinationFile("document.pdf")
        assertEquals("document_1.pdf", secondCandidate.name)
        secondCandidate.writeText("second content")

        val thirdCandidate = manager.resolveDestinationFile("document.pdf")
        assertEquals("document_2.pdf", thirdCandidate.name)
    }

    @Test
    fun testSaveStreamSuccessAndProgress() = runBlocking {
        val manager = UploadManager(customStorageDir = tempFolder.root)
        val payload = "Hello OmniBackup World! Bi-directional Transfer Test.".toByteArray(Charsets.UTF_8)
        val inputStream = ByteArrayInputStream(payload)

        var progressReported = false
        var reportedBytes = 0L

        val result = manager.saveStream(
            originalFileName = "greeting.txt",
            inputStream = inputStream,
            totalBytesEstimated = payload.size.toLong(),
            onProgress = { bytesWritten, _ ->
                progressReported = true
                reportedBytes = bytesWritten
            }
        )

        assertTrue(result.isSuccess)
        assertEquals("greeting.txt", result.fileName)
        assertEquals(payload.size.toLong(), result.sizeBytes)
        assertTrue(progressReported)
        assertEquals(payload.size.toLong(), reportedBytes)

        val savedFile = File(result.filePath)
        assertTrue(savedFile.exists())
        assertEquals("Hello OmniBackup World! Bi-directional Transfer Test.", savedFile.readText())

        // StateFlow kontrolü
        val history = manager.uploadedFiles.value
        assertEquals(1, history.size)
        assertEquals("greeting.txt", history.first().fileName)
    }

    @Test
    fun testSaveEmptyStream() = runBlocking {
        val manager = UploadManager(customStorageDir = tempFolder.root)
        val emptyStream = ByteArrayInputStream(ByteArray(0))

        val result = manager.saveStream(
            originalFileName = "empty_marker.dat",
            inputStream = emptyStream,
            totalBytesEstimated = 0L
        )

        assertTrue(result.isSuccess)
        assertEquals("empty_marker.dat", result.fileName)
        assertEquals(0L, result.sizeBytes)

        val file = File(result.filePath)
        assertTrue(file.exists())
        assertEquals(0L, file.length())
    }

    @Test
    fun testSaveStreamIoExceptionHandlingCleansUpPartialFile() = runBlocking {
        val manager = UploadManager(customStorageDir = tempFolder.root)

        // İlk 50 baytı okuduktan sonra IOException fırlatan bozuk akış mock'u
        val failingStream = object : InputStream() {
            private var count = 0
            override fun read(): Int {
                if (count++ < 50) return 'A'.code
                throw IOException("Simulated network stream disconnection")
            }
        }

        val result = manager.saveStream(
            originalFileName = "interrupted_transfer.bin",
            inputStream = failingStream,
            totalBytesEstimated = 1000L
        )

        // Hata raporlanmalı
        assertFalse("Kesintiye uğrayan aktarım başarısız işaretlenmeli", result.isSuccess)
        assertNotNull("Hata mesajı dolu olmalı", result.errorMessage)
        assertTrue(result.errorMessage!!.contains("Simulated network stream disconnection"))

        // Bozuk/yarım dosya diskten silinmiş olmalı
        val targetFile = File(result.filePath)
        assertFalse("Yarım kalan dosya hedef dizinden silinmiş olmalı", targetFile.exists())

        // Hata kaydı da yükleme geçmişinde bulunmalı
        val history = manager.uploadedFiles.value
        assertEquals(1, history.size)
        assertFalse(history.first().isSuccess)
    }

    @Test
    fun testMultipleSequentialUploadsOrder() = runBlocking {
        val manager = UploadManager(customStorageDir = tempFolder.root)

        val f1 = manager.saveStream("doc1.txt", ByteArrayInputStream("Content 1".toByteArray()))
        val f2 = manager.saveStream("doc2.txt", ByteArrayInputStream("Content 2".toByteArray()))
        val f3 = manager.saveStream("doc3.txt", ByteArrayInputStream("Content 3".toByteArray()))

        assertTrue(f1.isSuccess)
        assertTrue(f2.isSuccess)
        assertTrue(f3.isSuccess)

        val history = manager.uploadedFiles.value
        assertEquals(3, history.size)
        // En son yüklenen en başta olmalı (LIFO)
        assertEquals("doc3.txt", history[0].fileName)
        assertEquals("doc2.txt", history[1].fileName)
        assertEquals("doc1.txt", history[2].fileName)
    }
}
