package com.omnibackup.transfer.core.scanner

import android.os.Environment
import com.omnibackup.transfer.core.stream.FileItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/**
 * Desteklenen medya ve dosya kategorileri.
 */
enum class MediaCategory(
    val id: String,
    val displayName: String,
    val targetDirs: List<String>,
    val extensions: Set<String>
) {
    PHOTOS(
        id = "photos",
        displayName = "Fotoğraflar",
        targetDirs = listOf("DCIM", "Pictures"),
        extensions = setOf("jpg", "jpeg", "png", "webp", "heic", "raw", "dng", "bmp")
    ),
    VIDEOS(
        id = "videos",
        displayName = "Videolar",
        targetDirs = listOf("DCIM", "Movies", "Video"),
        extensions = setOf("mp4", "mkv", "mov", "avi", "3gp", "webm", "ts")
    ),
    AUDIO(
        id = "audio",
        displayName = "Ses ve Müzik",
        targetDirs = listOf("Music", "Recordings", "Podcasts", "Audio", "Ringtones"),
        extensions = setOf("mp3", "m4a", "wav", "flac", "aac", "ogg", "opus")
    ),
    DOCUMENTS(
        id = "documents",
        displayName = "Belgeler ve İndirilenler",
        targetDirs = listOf("Documents", "Download"),
        extensions = setOf("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "epub")
    ),
    ALL_STORAGE(
        id = "all_storage",
        displayName = "Tüm Depolama",
        targetDirs = emptyList(),
        extensions = emptySet()
    );

    val normalizedExtensions: Set<String> = extensions.map { it.lowercase(Locale.ROOT).trim() }.toSet()

    fun matchesExtension(file: File): Boolean {
        if (normalizedExtensions.isEmpty()) return true
        val ext = file.extension.lowercase(Locale.ROOT).trim()
        return normalizedExtensions.contains(ext)
    }
}

/**
 * Belirli bir kategorinin tarama sonuçlarını tutan veri yapısı.
 */
data class CategoryScanResult(
    val category: MediaCategory,
    val totalFilesCount: Long,
    val totalSizeBytes: Long,
    val formattedTotalSize: String,
    val files: List<File>,
    val scanDurationMs: Long = 0L
) {
    /**
     * Taranan dosyaları OnTheFlyZipStreamer için FileItem listesine dönüştürür.
     */
    fun toFileItems(baseDir: File? = null): List<FileItem> {
        val root = baseDir ?: MediaCategoryScanner.getDefaultSdCard()
        val rootPrefix = root.absolutePath + File.separator

        return files.map { file ->
            val fullPath = file.absolutePath
            val relativePath = if (fullPath.startsWith(rootPrefix)) {
                fullPath.substring(rootPrefix.length).replace(File.separatorChar, '/')
            } else {
                "${category.displayName}/${file.name}"
            }
            FileItem(file = file, entryPath = relativePath)
        }
    }
}

/**
 * Android harici depolamasındaki medya, müzik, video ve belgeleri
 * hızlı ve eşzamanlı coroutine mimarisiyle tarayan servis.
 */
object MediaCategoryScanner {

    // Son tarama sonuçları için basit bellek önbelleği
    private val scanCache = ConcurrentHashMap<MediaCategory, CategoryScanResult>()

    fun getDefaultSdCard(): File {
        return try {
            Environment.getExternalStorageDirectory()
        } catch (e: Exception) {
            File("/sdcard")
        }
    }

    /**
     * Önbelleği temizler.
     */
    fun clearCache() {
        scanCache.clear()
    }

    /**
     * Belirtilen kategoriyi tarar.
     *
     * @param category Taranacak kategori
     * @param baseDir Temel depolama kök dizini (varsayılan: SD Card)
     * @param useCache Önbellekteki geçerli sonucu kullan
     */
    suspend fun scanCategory(
        category: MediaCategory,
        baseDir: File? = null,
        useCache: Boolean = false
    ): CategoryScanResult = withContext(Dispatchers.IO) {
        if (useCache) {
            scanCache[category]?.let { return@withContext it }
        }

        val startTime = System.currentTimeMillis()
        val root = baseDir ?: getDefaultSdCard()

        val foundFiles = if (category == MediaCategory.ALL_STORAGE) {
            scanAllStorage(root)
        } else {
            scanSpecificCategory(category, root)
        }

        var totalBytes = 0L
        for (f in foundFiles) {
            totalBytes += f.length()
        }

        val duration = System.currentTimeMillis() - startTime
        val result = CategoryScanResult(
            category = category,
            totalFilesCount = foundFiles.size.toLong(),
            totalSizeBytes = totalBytes,
            formattedTotalSize = formatBytes(totalBytes),
            files = foundFiles,
            scanDurationMs = duration
        )

        scanCache[category] = result
        result
    }

    /**
     * Belirli dizinleri ve uzantıları olan kategorileri eşzamanlı coroutine ile tarar.
     * Büyük/küçük harf duyarsız klasör ve dosya uzantısı eşleştirmesi uygular.
     */
    private suspend fun scanSpecificCategory(
        category: MediaCategory,
        root: File
    ): List<File> = coroutineScope {
        val rootDirs = try {
            root.listFiles()?.filter {
                try { it.isDirectory && it.canRead() } catch (e: Throwable) { false }
            } ?: emptyList()
        } catch (e: Throwable) {
            emptyList()
        }

        val resolvedDirs = mutableListOf<File>()
        for (targetName in category.targetDirs) {
            val matched = rootDirs.filter { it.name.equals(targetName, ignoreCase = true) }
            if (matched.isNotEmpty()) {
                resolvedDirs.addAll(matched)
            } else {
                resolvedDirs.add(File(root, targetName))
            }
        }

        val candidateDirs = resolvedDirs.distinctBy { it.absolutePath }

        val deferredResults = candidateDirs.map { dir ->
            async(Dispatchers.IO) {
                val matched = mutableListOf<File>()
                val canAccessDir = try {
                    dir.exists() && dir.isDirectory && dir.canRead()
                } catch (e: Throwable) {
                    false
                }

                if (canAccessDir) {
                    try {
                        dir.walkTopDown()
                            .onEnter { subDir ->
                                try {
                                    // Gizli veya gereksiz önbellek dizinlerini atla
                                    !subDir.name.startsWith(".") &&
                                            !subDir.name.equals("cache", ignoreCase = true) &&
                                            !subDir.name.equals(".thumbnails", ignoreCase = true) &&
                                            subDir.canRead()
                                } catch (e: Throwable) {
                                    false
                                }
                            }
                            .forEach { file ->
                                try {
                                    if (file.isFile && file.canRead() && category.matchesExtension(file)) {
                                        matched.add(file)
                                    }
                                } catch (e: Throwable) {
                                    // Dosya okuma veya izin hatası
                                }
                            }
                    } catch (e: Throwable) {
                        // Dizin tarama hatası
                    }
                }
                matched
            }
        }

        // Tüm dizin sonuçlarını topla ve tekil listeye indirge (çift dosyaları önlemek için)
        val allFiles = deferredResults.awaitAll().flatten().distinctBy { it.absolutePath }
        allFiles.sortedByDescending { it.lastModified() }
    }

    /**
     * Tüm depolama alanını tarar.
     */
    private fun scanAllStorage(root: File): List<File> {
        val result = mutableListOf<File>()
        val canAccess = try {
            root.exists() && root.canRead()
        } catch (e: Throwable) {
            false
        }
        if (!canAccess) return result

        try {
            root.walkTopDown()
                .onEnter { dir ->
                    try {
                        !dir.name.equals(".thumbnails", ignoreCase = true) &&
                                !dir.name.equals("cache", ignoreCase = true) &&
                                dir.canRead()
                    } catch (e: Throwable) {
                        false
                    }
                }
                .forEach { file ->
                    try {
                        if (file.isFile && file.canRead()) {
                            result.add(file)
                        }
                    } catch (e: Throwable) {
                        // Dosya okuma hatası
                    }
                }
        } catch (e: Throwable) {
            // Depolama tarama hatası
        }

        return result
    }

    /**
     * Tüm kategorileri eşzamanlı olarak tarar.
     */
    suspend fun scanAllCategories(
        baseDir: File? = null,
        includeAllStorage: Boolean = false
    ): Map<MediaCategory, CategoryScanResult> = coroutineScope {
        val categoriesToScan = MediaCategory.values().filter {
            if (it == MediaCategory.ALL_STORAGE) includeAllStorage else true
        }

        val deferredMap = categoriesToScan.map { cat ->
            cat to async(Dispatchers.IO) { scanCategory(cat, baseDir, useCache = false) }
        }

        deferredMap.associate { (cat, deferred) -> cat to deferred.await() }
    }

    /**
     * Dosya listesini OnTheFlyZipStreamer için FileItem listesine dönüştürür.
     */
    fun prepareCategoryBackupFiles(
        category: MediaCategory,
        files: List<File>,
        baseDir: File? = null
    ): List<FileItem> {
        val root = baseDir ?: getDefaultSdCard()
        val rootPrefix = root.absolutePath + File.separator

        return files.map { file ->
            val fullPath = file.absolutePath
            val relativePath = if (fullPath.startsWith(rootPrefix)) {
                fullPath.substring(rootPrefix.length).replace(File.separatorChar, '/')
            } else {
                "${category.displayName}/${file.name}"
            }
            FileItem(file = file, entryPath = relativePath)
        }
    }

    /**
     * Bayt boyutunu insan tarafından kolay okunabilir formata dönüştürür (B, KB, MB, GB).
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
