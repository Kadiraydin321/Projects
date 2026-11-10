package com.omnibackup.transfer

import com.omnibackup.transfer.core.scanner.MediaCategory
import com.omnibackup.transfer.core.scanner.MediaCategoryScanner
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class MediaCategoryScannerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    @Test
    fun testFormatBytes() {
        assertEquals("0 B", MediaCategoryScanner.formatBytes(0L))
        assertEquals("1.0 KB", MediaCategoryScanner.formatBytes(1024L))
        assertEquals("5.00 MB", MediaCategoryScanner.formatBytes(5 * 1024 * 1024L))
        assertEquals("2.50 GB", MediaCategoryScanner.formatBytes((2.5 * 1024 * 1024 * 1024).toLong()))
    }

    @Test
    fun testScanPhotosCategory() = runBlocking {
        val rootDir = tempFolder.root

        val dcimDir = File(rootDir, "DCIM/Camera").apply { mkdirs() }
        val picturesDir = File(rootDir, "Pictures/Screenshots").apply { mkdirs() }
        val musicDir = File(rootDir, "Music").apply { mkdirs() }

        File(dcimDir, "IMG_2026.jpg").apply { writeBytes(ByteArray(1000)) }
        File(picturesDir, "Screenshot.png").apply { writeBytes(ByteArray(2000)) }
        File(dcimDir, "RAW_001.heic").apply { writeBytes(ByteArray(3000)) }

        // Fotoğraf olmayan diğer dosyalar
        File(musicDir, "song.mp3").apply { writeBytes(ByteArray(5000)) }
        File(dcimDir, "ignore_not_photo.txt").apply { writeBytes(ByteArray(100)) }

        val result = MediaCategoryScanner.scanCategory(MediaCategory.PHOTOS, baseDir = rootDir)

        assertEquals(MediaCategory.PHOTOS, result.category)
        assertEquals(3L, result.totalFilesCount)
        assertEquals(6000L, result.totalSizeBytes)
        assertEquals(3, result.files.size)

        val paths = result.files.map { it.name }.toSet()
        assertTrue(paths.contains("IMG_2026.jpg"))
        assertTrue(paths.contains("Screenshot.png"))
        assertTrue(paths.contains("RAW_001.heic"))

        // FileItem dönüşümü testi
        val fileItems = result.toFileItems(baseDir = rootDir)
        assertEquals(3, fileItems.size)
        assertTrue(fileItems.any { it.entryPath == "DCIM/Camera/IMG_2026.jpg" })
        assertTrue(fileItems.any { it.entryPath == "Pictures/Screenshots/Screenshot.png" })
    }

    @Test
    fun testScanVideosCategory() = runBlocking {
        val rootDir = tempFolder.root

        val moviesDir = File(rootDir, "Movies").apply { mkdirs() }
        val videoDir = File(rootDir, "Video").apply { mkdirs() }

        File(moviesDir, "holiday.mp4").apply { writeBytes(ByteArray(10000)) }
        File(videoDir, "clip.mkv").apply { writeBytes(ByteArray(20000)) }
        File(moviesDir, "notes.pdf").apply { writeBytes(ByteArray(500)) }

        val result = MediaCategoryScanner.scanCategory(MediaCategory.VIDEOS, baseDir = rootDir)
        assertEquals(MediaCategory.VIDEOS, result.category)
        assertEquals(2L, result.totalFilesCount)
        assertEquals(30000L, result.totalSizeBytes)
    }

    @Test
    fun testScanAudioCategory() = runBlocking {
        val rootDir = tempFolder.root

        val musicDir = File(rootDir, "Music").apply { mkdirs() }
        val recordDir = File(rootDir, "Recordings").apply { mkdirs() }

        File(musicDir, "track1.flac").apply { writeBytes(ByteArray(1500)) }
        File(recordDir, "voice_memo.m4a").apply { writeBytes(ByteArray(2500)) }

        val result = MediaCategoryScanner.scanCategory(MediaCategory.AUDIO, baseDir = rootDir)
        assertEquals(MediaCategory.AUDIO, result.category)
        assertEquals(2L, result.totalFilesCount)
        assertEquals(4000L, result.totalSizeBytes)
    }

    @Test
    fun testCaseInsensitiveDirectoryAndExtensionMatching() = runBlocking {
        val rootDir = tempFolder.root

        // Küçük harfli klasör adları: dcim ve pictures
        val dcimLower = File(rootDir, "dcim").apply { mkdirs() }
        val picturesLower = File(rootDir, "pictures").apply { mkdirs() }

        // Büyük harfli dosya uzantıları: .JPG, .PNG, .HEIC, .MP4
        File(dcimLower, "PHOTO_UPPER.JPG").writeBytes(ByteArray(1000))
        File(picturesLower, "SCREENSHOT_UPPER.PNG").writeBytes(ByteArray(2000))
        File(dcimLower, "CAMERA_RAW.HEIC").writeBytes(ByteArray(3000))

        val result = MediaCategoryScanner.scanCategory(MediaCategory.PHOTOS, baseDir = rootDir)

        assertEquals(MediaCategory.PHOTOS, result.category)
        assertEquals(3L, result.totalFilesCount)
        assertEquals(6000L, result.totalSizeBytes)

        val fileNames = result.files.map { it.name }.toSet()
        assertTrue(fileNames.contains("PHOTO_UPPER.JPG"))
        assertTrue(fileNames.contains("SCREENSHOT_UPPER.PNG"))
        assertTrue(fileNames.contains("CAMERA_RAW.HEIC"))
    }

    @Test
    fun testScanDocumentsCategory() = runBlocking {
        val rootDir = tempFolder.root

        val docsDir = File(rootDir, "Documents").apply { mkdirs() }
        val downloadDir = File(rootDir, "Download").apply { mkdirs() }

        File(docsDir, "report.pdf").apply { writeBytes(ByteArray(500)) }
        File(downloadDir, "data.xlsx").apply { writeBytes(ByteArray(1500)) }
        File(docsDir, "notes.txt").apply { writeBytes(ByteArray(200)) }

        val result = MediaCategoryScanner.scanCategory(MediaCategory.DOCUMENTS, baseDir = rootDir)
        assertEquals(MediaCategory.DOCUMENTS, result.category)
        assertEquals(3L, result.totalFilesCount)
        assertEquals(2200L, result.totalSizeBytes)
    }

    @Test
    fun testScanEmptyCategoryReturnsZero() = runBlocking {
        val emptyDir = tempFolder.newFolder("CompletelyEmptyStorage")

        // Boş klasörde her kategori 0 dosya ve 0 B döndürmeli, çökme olmamalı
        val photoResult = MediaCategoryScanner.scanCategory(MediaCategory.PHOTOS, baseDir = emptyDir)
        assertEquals(0L, photoResult.totalFilesCount)
        assertEquals(0L, photoResult.totalSizeBytes)
        assertEquals("0 B", photoResult.formattedTotalSize)
        assertTrue(photoResult.files.isEmpty())

        val videoResult = MediaCategoryScanner.scanCategory(MediaCategory.VIDEOS, baseDir = emptyDir)
        assertEquals(0L, videoResult.totalFilesCount)
        assertEquals(0L, videoResult.totalSizeBytes)

        val docResult = MediaCategoryScanner.scanCategory(MediaCategory.DOCUMENTS, baseDir = emptyDir)
        assertEquals(0L, docResult.totalFilesCount)
        assertEquals(0L, docResult.totalSizeBytes)
    }

    @Test
    fun testScanCategorySkipsThumbnailsAndCache() = runBlocking {
        val rootDir = tempFolder.root
        val dcim = File(rootDir, "DCIM/Camera").apply { mkdirs() }
        val thumbDir = File(rootDir, "DCIM/.thumbnails").apply { mkdirs() }
        val cacheDir = File(rootDir, "Pictures/cache").apply { mkdirs() }

        // Geçerli fotoğraf
        File(dcim, "valid_photo.jpg").writeBytes(ByteArray(500))
        // Atlanması gereken önbellek ve küçük resim dosyaları
        File(thumbDir, "thumb_preview.jpg").writeBytes(ByteArray(200))
        File(cacheDir, "cached_image.png").writeBytes(ByteArray(300))

        val result = MediaCategoryScanner.scanCategory(MediaCategory.PHOTOS, baseDir = rootDir)
        assertEquals(1L, result.totalFilesCount)
        assertEquals(500L, result.totalSizeBytes)
        assertEquals("valid_photo.jpg", result.files.first().name)
    }

    @Test
    fun testCaseInsensitiveExtensionsDetection() = runBlocking {
        val rootDir = tempFolder.root
        val dcim = File(rootDir, "DCIM").apply { mkdirs() }

        // Büyük harfli uzantılar
        File(dcim, "CAPITAL_EXTENSION.JPG").writeBytes(ByteArray(100))
        File(dcim, "Mixed_Case.PnG").writeBytes(ByteArray(200))

        val result = MediaCategoryScanner.scanCategory(MediaCategory.PHOTOS, baseDir = rootDir)
        assertEquals(2L, result.totalFilesCount)
        assertEquals(300L, result.totalSizeBytes)
    }

    @Test
    fun testScanAllStorageCategory() = runBlocking {
        val rootDir = tempFolder.root
        File(rootDir, "custom_folder").mkdirs()
        File(rootDir, "custom_folder/archive.iso").writeBytes(ByteArray(400))
        File(rootDir, "custom_folder/script.py").writeBytes(ByteArray(600))

        val result = MediaCategoryScanner.scanCategory(MediaCategory.ALL_STORAGE, baseDir = rootDir)
        assertTrue(result.totalFilesCount >= 2L)
        assertTrue(result.totalSizeBytes >= 1000L)
    }

    @Test
    fun testPrepareCategoryBackupFiles() {
        val rootDir = File(tempFolder.root, "sdcard").apply { mkdirs() }
        val externalDir = File(tempFolder.root, "external").apply { mkdirs() }

        val file1 = File(rootDir, "DCIM/photo1.jpg").apply {
            parentFile?.mkdirs()
            writeBytes(ByteArray(100))
        }
        val file2 = File(externalDir, "outside.jpg").apply {
            writeBytes(ByteArray(200))
        }

        val items = MediaCategoryScanner.prepareCategoryBackupFiles(
            category = MediaCategory.PHOTOS,
            files = listOf(file1, file2),
            baseDir = rootDir
        )

        assertEquals(2, items.size)
        // file1 baseDir altında olduğu için göreceli yol alır
        assertEquals("DCIM/photo1.jpg", items[0].entryPath)
        // file2 baseDir dışında olduğu için Fotoğraflar/outside.jpg alır
        assertEquals("Fotoğraflar/outside.jpg", items[1].entryPath)
    }

    @Test
    fun testScanAllCategoriesConcurrently() = runBlocking {
        val rootDir = tempFolder.root

        File(rootDir, "DCIM").mkdirs()
        File(rootDir, "DCIM/pic.jpg").writeBytes(ByteArray(100))

        File(rootDir, "Music").mkdirs()
        File(rootDir, "Music/audio.mp3").writeBytes(ByteArray(200))

        val map = MediaCategoryScanner.scanAllCategories(baseDir = rootDir, includeAllStorage = false)
        assertTrue(map.containsKey(MediaCategory.PHOTOS))
        assertTrue(map.containsKey(MediaCategory.AUDIO))
        assertTrue(map.containsKey(MediaCategory.VIDEOS))
        assertTrue(map.containsKey(MediaCategory.DOCUMENTS))

        assertEquals(1L, map[MediaCategory.PHOTOS]?.totalFilesCount)
        assertEquals(1L, map[MediaCategory.AUDIO]?.totalFilesCount)
        assertEquals(0L, map[MediaCategory.VIDEOS]?.totalFilesCount)
    }
}
