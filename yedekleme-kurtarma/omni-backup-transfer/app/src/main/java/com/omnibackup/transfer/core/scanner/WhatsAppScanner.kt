package com.omnibackup.transfer.core.scanner

import android.os.Environment
import kotlinx.serialization.Serializable
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Serializable
enum class WhatsAppType(val displayName: String, val packageName: String, val id: String) {
    WHATSAPP("WhatsApp", "com.whatsapp", "whatsapp"),
    WHATSAPP_BUSINESS("WhatsApp Business", "com.whatsapp.w4b", "whatsapp_business")
}

@Serializable
data class WhatsAppItemStats(
    val totalSizeBytes: Long = 0L,
    val totalFilesCount: Long = 0L,
    val databaseBytes: Long = 0L,
    val databaseFilesCount: Long = 0L,
    val mediaBytes: Long = 0L,
    val mediaFilesCount: Long = 0L,
    val backupBytes: Long = 0L,
    val backupFilesCount: Long = 0L,
    val formattedSize: String = "",
    val latestBackupTimestamp: Long = 0L,
    val latestBackupDateFormatted: String = ""
)

data class WhatsAppLocationInfo(
    val type: WhatsAppType,
    val rootDir: File,
    val databasesDir: File?,
    val mediaDir: File?,
    val backupsDir: File?,
    val stats: WhatsAppItemStats
) {
    val id: String get() = type.id
    val displayName: String get() = type.displayName
}

/**
 * Modern ve eski depolama konumlarını tarayan, WhatsApp ve WhatsApp Business
 * veritabanlarını, medyalarını ve yedeklerini ayrıştıran yüksek performanslı tarayıcı.
 */
object WhatsAppScanner {

    private fun getDefaultSdCard(): File {
        return try {
            Environment.getExternalStorageDirectory()
        } catch (e: Exception) {
            File("/sdcard")
        }
    }

    /**
     * Yüklü olan WhatsApp ve WhatsApp Business dizinlerini tarar ve detaylı istatistikleriyle döndürür.
     * @param baseDir Test veya özel senaryolar için depolama kök dizini (varsayılan: SD_CARD)
     */
    fun scanAll(baseDir: File? = null): List<WhatsAppLocationInfo> {
        val root = baseDir ?: getDefaultSdCard()
        val results = mutableListOf<WhatsAppLocationInfo>()

        for (type in WhatsAppType.values()) {
            val candidateDirs = listOf(
                // 1. Android 11+ Modern Medya Dizini (İç içe klasör varyantı)
                File(root, "Android/media/${type.packageName}/${type.displayName}"),
                // 2. Android 11+ Modern Medya Dizini (Doğrudan paket adı altı varyantı)
                File(root, "Android/media/${type.packageName}"),
                // 3. Android 10 ve Öncesi Klasik Kök Dizin
                File(root, type.displayName)
            )

            for (dir in candidateDirs) {
                try {
                    if (dir.exists() && dir.isDirectory && dir.canRead()) {
                        val dbDir = File(dir, "Databases").takeIf { it.exists() && it.isDirectory }
                        val mediaDir = File(dir, "Media").takeIf { it.exists() && it.isDirectory }
                        val backupsDir = File(dir, "Backups").takeIf { it.exists() && it.isDirectory }

                        // Geçerli bir WhatsApp dizini sayılması için en azından Databases veya Media bulunmalıdır
                        if (dbDir != null || mediaDir != null) {
                            val stats = calculateStats(dir, dbDir, mediaDir, backupsDir)
                            results.add(
                                WhatsAppLocationInfo(
                                    type = type,
                                    rootDir = dir,
                                    databasesDir = dbDir,
                                    mediaDir = mediaDir,
                                    backupsDir = backupsDir,
                                    stats = stats
                                )
                            )
                            break // Bu tip için ilk geçerli ana dizini bulduktan sonra diğer adaylara geçme
                        }
                    }
                } catch (e: Exception) {
                    // Güvenlik veya I/O istisnalarında diğer adaylara devam et
                }
            }
        }

        return results
    }

    /**
     * .Statuses geçici klasörünü filtreleyerek dizin içindeki dosya istatistiklerini hesaplar.
     */
    fun calculateStats(
        rootDir: File,
        dbDir: File?,
        mediaDir: File?,
        backupsDir: File?
    ): WhatsAppItemStats {
        var totalSize = 0L
        var totalCount = 0L

        var dbSize = 0L
        var dbCount = 0L

        var mediaSize = 0L
        var mediaCount = 0L

        var backupSize = 0L
        var backupCount = 0L

        var latestBackupTime = 0L

        val dbPath = dbDir?.absolutePath
        val mediaPath = mediaDir?.absolutePath
        val backupsPath = backupsDir?.absolutePath

        try {
            rootDir.walkTopDown()
                .onEnter { dir ->
                    try {
                        // .Statuses klasörünü taramaya dahil etme (geçici durum videoları/resimleri)
                        !dir.name.equals(".Statuses", ignoreCase = true)
                    } catch (e: Exception) {
                        false
                    }
                }
                .forEach { file ->
                    try {
                        if (file.isFile && file.canRead()) {
                            val length = file.length()
                            totalSize += length
                            totalCount++

                            val path = file.absolutePath
                            when {
                                dbPath != null && path.startsWith(dbPath) -> {
                                    dbSize += length
                                    dbCount++
                                    if (file.lastModified() > latestBackupTime) {
                                        latestBackupTime = file.lastModified()
                                    }
                                }
                                mediaPath != null && path.startsWith(mediaPath) -> {
                                    mediaSize += length
                                    mediaCount++
                                }
                                backupsPath != null && path.startsWith(backupsPath) -> {
                                    backupSize += length
                                    backupCount++
                                }
                            }
                        }
                    } catch (e: Exception) {
                        // Kilitli veya okunamayan dosyalarda diğer dosyalarla devam et
                    }
                }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val dateFormatted = if (latestBackupTime > 0) {
            SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault()).format(Date(latestBackupTime))
        } else {
            "Bilinmiyor"
        }

        return WhatsAppItemStats(
            totalSizeBytes = totalSize,
            totalFilesCount = totalCount,
            databaseBytes = dbSize,
            databaseFilesCount = dbCount,
            mediaBytes = mediaSize,
            mediaFilesCount = mediaCount,
            backupBytes = backupSize,
            backupFilesCount = backupCount,
            formattedSize = formatBytes(totalSize),
            latestBackupTimestamp = latestBackupTime,
            latestBackupDateFormatted = dateFormatted
        )
    }

    /**
     * Arşivlenecek tüm dosyaları liste olarak döndürür.
     * (.Statuses dizinini atlar, .nomedia dosyalarını korur).
     */
    fun getFilesToBackup(rootDir: File): Sequence<File> {
        return rootDir.walkTopDown()
            .onEnter { dir -> !dir.name.equals(".Statuses", ignoreCase = true) }
            .filter { file -> file.isFile }
    }

    /**
     * Bayt değerini insan tarafından okunabilir birime (B, KB, MB, GB) çevirir.
     */
    fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        val kb = bytes / 1024.0
        if (kb < 1024) return String.format(Locale.US, "%.1f KB", kb)
        val mb = kb / 1024.0
        if (mb < 1024) return String.format(Locale.US, "%.2f MB", mb)
        val gb = mb / 1024.0
        return String.format(Locale.US, "%.2f GB", gb)
    }
}
