package com.omnibackup.transfer

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class OmniBackupApplication : Application() {

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "omni_transfer_channel"
        const val NOTIFICATION_CHANNEL_NAME = "Aktarım Servisi Bildirimleri"
        lateinit var instance: OmniBackupApplication
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "OmniBackup dosya ve WhatsApp aktarım durumu bildirim kanalı"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
