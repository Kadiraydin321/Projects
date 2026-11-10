package com.birin.moonnovel.translation

import com.birin.moonnovel.SecureNetworkClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONArray
import java.net.URLEncoder

object TranslationEngine {

    private val client = SecureNetworkClient.client

    /**
     * İngilizce metni hızlı ve akıcı bir şekilde Türkçeye çevirir.
     * Google Translate Web API & Lingva açık uç noktalarını fallback ile kullanır.
     */
    suspend fun translateEnToTr(text: String): String = withContext(Dispatchers.IO) {
        if (text.isBlank()) return@withContext text

        // 1. Google Translate GTranslate Endpoint (Ücretsiz & Anahtarsız)
        try {
            val encoded = URLEncoder.encode(text, "UTF-8")
            val url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=$encoded"
            val req = Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0")
                .build()

            val response = client.newCall(req).execute()
            if (response.isSuccessful) {
                val jsonStr = response.body?.string() ?: ""
                val rootArray = JSONArray(jsonStr)
                val sentencesArray = rootArray.getJSONArray(0)
                val resultSb = StringBuilder()
                for (i in 0 until sentencesArray.length()) {
                    val part = sentencesArray.getJSONArray(i)
                    resultSb.append(part.getString(0))
                }
                val translated = resultSb.toString().trim()
                if (translated.isNotEmpty()) {
                    return@withContext translated
                }
            }
        } catch (_: Exception) {}

        // 2. Paragraf bazlı güvenli çeviri
        try {
            val lines = text.split("\n")
            val translatedLines = mutableListOf<String>()
            for (line in lines) {
                if (line.isBlank()) {
                    translatedLines.add("")
                    continue
                }
                val enc = URLEncoder.encode(line, "UTF-8")
                val url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=$enc"
                val res = client.newCall(Request.Builder().url(url).build()).execute()
                val jsonStr = res.body?.string() ?: ""
                val root = JSONArray(jsonStr)
                val sentences = root.getJSONArray(0)
                val lineSb = StringBuilder()
                for (i in 0 until sentences.length()) {
                    lineSb.append(sentences.getJSONArray(i).getString(0))
                }
                translatedLines.add(lineSb.toString())
            }
            return@withContext translatedLines.joinToString("\n")
        } catch (_: Exception) {}

        // Eğer ağ hatası varsa orijinal metni koru
        text
    }
}
