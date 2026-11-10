package com.omnibackup.transfer.core.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

enum class NetworkType {
    WIFI,
    HOTSPOT,
    USB_TETHERING,
    OTHER,
    NONE
}

object NetworkUtils {

    /**
     * Ağ arayüzlerinin öncelik skorunu belirler.
     * Hotspot (ap) > Wi-Fi (wlan) > Tethering (rndis) > Ethernet (eth)
     */
    fun getInterfacePriority(name: String): Int {
        return when {
            name.startsWith("ap", ignoreCase = true) -> 100
            name.startsWith("wlan", ignoreCase = true) -> 90
            name.startsWith("swlan", ignoreCase = true) -> 80
            name.startsWith("rndis", ignoreCase = true) -> 70
            name.startsWith("eth", ignoreCase = true) -> 60
            else -> 0
        }
    }

    /**
     * Verilen IP adresinin özel yerel IPv4 bloğunda (RFC 1918: 10.x.x.x, 172.16-31.x.x, 192.168.x.x)
     * olup olmadığını doğrular.
     */
    fun isPrivateIpv4(hostAddress: String): Boolean {
        return hostAddress.startsWith("192.168.") ||
                hostAddress.startsWith("10.") ||
                hostAddress.matches(Regex("^172\\.(1[6-9]|2[0-9]|3[0-1])\\..*"))
    }

    /**
     * Verilen ağ arayüzleri listesini önceliklerine göre sıralayıp uygun ilk yerel IPv4 adresini seçer.
     */
    fun filterIpAddresses(interfaces: List<NetworkInterface>): String? {
        val sortedInterfaces = interfaces.sortedByDescending { getInterfacePriority(it.name) }

        for (iface in sortedInterfaces) {
            if (!iface.isUp || iface.isLoopback) continue

            val addresses = Collections.list(iface.inetAddresses)
            for (address in addresses) {
                if (!address.isLoopbackAddress && address is Inet4Address) {
                    val hostAddress = address.hostAddress ?: continue
                    if (isPrivateIpv4(hostAddress)) {
                        return hostAddress
                    }
                }
            }
        }
        return null
    }

    /**
     * Cihazın geçerli yerel IPv4 adresini öncelik sırasına göre tespit eder.
     * Hotspot modunda tipik: 192.168.43.1 veya 192.168.49.1
     * Standart Wi-Fi modunda: 192.168.1.x, 192.168.0.x, 10.x.x.x vb.
     */
    fun getLocalIpAddress(customInterfaces: List<NetworkInterface>? = null): String? {
        return try {
            val interfaces = customInterfaces ?: Collections.list(NetworkInterface.getNetworkInterfaces())
            filterIpAddresses(interfaces)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Aktif bağlantının türünü tespit eder (Wi-Fi, Hotspot, vb.).
     */
    fun detectNetworkType(context: Context): NetworkType {
        val ip = getLocalIpAddress() ?: return NetworkType.NONE

        if (ip.startsWith("192.168.43.") || ip.startsWith("192.168.49.")) {
            return NetworkType.HOTSPOT
        }

        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        if (cm != null) {
            val activeNetwork = cm.activeNetwork
            val capabilities = cm.getNetworkCapabilities(activeNetwork)
            if (capabilities != null) {
                if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    return NetworkType.WIFI
                }
                if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    return NetworkType.OTHER
                }
            }
        }

        return if (ip.isNotEmpty()) NetworkType.WIFI else NetworkType.NONE
    }

    /**
     * Kullanıcıya gösterilecek bağlantı durumu metni.
     */
    fun getNetworkDescription(context: Context): String {
        return when (detectNetworkType(context)) {
            NetworkType.HOTSPOT -> "Kişisel Erişim Noktası (Hotspot) Aktif"
            NetworkType.WIFI -> "Wi-Fi Yerel Ağına Bağlı"
            NetworkType.USB_TETHERING -> "USB Bağlantısı Aktif"
            NetworkType.OTHER -> "Yerel Ağ Bağlantısı Aktif"
            NetworkType.NONE -> "Wi-Fi veya Hotspot Bağlantısı Bekleniyor"
        }
    }
}
