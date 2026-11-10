package com.omnibackup.transfer.core.permission

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * Android 11+ (API 30+) Scoped Storage kısıtlamalarını aşan MANAGE_EXTERNAL_STORAGE
 * izin kontrolü ve kullanıcıyı doğrudan ilgili ayar ekranına yönlendiren yönetici sınıf.
 */
object StoragePermissionManager {

    /**
     * Tüm dosyalara erişim izninin verilip verilmediğini doğrular.
     */
    fun hasFullStoragePermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+)
            Environment.isExternalStorageManager()
        } else {
            // Android 10 ve öncesi: Standart depolama izinleri yeterlidir
            val readCheck = ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
            val writeCheck = ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.WRITE_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
            readCheck && writeCheck
        }
    }

    /**
     * Kullanıcıyı doğrudan uygulamanın "Tüm Dosyalara Erişim" izin ekranına yönlendirir.
     * URI ile doğrudan paket adresi denenir; cihaz üreticisi (OEM) desteklemezse genel ekrana yönlendirilir.
     */
    fun requestFullStoragePermission(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                // Doğrudan bu uygulamanın özel Tüm Dosyalara Erişim anahtarı ekranı
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                // Bazı OEM arayüzlerinde (MIUI, ColorOS, EMUI) paket URI hatası verirse genel liste açılır
                try {
                    val fallbackIntent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(fallbackIntent)
                } catch (ex: Exception) {
                    // En son çare standart uygulama ayarları sayfası
                    openAppSettings(context)
                }
            }
        } else {
            openAppSettings(context)
        }
    }

    private fun openAppSettings(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
