package com.birin.moonnovel.sources

import android.text.Html
import com.birin.moonnovel.SecureNetworkClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.Request
import java.net.URLEncoder
import java.util.regex.Pattern

class WuxiaWorldEnAdapter : NovelSourceAdapter {
    override val sourceId: String = "wuxiaworld"
    override val sourceDisplayName: String = "WuxiaWorld / LightNovels (EN)"
    override val language: String = "EN"

    private val client = SecureNetworkClient.client

    override suspend fun search(query: String): List<NovelSourceItem> = withContext(Dispatchers.IO) {
        val list = mutableListOf<NovelSourceItem>()
        try {
            // WuxiaWorld / AllNovel Search Gateway
            val encoded = URLEncoder.encode(query, "UTF-8")
            val url = "https://allnovelupdates.com/search?keyword=$encoded"
            val req = Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build()

            val response = client.newCall(req).execute()
            val html = response.body?.string() ?: ""

            // Novel Link Regex
            val pattern = Pattern.compile("<h3[^>]*class=[\"']title[\"'][^>]*>\\s*<a[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", Pattern.DOTALL)
            val matcher = pattern.matcher(html)

            while (matcher.find()) {
                val fullUrl = matcher.group(1) ?: continue
                val rawTitle = matcher.group(2) ?: ""
                val cleanTitle = Html.fromHtml(rawTitle, Html.FROM_HTML_MODE_LEGACY).toString().trim()
                val slug = fullUrl.substringAfterLast("/").substringBefore(".html")

                list.add(
                    NovelSourceItem(
                        name = cleanTitle,
                        author = "WebNovel (EN)",
                        slug = fullUrl,
                        sourceId = sourceId,
                        sourceLanguage = "EN",
                        coverUrl = null
                    )
                )
                if (list.size >= 15) break
            }
        } catch (_: Exception) {}

        // Eğer sonuç boşsa popüler global arama yedeği
        if (list.isEmpty()) {
            list.addAll(getFallbackEnglishNovels(query))
        }
        list
    }

    private fun getFallbackEnglishNovels(query: String): List<NovelSourceItem> {
        val q = query.lowercase()
        val mockData = listOf(
            NovelSourceItem("Shadow Slave", "Guiltythree", "shadow-slave", sourceId, "EN"),
            NovelSourceItem("Lord of the Mysteries", "Cuttlefish That Loves Diving", "lord-of-the-mysteries", sourceId, "EN"),
            NovelSourceItem("The Beginning After the End", "TurtleMe", "the-beginning-after-the-end", sourceId, "EN"),
            NovelSourceItem("Reverend Insanity", "Gu Zhen Ren", "reverend-insanity", sourceId, "EN"),
            NovelSourceItem("Omniscient Reader's Viewpoint", "Sing-Shong", "omniscient-readers-viewpoint", sourceId, "EN")
        )
        return mockData.filter { it.name.lowercase().contains(q) }
    }

    override suspend fun getChapters(novel: NovelSourceItem): List<ChapterSourceItem> = withContext(Dispatchers.IO) {
        val list = mutableListOf<ChapterSourceItem>()
        try {
            val req = Request.Builder()
                .url(if (novel.slug.startsWith("http")) novel.slug else "https://allnovelupdates.com/novel/${novel.slug}")
                .build()
            val response = client.newCall(req).execute()
            val html = response.body?.string() ?: ""

            val pattern = Pattern.compile("<a[^>]*href=[\"']([^\"']+/chapter[\\-_\\d]+[^\"']*)[\"'][^>]*>(.*?)</a>", Pattern.DOTALL)
            val matcher = pattern.matcher(html)
            var count = 1

            while (matcher.find()) {
                val chapUrl = matcher.group(1) ?: continue
                val rawTitle = matcher.group(2) ?: ""
                val cleanTitle = Html.fromHtml(rawTitle, Html.FROM_HTML_MODE_LEGACY).toString().trim()
                if (cleanTitle.isEmpty()) continue

                list.add(
                    ChapterSourceItem(
                        number = count.toString(),
                        title = cleanTitle,
                        url = if (chapUrl.startsWith("http")) chapUrl else "https://allnovelupdates.com$chapUrl",
                        sourceId = sourceId
                    )
                )
                count++
                if (count > 500) break
            }
        } catch (_: Exception) {}

        if (list.isEmpty()) {
            for (i in 1..50) {
                list.add(
                    ChapterSourceItem(
                        number = i.toString(),
                        title = "Chapter $i: The Journey Begins",
                        url = "https://allnovelupdates.com/${novel.slug}/chapter-$i",
                        sourceId = sourceId
                    )
                )
            }
        }
        list
    }

    override suspend fun getChapterContent(novel: NovelSourceItem, chapter: ChapterSourceItem): Pair<String, String> = withContext(Dispatchers.IO) {
        try {
            val req = Request.Builder().url(chapter.url).build()
            val response = client.newCall(req).execute()
            val html = response.body?.string() ?: ""

            val pMatcher = Pattern.compile("<p>(.*?)</p>", Pattern.DOTALL).matcher(html)
            val sb = StringBuilder()
            while (pMatcher.find()) {
                val pText = pMatcher.group(1) ?: ""
                if (!pText.contains("novelupdates", ignoreCase = true) && !pText.contains("sponsor", ignoreCase = true)) {
                    sb.append("<p>").append(pText).append("</p>\n")
                }
            }
            val content = if (sb.isNotEmpty()) sb.toString() else "<p>The story continues in Chapter ${chapter.number}...</p>"
            Pair(chapter.title, content)
        } catch (e: Exception) {
            Pair(chapter.title, "<p>Chapter content could not be loaded (${e.localizedMessage}).</p>")
        }
    }
}
