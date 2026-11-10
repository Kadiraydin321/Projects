package com.omnibackup.transfer

import com.omnibackup.transfer.core.scanner.AppBackupScanner
import com.omnibackup.transfer.core.scanner.AppDataDirInfo
import com.omnibackup.transfer.core.scanner.InstalledAppInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class AppBackupScannerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    @Test
    fun testFormatBytes() {
        assertEquals("0 B", AppBackupScanner.formatBytes(0L))
        assertEquals("500 B", AppBackupScanner.formatBytes(500L))
        assertEquals("1.0 KB", AppBackupScanner.formatBytes(1024L))
        assertEquals("2.00 MB", AppBackupScanner.formatBytes(2 * 1024 * 1024L))
        assertEquals("3.50 GB", AppBackupScanner.formatBytes((3.5 * 1024 * 1024 * 1024).toLong()))
    }

    @Test
    fun testSanitizeFileName() {
        assertEquals("My_App", AppBackupScanner.sanitizeFileName("My App"))
        assertEquals("Test_App_Special", AppBackupScanner.sanitizeFileName("Test/App:Special*"))
        assertEquals("App", AppBackupScanner.sanitizeFileName("   App   "))
    }

    @Test
    fun testPrepareAppBackupFiles() {
        val rootDir = tempFolder.root

        val apkFile = File(rootDir, "base.apk").apply {
            writeBytes(ByteArray(1024) { 1 })
        }

        val dataDir = File(rootDir, "Android/data/com.example.app/files").apply {
            mkdirs()
        }
        File(dataDir, "user_config.json").apply {
            writeBytes(ByteArray(256) { 2 })
        }

        val appDataInfo = AppDataDirInfo(
            type = "data",
            dir = File(rootDir, "Android/data/com.example.app"),
            sizeBytes = 256L,
            filesCount = 1L,
            formattedSize = "256 B"
        )

        val appInfo = InstalledAppInfo(
            packageName = "com.example.app",
            appName = "Example App",
            versionName = "2.1.0",
            versionCode = 21,
            isSystemApp = false,
            apkFile = apkFile,
            apkSizeBytes = 1024L,
            formattedApkSize = "1.0 KB",
            dataDirs = listOf(appDataInfo),
            totalSizeBytes = 1280L,
            formattedTotalSize = "1.25 KB"
        )

        // 1. Hem APK hem Data dahil
        val fileItems = AppBackupScanner.prepareAppBackupFiles(appInfo, includeData = true)
        assertEquals(2, fileItems.size)

        val apkItem = fileItems.find { it.entryPath.endsWith(".apk") }
        assertTrue(apkItem != null)
        assertEquals("Apps/Example_App_com.example.app/Example_App_v2.1.0.apk", apkItem?.entryPath)
        assertEquals(apkFile.absolutePath, apkItem?.file?.absolutePath)

        val dataItem = fileItems.find { it.entryPath.endsWith("user_config.json") }
        assertTrue(dataItem != null)
        assertEquals("Apps/Example_App_com.example.app/data/files/user_config.json", dataItem?.entryPath)

        // 2. Yalnızca APK dahil (includeData = false)
        val apkOnlyItems = AppBackupScanner.prepareAppBackupFiles(appInfo, includeData = false)
        assertEquals(1, apkOnlyItems.size)
        assertEquals("Apps/Example_App_com.example.app/Example_App_v2.1.0.apk", apkOnlyItems.first().entryPath)
    }

    @Test
    fun testPrepareAppsBackupFilesMultiple() {
        val rootDir = tempFolder.root

        val apk1 = File(rootDir, "app1.apk").apply { writeBytes(ByteArray(100)) }
        val apk2 = File(rootDir, "app2.apk").apply { writeBytes(ByteArray(200)) }

        val app1 = InstalledAppInfo(
            packageName = "com.test.appone",
            appName = "App One",
            versionName = "1.0",
            versionCode = 1,
            isSystemApp = false,
            apkFile = apk1,
            apkSizeBytes = 100L,
            formattedApkSize = "100 B",
            dataDirs = emptyList(),
            totalSizeBytes = 100L,
            formattedTotalSize = "100 B"
        )

        val app2 = InstalledAppInfo(
            packageName = "com.test.apptwo",
            appName = "App Two",
            versionName = "2.0",
            versionCode = 2,
            isSystemApp = false,
            apkFile = apk2,
            apkSizeBytes = 200L,
            formattedApkSize = "200 B",
            dataDirs = emptyList(),
            totalSizeBytes = 200L,
            formattedTotalSize = "200 B"
        )

        val items = AppBackupScanner.prepareAppsBackupFiles(listOf(app1, app2), includeData = false)
        assertEquals(2, items.size)
        assertTrue(items.any { it.entryPath.contains("App_One") })
        assertTrue(items.any { it.entryPath.contains("App_Two") })
    }
}
