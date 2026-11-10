package com.omnibackup.transfer.core.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.omnibackup.transfer.MainActivity
import com.omnibackup.transfer.OmniBackupApplication
import com.omnibackup.transfer.R
import com.omnibackup.transfer.core.network.NetworkUtils
import com.omnibackup.transfer.core.server.KtorTransferServer
import com.omnibackup.transfer.core.server.TransferProgressMetric
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Aktarım esnasında sistemin sunucu sürecini sonlandırmasını engelleyen,
 * CPU WakeLock ve Wi-Fi High Performance kilidi tutan, canlı durum bildiren Foreground Service.
 */
class TransferForegroundService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var metricCollectorJob: Job? = null
    private val serviceScope = CoroutineScope(Dispatchers.Main)

    companion object {
        const val ACTION_START = "com.omnibackup.transfer.action.START"
        const val ACTION_STOP = "com.omnibackup.transfer.action.STOP"
        const val EXTRA_PORT = "com.omnibackup.transfer.extra.PORT"
        const val NOTIFICATION_ID = 1001

        private val _isServiceRunning = MutableStateFlow(false)
        val isServiceRunning = _isServiceRunning.asStateFlow()

        private val _serverIp = MutableStateFlow("")
        val serverIp = _serverIp.asStateFlow()

        private val _serverPort = MutableStateFlow(8080)
        val serverPort = _serverPort.asStateFlow()

        private val _serverPin = MutableStateFlow("")
        val serverPin = _serverPin.asStateFlow()

        private val _currentMetric = MutableStateFlow(TransferProgressMetric())
        val currentMetric = _currentMetric.asStateFlow()

        var serverInstance: KtorTransferServer? = null
            private set

        fun start(context: Context, port: Int = 8080) {
            val intent = Intent(context, TransferForegroundService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_PORT, port)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, TransferForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }

        fun regeneratePin(): String {
            val newPin = serverInstance?.generateNewPin() ?: com.omnibackup.transfer.core.security.AuthSecurity.generatePin()
            _serverPin.value = newPin
            return newPin
        }
    }

    override fun onCreate() {
        super.onCreate()
        acquireSystemLocks()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopForegroundServer()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START, null -> {
                val port = intent?.getIntExtra(EXTRA_PORT, 8080) ?: 8080
                startForegroundServer(port)
            }
        }
        return START_STICKY
    }

    private fun startForegroundServer(port: Int) {
        val ip = NetworkUtils.getLocalIpAddress() ?: "127.0.0.1"
        _serverIp.value = ip
        _serverPort.value = port

        if (serverInstance == null) {
            serverInstance = KtorTransferServer(port = port).apply {
                start()
            }
        }

        val pin = serverInstance?.currentPin ?: "----"
        _serverPin.value = pin
        _isServiceRunning.value = true

        val initialNotification = buildNotification("Sunucu Aktif: http://$ip:$port • PIN: $pin")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                initialNotification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, initialNotification)
        }

        // Metrikleri dinle ve bildirimi güncelle
        metricCollectorJob?.cancel()
        metricCollectorJob = serviceScope.launch {
            serverInstance?.transferMetric?.collect { metric ->
                _currentMetric.value = metric
                if (metric.bytesTransferred > 0) {
                    val statusText = if (metric.isCompleted) {
                        "✅ Aktarım Tamamlandı!"
                    } else {
                        String.format(
                            "%%%d Aktarılıyor • %.1f MB/s • %s",
                            metric.percentage.toInt(),
                            metric.speedMBps,
                            metric.currentFile
                        )
                    }
                    updateNotification(statusText)
                }
            }
        }
    }

    private fun stopForegroundServer() {
        metricCollectorJob?.cancel()
        metricCollectorJob = null

        serverInstance?.stop()
        serverInstance = null

        _isServiceRunning.value = false
        _currentMetric.value = TransferProgressMetric()

        releaseSystemLocks()
    }

    private fun acquireSystemLocks() {
        // CPU Doze modunu engelle
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "OmniBackup::TransferWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(6 * 60 * 60 * 1000L) // Maks 6 saat
        }

        // Wi-Fi radyo çipini en yüksek performansta tut
        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        wifiLock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            wifiManager.createWifiLock(
                WifiManager.WIFI_MODE_FULL_LOW_LATENCY,
                "OmniBackup::TransferWifiLock"
            )
        } else {
            @Suppress("DEPRECATION")
            wifiManager.createWifiLock(
                WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                "OmniBackup::TransferWifiLock"
            )
        }.apply {
            setReferenceCounted(false)
            acquire()
        }
    }

    private fun releaseSystemLocks() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wifiLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        wifiLock = null
    }

    private fun buildNotification(statusText: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, TransferForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, OmniBackupApplication.NOTIFICATION_CHANNEL_ID)
            .setContentTitle("⚡ OmniBackup Transfer")
            .setContentText(statusText)
            .setSmallIcon(R.drawable.ic_stat_transfer)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Durdur", stopPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(statusText: String) {
        val notification = buildNotification(statusText)
        val manager = getSystemService(NotificationManager::class.java)
        manager?.notify(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForegroundServer()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
