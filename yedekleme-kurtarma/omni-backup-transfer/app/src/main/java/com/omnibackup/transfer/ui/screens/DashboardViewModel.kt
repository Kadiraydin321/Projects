package com.omnibackup.transfer.ui.screens

import android.app.Application
import android.os.Environment
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.omnibackup.transfer.core.network.NetworkUtils
import com.omnibackup.transfer.core.permission.StoragePermissionManager
import com.omnibackup.transfer.core.scanner.AppBackupScanner
import com.omnibackup.transfer.core.scanner.MediaCategory
import com.omnibackup.transfer.core.scanner.MediaCategoryScanner
import com.omnibackup.transfer.core.scanner.WhatsAppLocationInfo
import com.omnibackup.transfer.core.scanner.WhatsAppScanner
import com.omnibackup.transfer.core.server.TransferProgressMetric
import com.omnibackup.transfer.core.service.TransferForegroundService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Gösterge panelindeki kategori kartlarının özet verisi.
 */
data class CategorySummary(
    val id: String,
    val title: String,
    val count: Long,
    val formattedSize: String,
    val sizeBytes: Long,
    val iconKey: String
)

/**
 * PC'den telefona yüklenen gelen dosyaların bilgisi.
 */
data class ReceivedFileInfo(
    val name: String,
    val formattedSize: String,
    val sizeBytes: Long,
    val lastModifiedFormatted: String,
    val absolutePath: String
)

/**
 * Dashboard UI durumu.
 */
data class DashboardUiState(
    val hasStoragePermission: Boolean = false,
    val isScanning: Boolean = false,
    val isScanningCategories: Boolean = false,
    val detectedWhatsAppList: List<WhatsAppLocationInfo> = emptyList(),
    val categorySummaries: List<CategorySummary> = emptyList(),
    val receivedFiles: List<ReceivedFileInfo> = emptyList(),
    val activeTransferTab: Int = 0, // 0: Aktarım Durumu, 1: Gelen Dosyalar
    val localIp: String = "",
    val networkDescription: String = "",
    val isServerRunning: Boolean = false,
    val serverPin: String = "",
    val serverPort: Int = 8080,
    val isQrDialogVisible: Boolean = false,
    val transferMetric: TransferProgressMetric = TransferProgressMetric()
)

class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        observeService()
        refreshAll()
    }

    private fun observeService() {
        viewModelScope.launch {
            TransferForegroundService.isServiceRunning.collect { running ->
                _uiState.value = _uiState.value.copy(isServerRunning = running)
                if (running) {
                    refreshNetwork()
                }
            }
        }

        viewModelScope.launch {
            TransferForegroundService.serverPin.collect { pin ->
                _uiState.value = _uiState.value.copy(serverPin = pin)
            }
        }

        viewModelScope.launch {
            TransferForegroundService.serverPort.collect { port ->
                _uiState.value = _uiState.value.copy(serverPort = port)
            }
        }

        viewModelScope.launch {
            TransferForegroundService.currentMetric.collect { metric ->
                _uiState.value = _uiState.value.copy(transferMetric = metric)
            }
        }
    }

    fun refreshAll() {
        checkPermission()
        refreshNetwork()
        refreshReceivedFiles()
        if (_uiState.value.hasStoragePermission) {
            scanWhatsApp()
            scanAllCategories()
        }
    }

    fun checkPermission(): Boolean {
        val hasPerm = StoragePermissionManager.hasFullStoragePermission(getApplication())
        _uiState.value = _uiState.value.copy(hasStoragePermission = hasPerm)
        if (hasPerm) {
            if (_uiState.value.detectedWhatsAppList.isEmpty() && !_uiState.value.isScanning) {
                scanWhatsApp()
            }
            if (_uiState.value.categorySummaries.isEmpty() && !_uiState.value.isScanningCategories) {
                scanAllCategories()
            }
        }
        return hasPerm
    }

    fun requestPermission() {
        StoragePermissionManager.requestFullStoragePermission(getApplication())
    }

    fun refreshNetwork() {
        val app = getApplication<Application>()
        val ip = NetworkUtils.getLocalIpAddress() ?: "127.0.0.1"
        val desc = NetworkUtils.getNetworkDescription(app)
        _uiState.value = _uiState.value.copy(
            localIp = ip,
            networkDescription = desc
        )
    }

    fun scanWhatsApp() {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.value = _uiState.value.copy(isScanning = true)
            val list = WhatsAppScanner.scanAll()
            _uiState.value = _uiState.value.copy(
                isScanning = false,
                detectedWhatsAppList = list
            )
        }
    }

    fun scanAllCategories() {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.value = _uiState.value.copy(isScanningCategories = true)
            try {
                // 1. Medya ve belge kategorileri
                val mediaResultsDeferred = async { MediaCategoryScanner.scanAllCategories() }
                // 2. Yüklü uygulamalar (APK)
                val appsDeferred = async { AppBackupScanner.scanInstalledApps(getApplication(), includeSystemApps = false) }

                val mediaMap = mediaResultsDeferred.await()
                val appsList = appsDeferred.await()

                val photos = mediaMap[MediaCategory.PHOTOS]
                val videos = mediaMap[MediaCategory.VIDEOS]
                val audio = mediaMap[MediaCategory.AUDIO]
                val docs = mediaMap[MediaCategory.DOCUMENTS]

                val totalAppsBytes = appsList.sumOf { it.totalSizeBytes }

                val summaries = listOf(
                    CategorySummary(
                        id = "photos",
                        title = "Fotoğraflar",
                        count = photos?.totalFilesCount ?: 0L,
                        formattedSize = photos?.formattedTotalSize ?: "0 B",
                        sizeBytes = photos?.totalSizeBytes ?: 0L,
                        iconKey = "photos"
                    ),
                    CategorySummary(
                        id = "videos",
                        title = "Videolar",
                        count = videos?.totalFilesCount ?: 0L,
                        formattedSize = videos?.formattedTotalSize ?: "0 B",
                        sizeBytes = videos?.totalSizeBytes ?: 0L,
                        iconKey = "videos"
                    ),
                    CategorySummary(
                        id = "audio",
                        title = "Müzik & Ses",
                        count = audio?.totalFilesCount ?: 0L,
                        formattedSize = audio?.formattedTotalSize ?: "0 B",
                        sizeBytes = audio?.totalSizeBytes ?: 0L,
                        iconKey = "audio"
                    ),
                    CategorySummary(
                        id = "documents",
                        title = "Belgeler",
                        count = docs?.totalFilesCount ?: 0L,
                        formattedSize = docs?.formattedTotalSize ?: "0 B",
                        sizeBytes = docs?.totalSizeBytes ?: 0L,
                        iconKey = "documents"
                    ),
                    CategorySummary(
                        id = "apps",
                        title = "Uygulamalar (APK)",
                        count = appsList.size.toLong(),
                        formattedSize = WhatsAppScanner.formatBytes(totalAppsBytes),
                        sizeBytes = totalAppsBytes,
                        iconKey = "apps"
                    )
                )

                _uiState.value = _uiState.value.copy(
                    isScanningCategories = false,
                    categorySummaries = summaries
                )
            } catch (e: Exception) {
                e.printStackTrace()
                _uiState.value = _uiState.value.copy(isScanningCategories = false)
            }
        }
    }

    fun refreshReceivedFiles() {
        viewModelScope.launch(Dispatchers.IO) {
            val downloadsDir = try {
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            } catch (e: Exception) {
                File("/sdcard/Download")
            }
            val omniBackupDir = File(downloadsDir, "OmniBackup")
            val filesList = mutableListOf<ReceivedFileInfo>()

            if (omniBackupDir.exists() && omniBackupDir.isDirectory) {
                val dateFormat = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault())
                omniBackupDir.listFiles()?.filter { it.isFile }?.sortedByDescending { it.lastModified() }?.forEach { f ->
                    filesList.add(
                        ReceivedFileInfo(
                            name = f.name,
                            formattedSize = WhatsAppScanner.formatBytes(f.length()),
                            sizeBytes = f.length(),
                            lastModifiedFormatted = dateFormat.format(Date(f.lastModified())),
                            absolutePath = f.absolutePath
                        )
                    )
                }
            }

            _uiState.value = _uiState.value.copy(receivedFiles = filesList)
        }
    }

    fun regeneratePin() {
        val newPin = TransferForegroundService.regeneratePin()
        _uiState.value = _uiState.value.copy(serverPin = newPin)
    }

    fun setActiveTransferTab(tabIndex: Int) {
        _uiState.value = _uiState.value.copy(activeTransferTab = tabIndex)
    }

    fun startServer() {
        val app = getApplication<Application>()
        refreshNetwork()
        TransferForegroundService.start(app, 8080)
    }

    fun stopServer() {
        val app = getApplication<Application>()
        TransferForegroundService.stop(app)
    }

    fun showQrDialog() {
        _uiState.value = _uiState.value.copy(isQrDialogVisible = true)
    }

    fun hideQrDialog() {
        _uiState.value = _uiState.value.copy(isQrDialogVisible = false)
    }

    val serverUrl: String
        get() {
            val ip = _uiState.value.localIp.ifEmpty { "127.0.0.1" }
            val port = _uiState.value.serverPort
            val pin = _uiState.value.serverPin
            return "http://$ip:$port/?pin=$pin"
        }
}
