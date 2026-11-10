package com.omnibackup.transfer.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.omnibackup.transfer.core.scanner.WhatsAppScanner
import com.omnibackup.transfer.ui.components.QrCodeDialog
import com.omnibackup.transfer.ui.theme.AccentGreen
import com.omnibackup.transfer.ui.theme.BackgroundDark
import com.omnibackup.transfer.ui.theme.BorderDark
import com.omnibackup.transfer.ui.theme.BorderGlow
import com.omnibackup.transfer.ui.theme.CategoryApps
import com.omnibackup.transfer.ui.theme.CategoryAudio
import com.omnibackup.transfer.ui.theme.CategoryDocs
import com.omnibackup.transfer.ui.theme.CategoryPhotos
import com.omnibackup.transfer.ui.theme.CategoryVideos
import com.omnibackup.transfer.ui.theme.CategoryWhatsApp
import com.omnibackup.transfer.ui.theme.ErrorRed
import com.omnibackup.transfer.ui.theme.NeonGreen
import com.omnibackup.transfer.ui.theme.PrimaryGreen
import com.omnibackup.transfer.ui.theme.PrimaryGreenDark
import com.omnibackup.transfer.ui.theme.SuccessGreen
import com.omnibackup.transfer.ui.theme.SurfaceCard
import com.omnibackup.transfer.ui.theme.SurfaceCardHover
import com.omnibackup.transfer.ui.theme.SurfaceCardLight
import com.omnibackup.transfer.ui.theme.TextMuted
import com.omnibackup.transfer.ui.theme.TextPrimary
import com.omnibackup.transfer.ui.theme.TextSecondary
import com.omnibackup.transfer.ui.theme.WarningOrange
import java.util.Locale

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    Scaffold(
        containerColor = BackgroundDark
    ) { innerPadding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Üst Başlık & Ağ Durumu Rozeti
            HeaderSection(
                networkDesc = uiState.networkDescription,
                ipAddress = uiState.localIp,
                onRefreshNetwork = { viewModel.refreshNetwork() }
            )

            // 2. İzin Uyarısı (Gerekiyorsa)
            if (!uiState.hasStoragePermission) {
                PermissionCard(
                    onRequestPermission = { viewModel.requestPermission() }
                )
            }

            // 3. Sunucu ve PIN Kontrol Kartı (Hero Kartı)
            ServerControlCard(
                uiState = uiState,
                onStartServer = { viewModel.startServer() },
                onStopServer = { viewModel.stopServer() },
                onShowQr = { viewModel.showQrDialog() },
                onRegeneratePin = { viewModel.regeneratePin() }
            )

            // 4. Kategori Izgarası (Grid Kartları)
            CategoriesOverviewSection(
                uiState = uiState,
                onRefreshCategories = {
                    viewModel.scanAllCategories()
                    viewModel.scanWhatsApp()
                }
            )

            // 5. Çift Yönlü Aktarım Paneli (Aktif Transfer / Gelen Dosyalar)
            TwoWayTransferSection(
                uiState = uiState,
                onSelectTab = { viewModel.setActiveTransferTab(it) },
                onRefreshReceived = { viewModel.refreshReceivedFiles() }
            )

            Spacer(modifier = Modifier.height(24.dp))
        }

        // QR Kod Modal Penceresi
        if (uiState.isQrDialogVisible) {
            QrCodeDialog(
                url = viewModel.serverUrl,
                pin = uiState.serverPin,
                onDismiss = { viewModel.hideQrDialog() }
            )
        }
    }
}

/**
 * 1. Başlık & Ağ Bilgisi
 */
@Composable
private fun HeaderSection(
    networkDesc: String,
    ipAddress: String,
    onRefreshNetwork: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "OmniBackup",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary
                    )
                )
                Text(
                    text = " Transfer",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.ExtraBold,
                        color = AccentGreen
                    )
                )
            }
            Text(
                text = "Ultra Hızlı Kablosuz Yedekleme & Aktarım",
                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
            )
        }

        // Ağ Durum Hapı
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceCardLight),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
            modifier = Modifier.clickable { onRefreshNetwork() }
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Wifi,
                    contentDescription = null,
                    tint = AccentGreen,
                    modifier = Modifier.size(16.dp)
                )
                Column {
                    Text(
                        text = networkDesc.ifEmpty { "Ağ Aranıyor..." },
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = ipAddress.ifEmpty { "0.0.0.0" },
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = TextMuted,
                            fontSize = 10.sp
                        )
                    )
                }
            }
        }
    }
}

/**
 * 2. İzin Kartı
 */
@Composable
private fun PermissionCard(
    onRequestPermission: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1818)),
        border = androidx.compose.foundation.BorderStroke(1.dp, ErrorRed.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(ErrorRed.copy(alpha = 0.2f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ErrorRed,
                    modifier = Modifier.size(24.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Tüm Dosyalara Erişim İzni Gerekli",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                )
                Text(
                    text = "WhatsApp, Fotoğraf, APK ve Medya verilerini aktarmak için depolama izni verin.",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                )
            }

            Button(
                onClick = onRequestPermission,
                colors = ButtonDefaults.buttonColors(containerColor = ErrorRed),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(text = "İzin Ver", fontWeight = FontWeight.Bold)
            }
        }
    }
}

/**
 * 3. Sunucu & PIN Kartı
 */
@Composable
private fun ServerControlCard(
    uiState: DashboardUiState,
    onStartServer: () -> Unit,
    onStopServer: () -> Unit,
    onShowQr: () -> Unit,
    onRegeneratePin: () -> Unit
) {
    val isRunning = uiState.isServerRunning
    val infiniteTransition = rememberInfiniteTransition(label = "serverPulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isRunning) AccentGreen.copy(alpha = pulseAlpha) else BorderDark
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Başlık & Durum Rozeti
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(
                                color = if (isRunning) AccentGreen else Color.Gray,
                                shape = CircleShape
                            )
                    )
                    Text(
                        text = if (isRunning) "SUNUCU ÇALIŞIYOR" else "SUNUCU KAPALI",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (isRunning) AccentGreen else TextMuted,
                            letterSpacing = 1.sp
                        )
                    )
                }

                if (isRunning) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(
                            onClick = onShowQr,
                            modifier = Modifier
                                .size(36.dp)
                                .background(SurfaceCardLight, RoundedCornerShape(8.dp))
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCode,
                                contentDescription = "QR Kod",
                                tint = AccentGreen,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }

            if (isRunning) {
                // Bağlantı Bilgisi & PIN
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Web URL Kutusu
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceCardLight),
                        modifier = Modifier.weight(1.3f)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "Tarayıcıdan Açın:",
                                style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "http://${uiState.localIp}:${uiState.serverPort}",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    fontFamily = FontFamily.Monospace
                                ),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // PIN Kodu Kutusu
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceCardLight),
                        modifier = Modifier.weight(0.9f)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "PIN Kodu",
                                    style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                                )
                                Text(
                                    text = uiState.serverPin.ifEmpty { "----" },
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontWeight = FontWeight.ExtraBold,
                                        color = AccentGreen,
                                        letterSpacing = 3.sp
                                    )
                                )
                            }
                            IconButton(
                                onClick = onRegeneratePin,
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "PIN Yenile",
                                    tint = TextSecondary,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            } else {
                Text(
                    text = "PC, Mac veya diğer cihazınızla aynı Wi-Fi ya da Hotspot ağına bağlanın ve aktarımı başlatın.",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                )
            }

            // Başlat / Durdur Butonu
            Button(
                onClick = { if (isRunning) onStopServer() else onStartServer() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isRunning) ErrorRed else PrimaryGreen
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = if (isRunning) Icons.Default.Stop else Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = Color.White
                    )
                    Text(
                        text = if (isRunning) "Sunucuyu Durdur" else "Kablosuz Sunucuyu Başlat",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                }
            }
        }
    }
}

/**
 * 4. Kategori Izgarası (Grid Kartları)
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoriesOverviewSection(
    uiState: DashboardUiState,
    onRefreshCategories: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "Yedeklenebilir Kategoriler",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                )
                if (uiState.isScanningCategories || uiState.isScanning) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 2.dp,
                        color = AccentGreen
                    )
                }
            }

            IconButton(
                onClick = onRefreshCategories,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Kategorileri Yenile",
                    tint = TextSecondary,
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        // WhatsApp Özeti
        val waList = uiState.detectedWhatsAppList
        val waTotalSize = waList.sumOf { it.stats.totalSizeBytes }
        val waTotalFiles = waList.sumOf { it.stats.totalFilesCount }

        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceCard),
            border = androidx.compose.foundation.BorderStroke(1.dp, CategoryWhatsApp.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(CategoryWhatsApp.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "💬", fontSize = 20.sp)
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (waList.isEmpty()) "WhatsApp Yedek Bulunamadı" else "WhatsApp & WA Business",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    )
                    Text(
                        text = if (waList.isEmpty()) "Cihazda aktif WhatsApp veritabanı tespit edilmedi"
                        else "${waList.size} Hesap • $waTotalFiles dosya • Mesajlar, Medya, Veritabanları",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Card(
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = CategoryWhatsApp.copy(alpha = 0.15f))
                ) {
                    Text(
                        text = WhatsAppScanner.formatBytes(waTotalSize),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = CategoryWhatsApp
                        ),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }

        // 2x2 Izgara: Fotoğraflar, Videolar, Müzik, Belgeler ve Uygulamalar
        val categories = uiState.categorySummaries
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // Satır 1
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val photos = categories.find { it.id == "photos" }
                val videos = categories.find { it.id == "videos" }

                CategoryItemCard(
                    title = "Fotoğraflar",
                    count = photos?.count ?: 0L,
                    formattedSize = photos?.formattedSize ?: "0 B",
                    color = CategoryPhotos,
                    icon = Icons.Default.Image,
                    modifier = Modifier.weight(1f)
                )

                CategoryItemCard(
                    title = "Videolar",
                    count = videos?.count ?: 0L,
                    formattedSize = videos?.formattedSize ?: "0 B",
                    color = CategoryVideos,
                    icon = Icons.Default.Videocam,
                    modifier = Modifier.weight(1f)
                )
            }

            // Satır 2
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val audio = categories.find { it.id == "audio" }
                val docs = categories.find { it.id == "documents" }

                CategoryItemCard(
                    title = "Müzik & Ses",
                    count = audio?.count ?: 0L,
                    formattedSize = audio?.formattedSize ?: "0 B",
                    color = CategoryAudio,
                    icon = Icons.Default.MusicNote,
                    modifier = Modifier.weight(1f)
                )

                CategoryItemCard(
                    title = "Belgeler",
                    count = docs?.count ?: 0L,
                    formattedSize = docs?.formattedSize ?: "0 B",
                    color = CategoryDocs,
                    icon = Icons.Default.Description,
                    modifier = Modifier.weight(1f)
                )
            }

            // Satır 3 (Uygulamalar - Tam Genişlik)
            val apps = categories.find { it.id == "apps" }
            CategoryItemCard(
                title = "Yüklü Uygulamalar (APK)",
                count = apps?.count ?: 0L,
                formattedSize = apps?.formattedSize ?: "0 B",
                color = CategoryApps,
                icon = Icons.Default.Android,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun CategoryItemCard(
    title: String,
    count: Long,
    formattedSize: String,
    color: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(color.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "$count dosya",
                    style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary)
                )
            }

            Card(
                shape = RoundedCornerShape(6.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCardLight)
            ) {
                Text(
                    text = formattedSize,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = color
                    ),
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

/**
 * 5. Çift Yönlü Aktarım Paneli (Canlı Hız & Gelen Dosyalar)
 */
@Composable
private fun TwoWayTransferSection(
    uiState: DashboardUiState,
    onSelectTab: (Int) -> Unit,
    onRefreshReceived: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Sekme Başlığı
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier
                        .background(SurfaceCardLight, RoundedCornerShape(10.dp))
                        .padding(3.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    val activeTab = uiState.activeTransferTab

                    // Sekme 0: Aktarım Monitörü
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (activeTab == 0) PrimaryGreenDark else Color.Transparent)
                            .clickable { onSelectTab(0) }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowUpward,
                                contentDescription = null,
                                tint = if (activeTab == 0) AccentGreen else TextSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "Aktarım Monitörü",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeTab == 0) TextPrimary else TextSecondary
                                )
                            )
                        }
                    }

                    // Sekme 1: Gelen Dosyalar
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (activeTab == 1) PrimaryGreenDark else Color.Transparent)
                            .clickable { onSelectTab(1) }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowDownward,
                                contentDescription = null,
                                tint = if (activeTab == 1) AccentGreen else TextSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "Gelen Dosyalar (${uiState.receivedFiles.size})",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeTab == 1) TextPrimary else TextSecondary
                                )
                            )
                        }
                    }
                }

                if (uiState.activeTransferTab == 1) {
                    IconButton(
                        onClick = onRefreshReceived,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Gelenleri Yenile",
                            tint = TextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Sekme İçerikleri
            if (uiState.activeTransferTab == 0) {
                LiveTransferMonitorContent(metric = uiState.transferMetric)
            } else {
                ReceivedFilesContent(files = uiState.receivedFiles)
            }
        }
    }
}

/**
 * Canlı Transfer Hızı ve İlerleme Göstergesi
 */
@Composable
private fun LiveTransferMonitorContent(
    metric: com.omnibackup.transfer.core.server.TransferProgressMetric
) {
    val isTransferring = metric.bytesTransferred > 0 && !metric.isCompleted

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        // Hız ve Durum Göstergesi
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(
                            if (isTransferring) AccentGreen.copy(alpha = 0.15f) else SurfaceCardLight,
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Speed,
                        contentDescription = null,
                        tint = if (isTransferring) AccentGreen else TextMuted,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Column {
                    Text(
                        text = if (isTransferring) "Aktarım Devam Ediyor..."
                        else if (metric.isCompleted) "Aktarım Tamamlandı!"
                        else "Aktarım Bekleniyor",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (metric.isCompleted) SuccessGreen else TextPrimary
                        )
                    )
                    Text(
                        text = if (isTransferring) metric.currentFile.ifEmpty { "Veri akışı sağlanıyor..." }
                        else if (metric.isCompleted) "Son işlem başarıyla sonuçlandı"
                        else "PC veya tarayıcıdan indirme/yükleme bekleniyor",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Canlı Hız Rozeti
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (metric.speedMBps > 0) AccentGreen.copy(alpha = 0.2f) else SurfaceCardLight
                )
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = String.format(Locale.US, "%.1f", metric.speedMBps),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = if (metric.speedMBps > 0) AccentGreen else TextMuted
                        )
                    )
                    Text(
                        text = "MB/s",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = if (metric.speedMBps > 0) AccentGreen else TextMuted
                        )
                    )
                }
            }
        }

        // İlerleme Çubuğu ve %
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            LinearProgressIndicator(
                progress = { (metric.percentage / 100f).coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = AccentGreen,
                trackColor = SurfaceCardLight
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${WhatsAppScanner.formatBytes(metric.bytesTransferred)} / ${WhatsAppScanner.formatBytes(metric.totalBytes)}",
                    style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                )

                Text(
                    text = String.format(Locale.US, "%%%d", metric.percentage.toInt()),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = AccentGreen
                    )
                )
            }
        }
    }
}

/**
 * PC'den Telefona Gelen Dosyalar Listesi
 */
@Composable
private fun ReceivedFilesContent(
    files: List<ReceivedFileInfo>
) {
    if (files.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(SurfaceCardLight, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Folder,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(24.dp)
                )
            }
            Text(
                text = "Henüz Alınan Dosya Yok",
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            )
            Text(
                text = "PC tarayıcınızdan dosya sürükleyip bıraktığınızda buraya ve Download/OmniBackup dizinine kaydedilir.",
                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            files.take(6).forEach { file ->
                Card(
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCardLight),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(PrimaryGreen.copy(alpha = 0.2f), RoundedCornerShape(6.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowDownward,
                                contentDescription = null,
                                tint = AccentGreen,
                                modifier = Modifier.size(16.dp)
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = file.name,
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                ),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "${file.formattedSize} • ${file.lastModifiedFormatted}",
                                style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                            )
                        }

                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = AccentGreen,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}
