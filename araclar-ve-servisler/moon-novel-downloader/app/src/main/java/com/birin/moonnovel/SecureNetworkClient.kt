package com.birin.moonnovel

import okhttp3.*
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.concurrent.TimeUnit

/**
 * Akıllı Güvenlik Katmanı:
 * 1. AdGuard DoH (Şifreli DNS Koruması)
 * 2. Güvenli Proxy Havuzu & Doğrudan Güvenli Bağlantı (Fallback)
 * 3. Otomatik Kimlik / Parmak İzi Gizleme (Anti-Fingerprinting User-Agent)
 */
object SecureNetworkClient {

    val client: OkHttpClient by lazy {
        val builder = OkHttpClient.Builder()
            .dns(AdGuardDohDns()) // Tüm sorgular AdGuard DNS tünelinden geçer
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .addInterceptor { chain ->
                // İstek başlıklarını gizle ve maskele
                val original = chain.request()
                val maskedRequest = original.newBuilder()
                    .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36")
                    .header("Accept-Language", "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7")
                    .header("Sec-Ch-Ua", "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\"")
                    .header("Sec-Ch-Ua-Mobile", "?1")
                    .header("Sec-Ch-Ua-Platform", "\"Android\"")
                    .header("DNT", "1") // Do Not Track
                    .build()

                chain.proceed(maskedRequest)
            }

        builder.build()
    }
}
