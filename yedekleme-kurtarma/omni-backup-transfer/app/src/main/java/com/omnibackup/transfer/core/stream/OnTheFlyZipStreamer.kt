package com.omnibackup.transfer.core.stream

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.OutputStream
import java.util.zip.Deflater
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * ZIP akışına dahil edilecek dosya ve arşiv içi yolu temsil eder.
 */
data class FileItem(
    val file: File,
    val entryPath: String
)

/**
 * Cihaz hafızasında hiçbir geçici ZIP dosyası oluşturmadan, diskten okunan baytları
 * doğrudan HTTP çıkış akışına (OutputStream) canlı olarak sıkıştırıp gönderen motor.
 */
class OnTheFlyZipStreamer(
    private val bufferSize: Int = 64 * 1024, // 64 KB bellek tamponu
    private val compressionLevel: Int = Deflater.BEST_SPEED
) {

    data class ProgressInfo(
        val bytesTransferred: Long,
        val totalBytes: Long,
        val currentFileName: String,
        val percentage: Float
    )

    /**
     * Belirtilen FileItem listesini canlı olarak OutputStream'e ZIP formatında akıtır.
     *
     * @param items Arşivlenecek FileItem listesi
     * @param outputStream HTTP yanıt akışı
     * @param totalEstimatedBytes Önceden hesaplanmış toplam kaynak bayt boyutu
     * @param onProgress Her tampon yazıldığında çağrılan ilerleme geri bildirimi
     */
    suspend fun streamFileListToZip(
        items: List<FileItem>,
        outputStream: OutputStream,
        totalEstimatedBytes: Long,
        onProgress: suspend (ProgressInfo) -> Unit
    ) = withContext(Dispatchers.IO) {
        val zipOut = ZipOutputStream(outputStream.buffered(bufferSize)).apply {
            setLevel(compressionLevel)
        }

        val buffer = ByteArray(bufferSize)
        var totalBytesRead = 0L

        try {
            for (item in items) {
                val file = item.file
                if (!file.isFile || !file.canRead()) continue

                val cleanPath = item.entryPath.replace(File.separatorChar, '/').removePrefix("/")
                val zipEntry = ZipEntry(cleanPath).apply {
                    time = file.lastModified()
                }

                zipOut.putNextEntry(zipEntry)

                try {
                    FileInputStream(file).use { fis ->
                        var readBytes: Int
                        while (fis.read(buffer).also { readBytes = it } != -1) {
                            zipOut.write(buffer, 0, readBytes)
                            totalBytesRead += readBytes

                            val percent = if (totalEstimatedBytes > 0) {
                                ((totalBytesRead.toDouble() / totalEstimatedBytes.toDouble()) * 100.0)
                                    .toFloat()
                                    .coerceIn(0f, 100f)
                            } else 0f

                            onProgress(
                                ProgressInfo(
                                    bytesTransferred = totalBytesRead,
                                    totalBytes = totalEstimatedBytes,
                                    currentFileName = file.name,
                                    percentage = percent
                                )
                            )
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    zipOut.closeEntry()
                }
            }

            zipOut.finish()
            zipOut.flush()
        } finally {
            // ZipOutputStream'i kapatmıyoruz çünkü Ktor veya dış akış kendisi yönetir
        }
    }

    /**
     * Belirtilen kök klasörü canlı olarak OutputStream'e ZIP formatında akıtır.
     *
     * @param rootDir Sıkıştırılacak klasör
     * @param outputStream HTTP yanıt akışı
     * @param totalEstimatedBytes Önceden hesaplanmış toplam kaynak bayt boyutu
     * @param onProgress Her tampon yazıldığında çağrılan ilerleme geri bildirimi
     */
    suspend fun streamFolderToZip(
        rootDir: File,
        outputStream: OutputStream,
        totalEstimatedBytes: Long,
        onProgress: suspend (ProgressInfo) -> Unit
    ) = withContext(Dispatchers.IO) {
        val zipOut = ZipOutputStream(outputStream.buffered(bufferSize)).apply {
            setLevel(compressionLevel)
        }

        val buffer = ByteArray(bufferSize)
        var totalBytesRead = 0L

        val rootPrefix = rootDir.parentFile?.absolutePath?.let {
            if (it.endsWith(File.separator)) it else it + File.separator
        } ?: (rootDir.absolutePath + File.separator)

        try {
            val files = rootDir.walkTopDown()
                .onEnter { dir -> !dir.name.equals(".Statuses", ignoreCase = true) }
                .filter { it.isFile && it.canRead() }

            for (file in files) {
                val fullPath = file.absolutePath
                val relativePath = if (fullPath.startsWith(rootPrefix)) {
                    fullPath.substring(rootPrefix.length).replace(File.separatorChar, '/')
                } else {
                    file.name
                }

                val zipEntry = ZipEntry(relativePath).apply {
                    time = file.lastModified()
                }

                zipOut.putNextEntry(zipEntry)

                try {
                    FileInputStream(file).use { fis ->
                        var readBytes: Int
                        while (fis.read(buffer).also { readBytes = it } != -1) {
                            zipOut.write(buffer, 0, readBytes)
                            totalBytesRead += readBytes

                            val percent = if (totalEstimatedBytes > 0) {
                                ((totalBytesRead.toDouble() / totalEstimatedBytes.toDouble()) * 100.0)
                                    .toFloat()
                                    .coerceIn(0f, 100f)
                            } else 0f

                            onProgress(
                                ProgressInfo(
                                    bytesTransferred = totalBytesRead,
                                    totalBytes = totalEstimatedBytes,
                                    currentFileName = file.name,
                                    percentage = percent
                                )
                            )
                        }
                    }
                } catch (e: Exception) {
                    // Tek bir dosya okuma hatası tüm aktarımı kesmesin (örn. WhatsApp anlık kilitleri)
                    e.printStackTrace()
                } finally {
                    zipOut.closeEntry()
                }
            }

            zipOut.finish()
            zipOut.flush()
        } finally {
            // ZipOutputStream'i kapatmıyoruz çünkü Ktor veya dış akış kendisi yönetir
        }
    }

    /**
     * Dağınık dosya listelerini (fotoğraflar, videolar, APK'lar vb.) canlı olarak
     * HTTP çıkış akışına (OutputStream) tek bir ZIP arşivi olarak akıtır.
     *
     * @param files Sıkıştırılacak dosya listesi
     * @param outputStream HTTP yanıt akışı
     * @param totalEstimatedBytes Önceden hesaplanmış toplam kaynak bayt boyutu
     * @param baseDir Varsa ortak kök dizin (göreceli yolları korumak için). Yoksa doğrudan dosya adı kullanılır.
     * @param onProgress Her tampon yazıldığında çağrılan ilerleme geri bildirimi
     */
    suspend fun streamFilesToZip(
        files: List<File>,
        outputStream: OutputStream,
        totalEstimatedBytes: Long,
        baseDir: File? = null,
        onProgress: suspend (ProgressInfo) -> Unit
    ) = withContext(Dispatchers.IO) {
        val zipOut = ZipOutputStream(outputStream.buffered(bufferSize)).apply {
            setLevel(compressionLevel)
        }

        val buffer = ByteArray(bufferSize)
        var totalBytesRead = 0L
        val usedEntryNames = HashSet<String>()

        val basePrefix = baseDir?.absolutePath?.let {
            if (it.endsWith(File.separator)) it else it + File.separator
        }

        try {
            for (file in files) {
                if (!file.exists() || !file.isFile || !file.canRead()) continue

                val fullPath = file.absolutePath
                var relativePath = if (basePrefix != null && fullPath.startsWith(basePrefix)) {
                    fullPath.substring(basePrefix.length).replace(File.separatorChar, '/')
                } else {
                    file.name
                }

                // ZIP içinde aynı isimde birden fazla girdi olmasını engelle
                if (usedEntryNames.contains(relativePath)) {
                    val dotIndex = relativePath.lastIndexOf('.')
                    var counter = 1
                    var candidateName: String
                    do {
                        candidateName = if (dotIndex != -1) {
                            "${relativePath.substring(0, dotIndex)}_$counter${relativePath.substring(dotIndex)}"
                        } else {
                            "${relativePath}_$counter"
                        }
                        counter++
                    } while (usedEntryNames.contains(candidateName))
                    relativePath = candidateName
                }
                usedEntryNames.add(relativePath)

                val zipEntry = ZipEntry(relativePath).apply {
                    time = file.lastModified()
                }

                zipOut.putNextEntry(zipEntry)

                try {
                    FileInputStream(file).use { fis ->
                        var readBytes: Int
                        while (fis.read(buffer).also { readBytes = it } != -1) {
                            zipOut.write(buffer, 0, readBytes)
                            totalBytesRead += readBytes

                            val percent = if (totalEstimatedBytes > 0) {
                                ((totalBytesRead.toDouble() / totalEstimatedBytes.toDouble()) * 100.0)
                                    .toFloat()
                                    .coerceIn(0f, 100f)
                            } else 0f

                            onProgress(
                                ProgressInfo(
                                    bytesTransferred = totalBytesRead,
                                    totalBytes = totalEstimatedBytes,
                                    currentFileName = file.name,
                                    percentage = percent
                                )
                            )
                        }
                    }
                } catch (e: Exception) {
                    // Tek bir dosya okuma hatası tüm aktarımı kesmesin
                    e.printStackTrace()
                } finally {
                    zipOut.closeEntry()
                }
            }

            zipOut.finish()
            zipOut.flush()
        } finally {
            // ZipOutputStream dış akış tarafından kapatılır
        }
    }

    /**
     * Tek bir dosyayı canlı olarak akışa yazar (doğrudan indirmeler için).
     */
    suspend fun streamSingleFile(
        file: File,
        outputStream: OutputStream,
        onProgress: suspend (ProgressInfo) -> Unit
    ) = withContext(Dispatchers.IO) {
        val totalBytes = file.length()
        var bytesRead = 0L
        val buffer = ByteArray(bufferSize)

        FileInputStream(file).use { fis ->
            var read: Int
            while (fis.read(buffer).also { read = it } != -1) {
                outputStream.write(buffer, 0, read)
                bytesRead += read

                val percent = if (totalBytes > 0) {
                    ((bytesRead.toDouble() / totalBytes.toDouble()) * 100.0)
                        .toFloat()
                        .coerceIn(0f, 100f)
                } else 0f

                onProgress(
                    ProgressInfo(
                        bytesTransferred = bytesRead,
                        totalBytes = totalBytes,
                        currentFileName = file.name,
                        percentage = percent
                    )
                )
            }
            outputStream.flush()
        }
    }
}
