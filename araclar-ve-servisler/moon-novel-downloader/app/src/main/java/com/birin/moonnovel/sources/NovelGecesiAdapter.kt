package com.birin.moonnovel.sources

import android.text.Html
import com.birin.moonnovel.SecureNetworkClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONArray
import java.net.URLEncoder
import java.util.regex.Pattern

class NovelGecesiAdapter : NovelSourceAdapter {
    override val sourceId: String = "novelgecesi"
    override val sourceDisplayName: String = "NovelGecesi (TR)"
    override val language: String = "TR"

    private val client = SecureNetworkClient.client

    override suspend fun search(query: String): List<NovelSourceItem> = withContext(Dispatchers.IO) {
        try {
            val encoded = URLEncoder.encode(query, "UTF-8")
            val req = Request.Builder()
                .url("https://www.novelgecesi.com/search?q=$encoded")
                .build()

            val response = client.newCall(req).execute()
            val body = response.body?.string() ?: "[]"
            val jsonArray = JSONArray(body)
            val list = mutableListOf<NovelSourceItem>()

            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val rawSlug = obj.optString("urlFormat", "")
                val cleanSlug = rawSlug.filter { it.isLetterOrDigit() || it == '-' || it == '_' }
                list.add(
                    NovelSourceItem(
                        name = obj.optString("name", "Bilinmeyen"),
                        author = obj.optString("author", "Bilinmeyen"),
                        slug = cleanSlug,
                        sourceId = sourceId,
                        sourceLanguage = "TR",
                        coverUrl = if (obj.has("image")) obj.optString("image") else null
                    )
                )
            }
            list
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getChapters(novel: NovelSourceItem): List<ChapterSourceItem> = withContext(Dispatchers.IO) {
        val list = mutableListOf<ChapterSourceItem>()
        val seenNumbers = mutableSetOf<String>()
        var page = 1

        while (page <= 25) {
            try {
                val url = "https://www.novelgecesi.com/${novel.slug}?chaptersPage=$page"
                val req = Request.Builder().url(url).build()
                val response = client.newCall(req).execute()
                val html = response.body?.string() ?: ""

                val pattern = Pattern.compile("<a[^>]*href=[\"']/${novel.slug}/(\\d+)[\"'][^>]*>(.*?)</a>", Pattern.DOTALL)
                val matcher = pattern.matcher(html)
                var foundOnPage = 0

                while (matcher.find()) {
                    val cnum = matcher.group(1) ?: continue
                    if (seenNumbers.contains(cnum)) continue

                    val rawText = matcher.group(2) ?: ""
                    val cleanText = Html.fromHtml(rawText, Html.FROM_HTML_MODE_LEGACY).toString()
                    val lines = cleanText.split("\n").map { it.trim() }.filter { it.isNotEmpty() }

                    if (lines.isNotEmpty() && lines[0] == "İlk Bölümü Oku") continue

                    val title = if (lines.isNotEmpty()) lines[0] else "Bölüm $cnum"
                    val displayName = title.replace(Regex("^Bölüm\\s+\\d+\\s*[:\\-–—]\\s*", RegexOption.IGNORE_CASE), "").trim()
                    val finalTitle = if (displayName.isNotEmpty()) displayName else title

                    seenNumbers.add(cnum)
                    list.add(
                        ChapterSourceItem(
                            number = cnum,
                            title = finalTitle,
                            url = "https://www.novelgecesi.com/${novel.slug}/$cnum",
                            sourceId = sourceId
                        )
                    )
                    foundOnPage++
                }

                if (foundOnPage == 0 || !html.contains("Sonraki sayfa")) {
                    break
                }
                page++
            } catch (e: Exception) {
                break
            }
        }
        list
    }

    override suspend fun getChapterContent(novel: NovelSourceItem, chapter: ChapterSourceItem): Pair<String, String> = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(chapter.url).build()
        val response = client.newCall(req).execute()
        val html = response.body?.string() ?: ""

        val titlePattern = Pattern.compile("<h1[^>]*>(.*?)</h1>", Pattern.DOTALL)
        val titleMatcher = titlePattern.matcher(html)
        val fetchedTitle = if (titleMatcher.find()) {
            Html.fromHtml(titleMatcher.group(1) ?: "", Html.FROM_HTML_MODE_LEGACY).toString().trim()
        } else {
            chapter.title
        }

        val contentPattern = Pattern.compile(
            "(?:id=[\"']reader-content[\"'][^>]*>|<div[^>]*class=[\"'][^\"']*entry-content[^\"']*[\"'][^>]*>)(.*?)(?:<div class=[\"']auth-prompt[\"']|</div>\\s*<div|<!--\\s*Yorumlar|<div class=[\"']comments[\"'])",
            Pattern.DOTALL
        )
        val contentMatcher = contentPattern.matcher(html)
        var bodyHtml = if (contentMatcher.find()) {
            contentMatcher.group(1) ?: ""
        } else {
            val pMatcher = Pattern.compile("<p>(.*?)</p>", Pattern.DOTALL).matcher(html)
            val sb = java.lang.StringBuilder()
            while (pMatcher.find()) {
                sb.append("<p>").append(pMatcher.group(1)).append("</p>\n")
            }
            sb.toString()
        }

        bodyHtml = bodyHtml.replace(Regex("<div[^>]*class=[\"'][^\"']*ad[^\"']*[\"'][^>]*>.*?</div>", setOf(RegexOption.DOT_MATCHES_ALL)), "")
            .replace(Regex("<script[^>]*>.*?</script>", setOf(RegexOption.DOT_MATCHES_ALL)), "")

        Pair(fetchedTitle, bodyHtml)
    }
}
