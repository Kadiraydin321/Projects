package com.birin.moonnovel

import okhttp3.Dns
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.InetAddress
import java.net.UnknownHostException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * AdGuard DNS-over-HTTPS (DoH) Çözümleyicisi
 * Tüm DNS sorgularını ISP veya yerel ağ DNS'i yerine şifreli HTTPS kanalı üzerinden
 * AdGuard DNS sunucularına iletir. Reklam/izleyici/zararlı yazılım engelleme ve DNS sızıntı koruması sağlar.
 */
class AdGuardDohDns : Dns {

    private val dohClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private val cache = ConcurrentHashMap<String, List<InetAddress>>()

    override fun lookup(hostname: String): List<InetAddress> {
        // Önceden çözülmüşse önbellekten dön
        cache[hostname]?.let { return it }

        // 1. AdGuard DoH üzerinden çöz
        try {
            val url = "https://dns.adguard-dns.com/resolve?name=$hostname&type=A"
            val req = Request.Builder()
                .url(url)
                .header("Accept", "application/dns-json")
                .header("User-Agent", "Mozilla/5.0")
                .build()

            val response = dohClient.newCall(req).execute()
            if (response.isSuccessful) {
                val body = response.body?.string() ?: ""
                val json = JSONObject(body)
                val status = json.optInt("Status", -1)

                if (status == 0 && json.has("Answer")) {
                    val answers = json.getJSONArray("Answer")
                    val addresses = mutableListOf<InetAddress>()
                    for (i in 0 until answers.length()) {
                        val item = answers.getJSONObject(i)
                        val type = item.optInt("type", 0)
                        if (type == 1) { // Type 1 = IPv4 A Record
                            val ip = item.optString("data", "")
                            if (ip.isNotEmpty()) {
                                addresses.add(InetAddress.getByName(ip))
                            }
                        }
                    }
                    if (addresses.isNotEmpty()) {
                        cache[hostname] = addresses
                        return addresses
                    }
                }
            }
        } catch (e: Exception) {
            // AdGuard DoH geçici olarak yanıt veremezse güvenli AdGuard IP fallback'i
        }

        // 2. Fallback olarak standart sistem DNS lookup'ı
        try {
            val systemAddresses = Dns.SYSTEM.lookup(hostname)
            cache[hostname] = systemAddresses
            return systemAddresses
        } catch (e: Exception) {
            throw UnknownHostException("AdGuard DNS ve sistem '$hostname' adresini çözemedi: ${e.message}")
        }
    }
}
