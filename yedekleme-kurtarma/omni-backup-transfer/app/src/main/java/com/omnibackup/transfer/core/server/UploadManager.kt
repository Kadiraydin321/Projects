package com.omnibackup.transfer.core.server

import android.os.Environment
import com.omnibackup.transfer.core.scanner.WhatsAppScanner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Serializable
data class UploadedFileInfo(
    val fileName: String,
    val sizeBytes: Long,
    val formattedSize: String,
    val filePath: String,
    val uploadTimestamp: Long,
    val uploadDateFormatted: String,
    val isSuccess: Boolean = true,
    val errorMessage: String? = null
)

/**
 * PC veya diğer cihazlardan HTTP üzerinden yüklenen dosyaları karşılayan,
 * Path Traversal açıklarına karşı güvenlik filtrelemesi yapan ve
 * cihazın 'Download/OmniBackup' dizinine kesintisiz yazan yönetici motoru.
 */
class UploadManager(
    private val customStorageDir: File? = null,
    private val bufferSize: Int = 64 * 1024
) {

    private val _uploadedFiles = MutableStateFlow<List<UploadedFileInfo>>(emptyList())
    val uploadedFiles: StateFlow<List<UploadedFileInfo>> = _uploadedFiles.asStateFlow()

    /**
     * Güvenli hedef depolama dizinini döndürür. Yoksa otomatik oluşturur.
     */
    val uploadDirectory: File
        get() {
            val dir = customStorageDir ?: run {
                val downloads = try {
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                } catch (e: Exception) {
                    File("/sdcard/Download")
                }
                File(downloads, "OmniBackup")
            }
            if (!dir.exists()) {
                dir.mkdirs()
            }
            return dir
        }

    /**
     * Path traversal saldırılarına karşı dosya adını güvenli hale getirir.
     * Örneğin: "../../etc/passwd" -> "passwd", "..\..\script.sh" -> "script.sh"
     */
    fun sanitizeFileName(rawName: String): String {
        // Hem Windows (\) hem Unix (/) yol ayraçlarını standartlaştırarak traversal saldırılarını engelle
        val normalized = rawName.replace('\\', '/')
        val baseName = File(normalized).name.trim()
        val sanitized = baseName.replace(Regex("[\\\\/:*?\"<>|\u0000]"), "_")
        return if (sanitized.isBlank()) {
            "uploaded_${System.currentTimeMillis()}"
        } else {
            sanitized
        }
    }

    /**
     * Hedef dizinde dosya ismi çakışmasını önleyen benzersiz bir dosya oluşturur.
     */
    fun resolveDestinationFile(cleanFileName: String): File {
        val targetDir = uploadDirectory
        var candidate = File(targetDir, cleanFileName)
        if (!candidate.exists()) {
            return candidate
        }

        val nameWithoutExt = candidate.nameWithoutExtension
        val ext = if (candidate.extension.isNotEmpty()) ".${candidate.extension}" else ""
        var counter = 1
        while (candidate.exists()) {
            candidate = File(targetDir, "${nameWithoutExt}_$counter$ext")
            counter++
        }
        return candidate
    }

    /**
     * Gelen InputStream'i hedef diske güvenli ve akışkan olarak yazar.
     * Canlı yazma ilerlemesini onProgress ile bildirir.
     */
    suspend fun saveStream(
        originalFileName: String,
        inputStream: InputStream,
        totalBytesEstimated: Long = 0L,
        onProgress: (suspend (bytesWritten: Long, totalBytes: Long) -> Unit)? = null
    ): UploadedFileInfo = withContext(Dispatchers.IO) {
        val safeName = sanitizeFileName(originalFileName)
        val targetFile = resolveDestinationFile(safeName)
        val buffer = ByteArray(bufferSize)
        var bytesWritten = 0L
        val timestamp = System.currentTimeMillis()
        val formattedDate = SimpleDateFormat("dd.MM.yyyy HH:mm:ss", Locale.getDefault()).format(Date(timestamp))

        try {
            FileOutputStream(targetFile).use { fos ->
                var readBytes: Int
                while (inputStream.read(buffer).also { readBytes = it } != -1) {
                    fos.write(buffer, 0, readBytes)
                    bytesWritten += readBytes
                    onProgress?.invoke(bytesWritten, totalBytesEstimated)
                }
                fos.flush()
            }

            val info = UploadedFileInfo(
                fileName = targetFile.name,
                sizeBytes = bytesWritten,
                formattedSize = WhatsAppScanner.formatBytes(bytesWritten),
                filePath = targetFile.absolutePath,
                uploadTimestamp = timestamp,
                uploadDateFormatted = formattedDate,
                isSuccess = true
            )

            // Geçmiş listesine ekle (en yeni en başta)
            _uploadedFiles.value = listOf(info) + _uploadedFiles.value
            info
        } catch (e: Exception) {
            // Hata durumunda bozuk dosyayı temizle
            if (targetFile.exists()) {
                targetFile.delete()
            }

            val errorInfo = UploadedFileInfo(
                fileName = safeName,
                sizeBytes = bytesWritten,
                formattedSize = WhatsAppScanner.formatBytes(bytesWritten),
                filePath = targetFile.absolutePath,
                uploadTimestamp = timestamp,
                uploadDateFormatted = formattedDate,
                isSuccess = false,
                errorMessage = e.localizedMessage ?: "Bilinmeyen yazma hatası"
            )
            _uploadedFiles.value = listOf(errorInfo) + _uploadedFiles.value
            errorInfo
        }
    }
}
