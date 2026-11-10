package com.birin.moonnovel.updater

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.birin.moonnovel.SecureNetworkClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

sealed class UpdateStatus {
    object Idle : UpdateStatus()
    object Checking : UpdateStatus()
    data class UpdateAvailable(
        val remoteVersionName: String,
        val remoteVersionCode: Int,
        val currentVersionName: String,
        val currentVersionCode: Int,
        val releaseNotes: String,
        val downloadUrl: String,
        val releaseDate: String = ""
    ) : UpdateStatus()
    data class UpToDate(val currentVersionName: String) : UpdateStatus()
    data class Downloading(val progressPercent: Int, val downloadedBytes: Long, val totalBytes: Long) : UpdateStatus()
    data class ReadyToInstall(val apkFile: File) : UpdateStatus()
    data class Error(val message: String) : UpdateStatus()
}

class AppUpdateManager(private val context: Context) {

    companion object {
        private const val GITHUB_VERSION_JSON_URL = "https://raw.githubusercontent.com/Kadiraydin321/NoteApp/novel-downloader-apk/version.json"
        private const val DEFAULT_APK_RAW_URL = "https://raw.githubusercontent.com/Kadiraydin321/NoteApp/novel-downloader-apk/NovelReaderDownloader.apk"
        private const val APK_FILE_NAME = "MoonNovel-update.apk"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val client = SecureNetworkClient.client

    private val _updateStatus = MutableStateFlow<UpdateStatus>(UpdateStatus.Idle)
    val updateStatus: StateFlow<UpdateStatus> = _updateStatus.asStateFlow()

    private var pendingApkFile: File? = null

    fun hasPendingInstall(): Boolean {
        val file = pendingApkFile
        return file != null && file.exists() && file.length() > 100_000L
    }

    fun retryPendingInstall() {
        val file = pendingApkFile ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (context.packageManager.canRequestPackageInstalls()) {
                installApk(file)
            }
        } else {
            installApk(file)
        }
    }

    /**
     * Güncelleme Kontrol Mantığı:
     * - isManual false ise sessiz kontrol yapar, altta gereksiz popup açmaz.
     * - Cache-buster query parametresi ekleyerek GitHub CDN önbelleğini atlar.
     */
    fun checkForUpdates(isManual: Boolean = false) {
        scope.launch {
            if (isManual) {
                _updateStatus.value = UpdateStatus.Checking
            }
            try {
                val cacheBusterUrl = "$GITHUB_VERSION_JSON_URL?t=${System.currentTimeMillis()}"
                val req = Request.Builder()
                    .url(cacheBusterUrl)
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .header("Pragma", "no-cache")
                    .build()

                val response = client.newCall(req).execute()
                if (!response.isSuccessful) {
                    if (isManual) {
                        _updateStatus.value = UpdateStatus.Error("Güncelleme sunucusuna erişilemedi (${response.code})")
                    } else {
                        _updateStatus.value = UpdateStatus.Idle
                    }
                    return@launch
                }

                val jsonStr = response.body?.string() ?: "{}"
                val json = JSONObject(jsonStr)

                val remoteVersionCode = json.optInt("versionCode", 0)
                val remoteVersionName = json.optString("versionName", "1.0.0.0")
                val releaseNotes = json.optString("releaseNotes", "Performans ve arayüz iyileştirmeleri.")
                val downloadUrl = json.optString("downloadUrl", DEFAULT_APK_RAW_URL)

                val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                val currentVersionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    pInfo.longVersionCode.toInt()
                } else {
                    @Suppress("DEPRECATION")
                    pInfo.versionCode
                }
                val currentVersionName = pInfo.versionName ?: "1.0"

                if (remoteVersionCode > currentVersionCode) {
                    _updateStatus.value = UpdateStatus.UpdateAvailable(
                        remoteVersionName = remoteVersionName,
                        remoteVersionCode = remoteVersionCode,
                        currentVersionName = currentVersionName,
                        currentVersionCode = currentVersionCode,
                        releaseNotes = releaseNotes,
                        downloadUrl = downloadUrl
                    )
                } else {
                    _updateStatus.value = UpdateStatus.UpToDate(currentVersionName)
                }
            } catch (e: Exception) {
                if (isManual) {
                    _updateStatus.value = UpdateStatus.Error("Kontrol sırasında hata oluştu: ${e.localizedMessage}")
                } else {
                    _updateStatus.value = UpdateStatus.Idle
                }
            }
        }
    }

    /**
     * İndirme ve Doğrulama
     */
    fun downloadAndInstallUpdate(updateInfo: UpdateStatus.UpdateAvailable) {
        scope.launch {
            try {
                val downloadUrlWithCacheBust = if (updateInfo.downloadUrl.contains("?")) {
                    "${updateInfo.downloadUrl}&t=${System.currentTimeMillis()}"
                } else {
                    "${updateInfo.downloadUrl}?t=${System.currentTimeMillis()}"
                }

                val req = Request.Builder()
                    .url(downloadUrlWithCacheBust)
                    .header("Cache-Control", "no-cache")
                    .build()

                val response = client.newCall(req).execute()
                val body = response.body ?: throw Exception("Boş dosya yanıtı alındı")

                val totalBytes = body.contentLength()
                val updateDir = File(context.getExternalFilesDir(null) ?: context.cacheDir, "updates")
                if (!updateDir.exists()) updateDir.mkdirs()

                val apkFile = File(updateDir, APK_FILE_NAME)
                if (apkFile.exists()) apkFile.delete()

                val inputStream = body.byteStream()
                val outputStream = FileOutputStream(apkFile)

                val buffer = ByteArray(32 * 1024)
                var bytesRead: Int
                var downloadedBytes = 0L

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    downloadedBytes += bytesRead
                    if (totalBytes > 0) {
                        val progress = ((downloadedBytes * 100) / totalBytes).toInt()
                        _updateStatus.value = UpdateStatus.Downloading(progress, downloadedBytes, totalBytes)
                    }
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()

                // Tüm işlemler için okunabilir yap
                apkFile.setReadable(true, false)

                // APK Bütünlük Doğrulaması
                val archiveInfo = context.packageManager.getPackageArchiveInfo(apkFile.absolutePath, 0)
                if (archiveInfo == null) {
                    apkFile.delete()
                    _updateStatus.value = UpdateStatus.Error("İndirilen APK dosyası doğrulanamadı veya eksik.")
                    return@launch
                }

                withContext(Dispatchers.Main) {
                    installApk(apkFile)
                }
            } catch (e: Exception) {
                _updateStatus.value = UpdateStatus.Error("İndirme başarısız: ${e.localizedMessage}")
            }
        }
    }

    /**
     * Güvenli FileProvider ve İzin Kontrolleri ile Kurulum Başlatma
     */
    fun installApk(apkFile: File) {
        try {
            if (!apkFile.exists() || apkFile.length() < 100_000L) {
                _updateStatus.value = UpdateStatus.Error("Yüklenecek APK dosyası bulunamadı.")
                return
            }

            apkFile.setReadable(true, false)

            // Android 8.0+ Bilinmeyen Kaynaktan Yükleme İzni Kontrolü
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    pendingApkFile = apkFile
                    val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${context.packageName}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(settingsIntent)
                    _updateStatus.value = UpdateStatus.Error("Lütfen Moon Novel için 'Bu kaynaktan izin ver' seçeneğini açıp geri dönün.")
                    return
                }
            }

            pendingApkFile = null

            val contentUri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }

            // Tüm eşleşen paket yükleyicilere okuma yetkisi ver
            val resolveInfoList = context.packageManager.queryIntentActivities(intent, 0)
            for (resolveInfo in resolveInfoList) {
                context.grantUriPermission(
                    resolveInfo.activityInfo.packageName,
                    contentUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            _updateStatus.value = UpdateStatus.ReadyToInstall(apkFile)
            context.startActivity(intent)

        } catch (e: Exception) {
            _updateStatus.value = UpdateStatus.Error("Yükleme başlatılamadı: ${e.localizedMessage}")
        }
    }
}
