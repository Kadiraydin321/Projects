package com.omnibackup.transfer.core.scanner

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Environment
import com.omnibackup.transfer.core.stream.FileItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale

/**
 * Uygulamanın harici depolamadaki veri veya medya dizini bilgisi.
 */
data class AppDataDirInfo(
    val type: String, // "data" veya "media"
    val dir: File,
    val sizeBytes: Long,
    val filesCount: Long,
    val formattedSize: String
)

/**
 * Yüklü bir uygulamanın APK ve erişilebilir veri dizinleri hakkındaki tüm bilgileri tutar.
 */
data class InstalledAppInfo(
    val packageName: String,
    val appName: String,
    val versionName: String,
    val versionCode: Long,
    val isSystemApp: Boolean,
    val apkFile: File,
    val apkSizeBytes: Long,
    val formattedApkSize: String,
    val dataDirs: List<AppDataDirInfo>,
    val totalSizeBytes: Long,
    val formattedTotalSize: String,
    val icon: Drawable? = null
)

/**
 * Android cihazda yüklü kullanıcı ve sistem uygulamalarını tarayan,
 * APK'larını ve erişilebilir harici veri/medya dizinlerini tespit edip
 * OnTheFlyZipStreamer için hazır hale getiren modül.
 */
object AppBackupScanner {

    private fun getDefaultSdCard(): File {
        return try {
            Environment.getExternalStorageDirectory()
        } catch (e: Exception) {
            File("/sdcard")
        }
    }

    /**
     * Yüklü uygulamaları tarar.
     *
     * @param context Android context
     * @param includeSystemApps Sistem uygulamalarını dahil et
     * @return Yüklü uygulamalar listesi
     */
    suspend fun scanInstalledApps(
        context: Context,
        includeSystemApps: Boolean = false
    ): List<InstalledAppInfo> = withContext(Dispatchers.IO) {
        val pm = context.packageManager
        val packages: List<PackageInfo> = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getInstalledPackages(PackageManager.PackageInfoFlags.of(PackageManager.GET_META_DATA.toLong()))
            } else {
                @Suppress("DEPRECATION")
                pm.getInstalledPackages(PackageManager.GET_META_DATA)
            }
        } catch (e: Exception) {
            emptyList()
        }

        val sdCard = getDefaultSdCard()
        val resultList = mutableListOf<InstalledAppInfo>()

        for (pkg in packages) {
            try {
                val appInfo = pkg.applicationInfo ?: continue
                val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                val isUpdatedSystem = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

                // includeSystemApps false ise saf sistem uygulamalarını atla (güncellenmiş olanlar kullanıcı verisi taşıyabilir)
                if (!includeSystemApps && isSystem && !isUpdatedSystem) {
                    continue
                }

                val packageName = pkg.packageName
                val appName = try {
                    pm.getApplicationLabel(appInfo).toString()
                } catch (e: Exception) {
                    packageName
                }

                val versionName = pkg.versionName ?: "1.0"
                val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    pkg.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    pkg.versionCode.toLong()
                }

                val apkPath = appInfo.sourceDir
                val apkFile = if (apkPath != null) File(apkPath) else null
                val apkCanRead = try {
                    apkFile != null && apkFile.exists() && apkFile.canRead()
                } catch (e: Throwable) {
                    false
                }

                val apkSize = if (apkCanRead && apkFile != null) {
                    try { apkFile.length() } catch (e: Throwable) { 0L }
                } else 0L

                if (apkFile == null || !apkCanRead) {
                    continue
                }

                val iconDrawable: Drawable? = try {
                    pm.getApplicationIcon(appInfo)
                } catch (e: Exception) {
                    null
                }

                // Erişilebilir harici data ve media dizinleri (Scoped Storage korumalı)
                val candidateDataDirs = listOf(
                    Pair("data", File(sdCard, "Android/data/$packageName")),
                    Pair("media", File(sdCard, "Android/media/$packageName"))
                )

                val appDataDirs = mutableListOf<AppDataDirInfo>()
                var totalDataSize = 0L

                for ((type, dir) in candidateDataDirs) {
                    val canAccessDir = try {
                        dir.exists() && dir.isDirectory && dir.canRead()
                    } catch (e: Throwable) {
                        false
                    }

                    if (canAccessDir) {
                        var dirSize = 0L
                        var fileCount = 0L

                        try {
                            dir.walkTopDown()
                                .onEnter { subDir ->
                                    try {
                                        subDir.canRead()
                                    } catch (e: Throwable) {
                                        false
                                    }
                                }
                                .forEach { f ->
                                    try {
                                        if (f.isFile && f.canRead()) {
                                            dirSize += f.length()
                                            fileCount++
                                        }
                                    } catch (e: Throwable) {
                                        // Bireysel dosya okuma hatası
                                    }
                                }
                        } catch (e: Throwable) {
                            // Scoped Storage veya izin hatası durumunda okunan kadarı alınır
                        }

                        if (fileCount > 0 || dirSize > 0) {
                            appDataDirs.add(
                                AppDataDirInfo(
                                    type = type,
                                    dir = dir,
                                    sizeBytes = dirSize,
                                    filesCount = fileCount,
                                    formattedSize = formatBytes(dirSize)
                                )
                            )
                            totalDataSize += dirSize
                        }
                    }
                }

                val totalSize = apkSize + totalDataSize

                resultList.add(
                    InstalledAppInfo(
                        packageName = packageName,
                        appName = appName,
                        versionName = versionName,
                        versionCode = versionCode,
                        isSystemApp = isSystem,
                        apkFile = apkFile,
                        apkSizeBytes = apkSize,
                        formattedApkSize = formatBytes(apkSize),
                        dataDirs = appDataDirs,
                        totalSizeBytes = totalSize,
                        formattedTotalSize = formatBytes(totalSize),
                        icon = iconDrawable
                    )
                )
            } catch (t: Throwable) {
                // Tek bir uygulamanın izin/erişim hatası genel taramayı durdurmasın
            }
        }

        // İsme göre alfabetik sırala
        resultList.sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.appName })
    }

    /**
     * Tek bir uygulamanın APK ve veri dizinlerini OnTheFlyZipStreamer için FileItem listesine dönüştürür.
     *
     * @param app Uygulama bilgisi
     * @param includeData Harici data ve media dizinlerini dahil et
     */
    fun prepareAppBackupFiles(
        app: InstalledAppInfo,
        includeData: Boolean = true
    ): List<FileItem> {
        val items = mutableListOf<FileItem>()
        val sanitizedAppName = sanitizeFileName(app.appName)
        val appFolderPrefix = "Apps/${sanitizedAppName}_${app.packageName}"

        // 1. APK Dosyası
        try {
            if (app.apkFile.exists() && app.apkFile.canRead()) {
                val apkEntryName = "$appFolderPrefix/${sanitizedAppName}_v${app.versionName}.apk"
                items.add(FileItem(file = app.apkFile, entryPath = apkEntryName))
            }
        } catch (e: Throwable) {
            // APK erişim istisnası
        }

        // 2. Data ve Media Dizinleri (Scoped Storage korumalı)
        if (includeData) {
            for (dataInfo in app.dataDirs) {
                val baseDir = dataInfo.dir
                val basePrefix = baseDir.absolutePath + File.separator

                try {
                    baseDir.walkTopDown()
                        .onEnter { subDir ->
                            try {
                                subDir.canRead()
                            } catch (e: Throwable) {
                                false
                            }
                        }
                        .filter { file ->
                            try {
                                file.isFile && file.canRead()
                            } catch (e: Throwable) {
                                false
                            }
                        }
                        .forEach { file ->
                            val fullPath = file.absolutePath
                            val relativePath = if (fullPath.startsWith(basePrefix)) {
                                fullPath.substring(basePrefix.length).replace(File.separatorChar, '/')
                            } else {
                                file.name
                            }
                            val entryPath = "$appFolderPrefix/${dataInfo.type}/$relativePath"
                            items.add(FileItem(file = file, entryPath = entryPath))
                        }
                } catch (e: Throwable) {
                    // Dizin okuma istisnası
                }
            }
        }

        return items
    }

    /**
     * Seçilen uygulamalar listesini OnTheFlyZipStreamer için birleştirilmiş FileItem listesine dönüştürür.
     *
     * @param apps Yedeklenecek uygulamalar
     * @param includeData Uygulama verilerini dahil et
     */
    fun prepareAppsBackupFiles(
        apps: List<InstalledAppInfo>,
        includeData: Boolean = true
    ): List<FileItem> {
        val allItems = mutableListOf<FileItem>()
        for (app in apps) {
            allItems.addAll(prepareAppBackupFiles(app, includeData))
        }
        return allItems
    }

    /**
     * Dosya ve klasör isimlerinde geçersiz karakterleri temizler.
     */
    fun sanitizeFileName(name: String): String {
        return name.replace(Regex("[\\\\/:*?\"<>|\\s]+"), "_").trim('_')
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
