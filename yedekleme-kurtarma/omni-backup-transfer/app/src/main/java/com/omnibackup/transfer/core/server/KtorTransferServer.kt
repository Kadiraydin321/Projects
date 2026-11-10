package com.omnibackup.transfer.core.server

import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.StatFs
import com.omnibackup.transfer.OmniBackupApplication
import com.omnibackup.transfer.core.network.NetworkUtils
import com.omnibackup.transfer.core.scanner.AppBackupScanner
import com.omnibackup.transfer.core.scanner.InstalledAppInfo
import com.omnibackup.transfer.core.scanner.MediaCategory
import com.omnibackup.transfer.core.scanner.MediaCategoryScanner
import com.omnibackup.transfer.core.scanner.WhatsAppItemStats
import com.omnibackup.transfer.core.scanner.WhatsAppScanner
import com.omnibackup.transfer.core.stream.FileItem
import com.omnibackup.transfer.core.stream.OnTheFlyZipStreamer
import com.omnibackup.transfer.core.web.WebAssets
import io.ktor.http.ContentDisposition
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.http.content.streamProvider
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.ApplicationEngine
import io.ktor.server.engine.embeddedServer
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.request.receiveMultipart
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondOutputStream
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.close
import io.ktor.websocket.readText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.ClosedSendChannelException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.text.SimpleDateFormat
import java.util.Collections
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

@Serializable
data class DeviceInfoResponse(
    val deviceModel: String,
    val androidVersion: String,
    val freeStorageBytes: Long,
    val totalStorageBytes: Long,
    val freeStorageFormatted: String,
    val totalStorageFormatted: String,
    val whatsappAccounts: List<WhatsAppAccountDto>
)

@Serializable
data class WhatsAppAccountDto(
    val id: String,
    val displayName: String,
    val rootPath: String,
    val stats: WhatsAppItemStats
)

@Serializable
data class StorageItemDto(
    val name: String,
    val path: String,
    val isDirectory: Boolean,
    val sizeBytes: Long,
    val formattedSize: String
)

@Serializable
data class CategoryStatItem(
    val categoryId: String,
    val title: String,
    val filesCount: Long,
    val totalSizeBytes: Long,
    val formattedSize: String,
    val description: String
)

@Serializable
data class AppSummaryDto(
    val packageName: String,
    val appName: String,
    val versionName: String,
    val apkSizeBytes: Long,
    val formattedSize: String,
    val isSystemApp: Boolean
)

@Serializable
data class TransferProgressMetric(
    val bytesTransferred: Long = 0L,
    val totalBytes: Long = 0L,
    val percentage: Float = 0f,
    val speedMBps: Double = 0.0,
    val etaSeconds: Long = 0L,
    val currentFile: String = "",
    val isCompleted: Boolean = false
)

@Serializable
data class UploadResponseDto(
    val status: String,
    val count: Int,
    val files: List<UploadedFileInfo>
)

/**
 * Android üzerinde çalışan Ktor CIO gömülü sunucusu.
 * Çift yönlü dosya aktarımı, canlı ZIP akışı, kategori bazlı yedekleme,
 * WebSocket canlı metrikleri ve PIN güvenliği sunar.
 */
class KtorTransferServer(
    val port: Int = 8080,
    val host: String = "0.0.0.0",
    private val appContext: Context? = runCatching { OmniBackupApplication.instance }.getOrNull(),
    val uploadManager: UploadManager = UploadManager()
) {

    private var serverEngine: ApplicationEngine? = null

    // 4 basamaklı güvenlik PIN kodu
    var currentPin: String = com.omnibackup.transfer.core.security.AuthSecurity.generatePin()
        private set

    // WebSocket aktif oturumları
    private val activeWsSessions = Collections.newSetFromMap(ConcurrentHashMap<io.ktor.websocket.DefaultWebSocketSession, Boolean>())

    // UI'ın anlık gözlemlemesi için StateFlow
    private val _transferMetric = MutableStateFlow(TransferProgressMetric())
    val transferMetric = _transferMetric.asStateFlow()

    private val _isServerRunning = MutableStateFlow(false)
    val isServerRunning = _isServerRunning.asStateFlow()

    private val zipStreamer = OnTheFlyZipStreamer()
    private val serverScope = CoroutineScope(Dispatchers.IO)

    /**
     * RFC 6266 ve RFC 5987 uyumlu güvenli Content-Disposition başlığı üretir.
     * Türkçe ve ASCII dışı karakterlerde Ktor CIO motorunun UnsafeHeaderException
     * (ISO-8859-1) fırlatmasını kesin olarak engeller.
     */
    fun safeContentDisposition(fileName: String): String {
        val cleanAscii = fileName.map { char ->
            when (char) {
                'ç' -> 'c'
                'Ç' -> 'C'
                'ğ' -> 'g'
                'Ğ' -> 'G'
                'ı' -> 'i'
                'İ' -> 'I'
                'ö' -> 'o'
                'Ö' -> 'O'
                'ş' -> 's'
                'Ş' -> 'S'
                'ü' -> 'u'
                'Ü' -> 'U'
                in 'a'..'z', in 'A'..'Z', in '0'..'9', '.', '_', '-' -> char
                else -> '_'
            }
        }.joinToString("")

        val urlEncoded = java.net.URLEncoder.encode(fileName, "UTF-8").replace("+", "%20")
        return "attachment; filename=\"$cleanAscii\"; filename*=UTF-8''$urlEncoded"
    }

    fun generateNewPin(): String {
        currentPin = com.omnibackup.transfer.core.security.AuthSecurity.generatePin()
        return currentPin
    }

    fun isPinValid(call: ApplicationCall): Boolean {
        val queryPin = call.request.queryParameters["pin"]
        val headerPin = call.request.headers["X-Auth-PIN"]
        val token = com.omnibackup.transfer.core.security.AuthSecurity.extractPin(queryPin, headerPin)
        return com.omnibackup.transfer.core.security.AuthSecurity.validatePin(currentPin, token)
    }

    fun start() {
        if (_isServerRunning.value) return

        serverEngine = embeddedServer(CIO, port = port, host = host) {
            configureServer()
        }.start(wait = false)

        _isServerRunning.value = true
    }

    fun stop() {
        try {
            serverEngine?.stop(1000, 2000)
            serverEngine = null
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            _isServerRunning.value = false
            activeWsSessions.clear()
        }
    }

    internal fun Application.configureServer() {
        install(WebSockets)
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        install(CORS) {
            anyHost()
            allowHeader(HttpHeaders.ContentType)
            allowHeader(HttpHeaders.Authorization)
            allowHeader("X-Auth-PIN")
        }

        routing {
            // 1. Ana Sayfa: Modern Web Kontrol Paneli
            get("/") {
                val ip = NetworkUtils.getLocalIpAddress() ?: "127.0.0.1"
                val html = WebAssets.getIndexHtml(ip, port)
                call.respondText(html, ContentType.Text.Html)
            }

            // 2. PIN Kimlik Doğrulama Endpoint'i
            post("/api/v1/auth") {
                val pinParam = call.request.queryParameters["pin"]
                if (pinParam != null && pinParam.trim() == currentPin) {
                    call.respond(HttpStatusCode.OK, mapOf("status" to "authenticated"))
                } else {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Geçersiz PIN"))
                }
            }

            // 3. Cihaz ve WhatsApp Durum Bilgisi
            get("/api/v1/info") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@get
                }

                val statFs = StatFs(Environment.getExternalStorageDirectory().path)
                val freeBytes = statFs.availableBlocksLong * statFs.blockSizeLong
                val totalBytes = statFs.blockCountLong * statFs.blockSizeLong

                val detected = WhatsAppScanner.scanAll()
                val accountsDto = detected.map { loc ->
                    WhatsAppAccountDto(
                        id = loc.id,
                        displayName = loc.displayName,
                        rootPath = loc.rootDir.absolutePath,
                        stats = loc.stats
                    )
                }

                val response = DeviceInfoResponse(
                    deviceModel = "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL}",
                    androidVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                    freeStorageBytes = freeBytes,
                    totalStorageBytes = totalBytes,
                    freeStorageFormatted = WhatsAppScanner.formatBytes(freeBytes),
                    totalStorageFormatted = WhatsAppScanner.formatBytes(totalBytes),
                    whatsappAccounts = accountsDto
                )
                call.respond(response)
            }

            // 4. Kategori İstatistikleri (Fotoğraf, Video, Müzik, Belge, Uygulamalar, WhatsApp)
            get("/api/v1/categories/stats") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@get
                }

                val mediaScanMap = MediaCategoryScanner.scanAllCategories(includeAllStorage = false)
                val photoResult = mediaScanMap[MediaCategory.PHOTOS]
                val videoResult = mediaScanMap[MediaCategory.VIDEOS]
                val audioResult = mediaScanMap[MediaCategory.AUDIO]
                val docResult = mediaScanMap[MediaCategory.DOCUMENTS]

                val installedApps = appContext?.let { ctx ->
                    try {
                        AppBackupScanner.scanInstalledApps(ctx, includeSystemApps = false)
                    } catch (e: Exception) {
                        emptyList()
                    }
                } ?: emptyList()
                val appsCount = installedApps.size.toLong()
                val appsTotalBytes = installedApps.sumOf { it.apkSizeBytes }

                val whatsAppList = WhatsAppScanner.scanAll()
                val waCount = whatsAppList.sumOf { it.stats.totalFilesCount }
                val waBytes = whatsAppList.sumOf { it.stats.totalSizeBytes }

                val statsList = listOf(
                    CategoryStatItem(
                        categoryId = "photos",
                        title = "Fotoğraflar",
                        filesCount = photoResult?.totalFilesCount ?: 0L,
                        totalSizeBytes = photoResult?.totalSizeBytes ?: 0L,
                        formattedSize = photoResult?.formattedTotalSize ?: "0 B",
                        description = "Galeri ve Kamera Fotoğrafları"
                    ),
                    CategoryStatItem(
                        categoryId = "videos",
                        title = "Videolar",
                        filesCount = videoResult?.totalFilesCount ?: 0L,
                        totalSizeBytes = videoResult?.totalSizeBytes ?: 0L,
                        formattedSize = videoResult?.formattedTotalSize ?: "0 B",
                        description = "Kamera ve İndirilen Videolar"
                    ),
                    CategoryStatItem(
                        categoryId = "audio",
                        title = "Ses ve Müzik",
                        filesCount = audioResult?.totalFilesCount ?: 0L,
                        totalSizeBytes = audioResult?.totalSizeBytes ?: 0L,
                        formattedSize = audioResult?.formattedTotalSize ?: "0 B",
                        description = "Müzikler ve Ses Kayıtları"
                    ),
                    CategoryStatItem(
                        categoryId = "documents",
                        title = "Belgeler ve İndirilenler",
                        filesCount = docResult?.totalFilesCount ?: 0L,
                        totalSizeBytes = docResult?.totalSizeBytes ?: 0L,
                        formattedSize = docResult?.formattedTotalSize ?: "0 B",
                        description = "PDF, Ofis Belgeleri ve Arşivler"
                    ),
                    CategoryStatItem(
                        categoryId = "apps",
                        title = "Yüklü Uygulamalar (APK)",
                        filesCount = appsCount,
                        totalSizeBytes = appsTotalBytes,
                        formattedSize = AppBackupScanner.formatBytes(appsTotalBytes),
                        description = "Kullanıcı Uygulama Paketleri"
                    ),
                    CategoryStatItem(
                        categoryId = "whatsapp",
                        title = "WhatsApp Yedekleri",
                        filesCount = waCount,
                        totalSizeBytes = waBytes,
                        formattedSize = WhatsAppScanner.formatBytes(waBytes),
                        description = "Sohbet Veritabanları ve Medyalar"
                    )
                )

                call.respond(statsList)
            }

            // 5. Yüklü Uygulamaların Listesi
            get("/api/v1/apps") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@get
                }

                val apps = appContext?.let { ctx ->
                    try {
                        AppBackupScanner.scanInstalledApps(ctx, includeSystemApps = false)
                    } catch (e: Exception) {
                        emptyList()
                    }
                } ?: emptyList()

                val appDtos = apps.map { app ->
                    AppSummaryDto(
                        packageName = app.packageName,
                        appName = app.appName,
                        versionName = app.versionName,
                        apkSizeBytes = app.apkSizeBytes,
                        formattedSize = app.formattedApkSize,
                        isSystemApp = app.isSystemApp
                    )
                }

                call.respond(appDtos)
            }

            // 6. Kategori Bazlı Canlı ZIP İndirme (Hem /backup/category hem /download/category desteklenir)
            get("/api/v1/backup/category") {
                handleCategoryDownload(call)
            }
            get("/api/v1/download/category") {
                handleCategoryDownload(call)
            }

            // 7. Canlı On-the-Fly WhatsApp ZIP Akışı (Geriye Dönük Uyumluluk)
            get("/api/v1/backup/whatsapp") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@get
                }

                val typeParam = call.request.queryParameters["type"] ?: "whatsapp"
                val detectedList = WhatsAppScanner.scanAll()
                val targetLocation = detectedList.find { it.id.equals(typeParam, ignoreCase = true) }
                    ?: detectedList.firstOrNull()

                if (targetLocation == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "WhatsApp dizini bulunamadı"))
                    return@get
                }

                val timeStamp = SimpleDateFormat("yyyyMMdd_HHmm", Locale.getDefault()).format(Date())
                val zipFileName = "${targetLocation.displayName.replace(" ", "_")}_Backup_$timeStamp.zip"

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    safeContentDisposition(zipFileName)
                )
                // DÜZELTME: Ktor CIO'da Transfer-Encoding: chunked manuel eklenmesi motoru kilitler! Kesinlikle kaldırıldı.

                val totalEstimatedBytes = targetLocation.stats.totalSizeBytes
                val tracker = TransferMetricsTracker(totalEstimatedBytes)

                call.respondOutputStream(ContentType.Application.Zip, HttpStatusCode.OK) {
                    zipStreamer.streamFolderToZip(
                        rootDir = targetLocation.rootDir,
                        outputStream = this,
                        totalEstimatedBytes = totalEstimatedBytes
                    ) { progress ->
                        val metric = tracker.updateProgress(progress.bytesTransferred, progress.currentFileName)
                        if (metric != null) {
                            _transferMetric.value = metric
                            broadcastMetric(metric)
                        }
                    }

                    // Tamamlandı metriği
                    val finalMetric = tracker.finish()
                    _transferMetric.value = finalMetric
                    broadcastMetric(finalMetric)
                }
            }

            // 8. Çift Yönlü Aktarım: PC'den veya Diğer Cihazlardan Telefona Dosya Yükleme (Upload)
            post("/api/v1/upload") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@post
                }

                val multipart = call.receiveMultipart()
                val uploadedResults = mutableListOf<UploadedFileInfo>()

                multipart.forEachPart { part ->
                    when (part) {
                        is PartData.FileItem -> {
                            val originalFileName = part.originalFileName ?: "uploaded_file_${System.currentTimeMillis()}"

                            part.streamProvider().use { inputStream ->
                                val info = uploadManager.saveStream(
                                    originalFileName = originalFileName,
                                    inputStream = inputStream,
                                    onProgress = { bytesWritten, totalBytes ->
                                        val metric = TransferProgressMetric(
                                            bytesTransferred = bytesWritten,
                                            totalBytes = totalBytes,
                                            percentage = if (totalBytes > 0) ((bytesWritten.toFloat() / totalBytes) * 100f).coerceIn(0f, 100f) else 0f,
                                            currentFile = originalFileName,
                                            isCompleted = false
                                        )
                                        _transferMetric.value = metric
                                        broadcastMetric(metric)
                                    }
                                )
                                uploadedResults.add(info)

                                val finishMetric = TransferProgressMetric(
                                    bytesTransferred = info.sizeBytes,
                                    totalBytes = info.sizeBytes,
                                    percentage = 100f,
                                    currentFile = "${info.fileName} yüklendi",
                                    isCompleted = true
                                )
                                _transferMetric.value = finishMetric
                                broadcastMetric(finishMetric)
                            }
                        }
                        else -> {}
                    }
                    part.dispose()
                }

                call.respond(
                    HttpStatusCode.OK,
                    UploadResponseDto(
                        status = "success",
                        count = uploadedResults.size,
                        files = uploadedResults
                    )
                )
            }

            // 9. Son Yüklenen Dosyaların Listesi
            get("/api/v1/uploads") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@get
                }

                call.respond(uploadManager.uploadedFiles.value)
            }

            // 10. Depolama Dosya Gezgini
            get("/api/v1/files") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@get
                }

                val requestedPath = call.request.queryParameters["path"]
                val targetDir = if (!requestedPath.isNullOrEmpty()) {
                    File(requestedPath)
                } else {
                    Environment.getExternalStorageDirectory()
                }

                if (!targetDir.exists() || !targetDir.isDirectory || !targetDir.canRead()) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Dizin okunamıyor"))
                    return@get
                }

                val items = targetDir.listFiles()?.map { file ->
                    StorageItemDto(
                        name = file.name,
                        path = file.absolutePath,
                        isDirectory = file.isDirectory,
                        sizeBytes = if (file.isFile) file.length() else 0L,
                        formattedSize = if (file.isFile) WhatsAppScanner.formatBytes(file.length()) else "Klasör"
                    )
                }?.sortedWith(compareBy({ !it.isDirectory }, { it.name.lowercase() })) ?: emptyList()

                call.respond(items)
            }

            // 11. Tekil Dosya İndirme
            get("/api/v1/download") {
                if (!isPinValid(call)) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
                    return@get
                }

                val filePath = call.request.queryParameters["path"]
                if (filePath.isNullOrEmpty()) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Dosya yolu eksik"))
                    return@get
                }

                val targetFile = File(filePath)
                if (!targetFile.exists() || !targetFile.isFile || !targetFile.canRead()) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Dosya bulunamadı"))
                    return@get
                }

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    safeContentDisposition(targetFile.name)
                )
                // DİKKAT: ContentLength başlığı kaldırıldı. Ktor CIO respondOutputStream akışının çakışmasız, pürüzsüz çalışması sağlandı.

                call.respondOutputStream(ContentType.Application.OctetStream, HttpStatusCode.OK) {
                    val tracker = TransferMetricsTracker(targetFile.length())
                    zipStreamer.streamSingleFile(targetFile, this) { p ->
                        val m = tracker.updateProgress(p.bytesTransferred, p.currentFileName)
                        if (m != null) {
                            _transferMetric.value = m
                            broadcastMetric(m)
                        }
                    }
                    val finalMetric = tracker.finish()
                    _transferMetric.value = finalMetric
                    broadcastMetric(finalMetric)
                }
            }

            // 12. WebSocket Canlı Metrik Akışı
            webSocket("/api/v1/events") {
                val pinParam = call.request.queryParameters["pin"]
                if (pinParam == null || pinParam.trim() != currentPin) {
                    close(io.ktor.websocket.CloseReason(io.ktor.websocket.CloseReason.Codes.VIOLATED_POLICY, "Geçersiz PIN"))
                    return@webSocket
                }

                activeWsSessions.add(this)
                try {
                    // İlk mevcut metriği hemen gönder
                    val current = _transferMetric.value
                    send(Frame.Text(Json.encodeToString(current)))

                    for (frame in incoming) {
                        if (frame is Frame.Text) {
                            val text = frame.readText()
                            if (text == "ping") send(Frame.Text("pong"))
                        }
                    }
                } catch (e: Exception) {
                    // Oturum sonlandı
                } finally {
                    activeWsSessions.remove(this)
                }
            }
        }
    }

    private suspend fun handleCategoryDownload(call: ApplicationCall) {
        if (!isPinValid(call)) {
            call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Yetkisiz Erişim"))
            return
        }

        val categoryType = (call.request.queryParameters["type"] ?: call.request.queryParameters["category"])?.lowercase(Locale.ROOT) ?: "photos"
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmm", Locale.getDefault()).format(Date())
        val zipFileName = "OmniBackup_${categoryType.replaceFirstChar { it.uppercase() }}_$timeStamp.zip"

        when (categoryType) {
            "whatsapp" -> {
                val detectedList = WhatsAppScanner.scanAll()
                val targetLocation = detectedList.firstOrNull()

                if (targetLocation == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "WhatsApp dizini bulunamadı"))
                    return
                }

                val totalEstimatedBytes = targetLocation.stats.totalSizeBytes
                val tracker = TransferMetricsTracker(totalEstimatedBytes)

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    safeContentDisposition(zipFileName)
                )

                call.respondOutputStream(ContentType.Application.Zip, HttpStatusCode.OK) {
                    zipStreamer.streamFolderToZip(
                        rootDir = targetLocation.rootDir,
                        outputStream = this,
                        totalEstimatedBytes = totalEstimatedBytes
                    ) { progress ->
                        val metric = tracker.updateProgress(progress.bytesTransferred, progress.currentFileName)
                        if (metric != null) {
                            _transferMetric.value = metric
                            broadcastMetric(metric)
                        }
                    }

                    val finalMetric = tracker.finish()
                    _transferMetric.value = finalMetric
                    broadcastMetric(finalMetric)
                }
            }

            "apps" -> {
                val apps = appContext?.let { ctx ->
                    try {
                        AppBackupScanner.scanInstalledApps(ctx, includeSystemApps = false)
                    } catch (e: Exception) {
                        emptyList()
                    }
                } ?: emptyList()
                val fileItems = AppBackupScanner.prepareAppsBackupFiles(apps, includeData = false)

                if (fileItems.isEmpty()) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Yedeklenecek uygulama bulunamadı"))
                    return
                }

                val totalEstimatedBytes = fileItems.sumOf { it.file.length() }
                val tracker = TransferMetricsTracker(totalEstimatedBytes)

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    safeContentDisposition(zipFileName)
                )

                call.respondOutputStream(ContentType.Application.Zip, HttpStatusCode.OK) {
                    zipStreamer.streamFileListToZip(
                        items = fileItems,
                        outputStream = this,
                        totalEstimatedBytes = totalEstimatedBytes
                    ) { progress ->
                        val metric = tracker.updateProgress(progress.bytesTransferred, progress.currentFileName)
                        if (metric != null) {
                            _transferMetric.value = metric
                            broadcastMetric(metric)
                        }
                    }

                    val finalMetric = tracker.finish()
                    _transferMetric.value = finalMetric
                    broadcastMetric(finalMetric)
                }
            }

            "photos", "videos", "audio", "documents" -> {
                val mediaCat = when (categoryType) {
                    "photos" -> MediaCategory.PHOTOS
                    "videos" -> MediaCategory.VIDEOS
                    "audio" -> MediaCategory.AUDIO
                    else -> MediaCategory.DOCUMENTS
                }

                val scanResult = MediaCategoryScanner.scanCategory(mediaCat)
                val fileItems = scanResult.toFileItems()

                if (fileItems.isEmpty()) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Bu kategoride dosya bulunamadı: $categoryType"))
                    return
                }

                val totalEstimatedBytes = scanResult.totalSizeBytes
                val tracker = TransferMetricsTracker(totalEstimatedBytes)

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    safeContentDisposition(zipFileName)
                )

                call.respondOutputStream(ContentType.Application.Zip, HttpStatusCode.OK) {
                    zipStreamer.streamFileListToZip(
                        items = fileItems,
                        outputStream = this,
                        totalEstimatedBytes = totalEstimatedBytes
                    ) { progress ->
                        val metric = tracker.updateProgress(progress.bytesTransferred, progress.currentFileName)
                        if (metric != null) {
                            _transferMetric.value = metric
                            broadcastMetric(metric)
                        }
                    }

                    val finalMetric = tracker.finish()
                    _transferMetric.value = finalMetric
                    broadcastMetric(finalMetric)
                }
            }

            else -> {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Geçersiz kategori: $categoryType"))
            }
        }
    }

    private fun broadcastMetric(metric: TransferProgressMetric) {
        val jsonString = Json.encodeToString(metric)
        serverScope.launch {
            val iterator = activeWsSessions.iterator()
            while (iterator.hasNext()) {
                val session = iterator.next()
                try {
                    session.send(Frame.Text(jsonString))
                } catch (e: ClosedSendChannelException) {
                    iterator.remove()
                } catch (e: Exception) {
                    iterator.remove()
                }
            }
        }
    }
}

/**
 * Transfer hızını (MB/s) ve tahmini kalan süreyi (ETA) hesaplayan yüksek hassasiyetli takipçi.
 */
class TransferMetricsTracker(private val totalBytes: Long) {

    private val startTime = System.currentTimeMillis()
    private var lastUpdateTime = startTime
    private var lastBytes = 0L

    fun updateProgress(currentBytes: Long, fileName: String): TransferProgressMetric? {
        val now = System.currentTimeMillis()
        val timeDeltaMs = now - lastUpdateTime

        // Çok sık güncelleme ile CPU'yu yormamak için en az 250ms ara ile metrik güncelle
        if (timeDeltaMs >= 250 || currentBytes == totalBytes) {
            val bytesDelta = currentBytes - lastBytes
            val speedMBps = if (timeDeltaMs > 0) {
                (bytesDelta.toDouble() / (1024.0 * 1024.0)) / (timeDeltaMs.toDouble() / 1000.0)
            } else 0.0

            val remainingBytes = (totalBytes - currentBytes).coerceAtLeast(0)
            val etaSec = if (speedMBps > 0.1) {
                (remainingBytes.toDouble() / (speedMBps * 1024.0 * 1024.0)).toLong()
            } else 0L

            val percentage = if (totalBytes > 0) {
                ((currentBytes.toDouble() / totalBytes.toDouble()) * 100.0).toFloat().coerceIn(0f, 100f)
            } else 0f

            lastUpdateTime = now
            lastBytes = currentBytes

            return TransferProgressMetric(
                bytesTransferred = currentBytes,
                totalBytes = totalBytes,
                percentage = percentage,
                speedMBps = speedMBps,
                etaSeconds = etaSec,
                currentFile = fileName,
                isCompleted = currentBytes >= totalBytes && totalBytes > 0
            )
        }
        return null
    }

    fun finish(): TransferProgressMetric {
        return TransferProgressMetric(
            bytesTransferred = totalBytes,
            totalBytes = totalBytes,
            percentage = 100f,
            speedMBps = 0.0,
            etaSeconds = 0L,
            currentFile = "Tamamlandı",
            isCompleted = true
        )
    }
}
