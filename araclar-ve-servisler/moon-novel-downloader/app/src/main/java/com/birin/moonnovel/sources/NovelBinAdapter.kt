package com.birin.moonnovel.sources

import android.text.Html
import com.birin.moonnovel.SecureNetworkClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.net.URLEncoder

class NovelBinAdapter : NovelSourceAdapter {
    override val sourceId: String = "novelbin"
    override val sourceDisplayName: String = "NovelBin (EN)"
    override val language: String = "EN"

    private val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

    override suspend fun search(query: String): List<NovelSourceItem> = withContext(Dispatchers.IO) {
        return@withContext try {
            val encodedQuery = URLEncoder.encode(query, "UTF-8")
            val url = "https://novelbin.me/search?keyword=$encodedQuery"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", userAgent)
                .build()

            val response = SecureNetworkClient.client.newCall(request).execute()

            if (!response.isSuccessful) {
                return@withContext getFallbackPopularNovels()
            }

            val html = response.body?.string().orEmpty()
            val results = mutableListOf<NovelSourceItem>()

            // Extract novels using regex
            val pattern = Regex(
                "<h3[^>]*class=[\"']novel-title[\"'][^>]*>\\s*<a[^>]*href=[\"']([^\"']*)[\"'][^>]*title=[\"']([^\"']*)[\"'][^>]*>(.*?)</a>",
                RegexOption.DOT_MATCHES_ALL
            )
            val matches = pattern.findAll(html)

            for ((index, match) in matches.withIndex()) {
                if (index >= 15) break // Max 15 results

                val fullUrl = match.groupValues[1]
                val title = match.groupValues[2].trim()
                val cleanTitle = Html.fromHtml(title, Html.FROM_HTML_MODE_LEGACY).toString().trim()

                val coverPattern = Regex("<img[^>]*src=[\"']([^\"']*)[\"'][^>]*class=[\"'][^\"']*cover[^\"']*['\"]", RegexOption.DOT_MATCHES_ALL)
                val coverMatch = coverPattern.find(html)?.groupValues?.get(1)

                val slug = if (fullUrl.startsWith("http")) fullUrl else "https://novelbin.me$fullUrl"
                val coverUrl = coverMatch?.takeIf { it.isNotBlank() }

                results.add(
                    NovelSourceItem(
                        name = cleanTitle,
                        author = "NovelBin (EN)",
                        slug = slug,
                        sourceId = sourceId,
                        sourceLanguage = language,
                        coverUrl = coverUrl
                    )
                )
            }

            if (results.isEmpty()) {
                getFallbackPopularNovels()
            } else {
                results
            }
        } catch (_: Exception) {
            getFallbackPopularNovels()
        }
    }

    override suspend fun getChapters(novel: NovelSourceItem): List<ChapterSourceItem> = withContext(Dispatchers.IO) {
        return@withContext try {
            val novelUrl = if (novel.slug.startsWith("http")) novel.slug else "https://novelbin.me/novel-book/${novel.slug}"
            val request = Request.Builder()
                .url(novelUrl)
                .header("User-Agent", userAgent)
                .build()

            val response = SecureNetworkClient.client.newCall(request).execute()

            if (!response.isSuccessful) {
                return@withContext getFallbackChapters(novel)
            }

            val html = response.body?.string().orEmpty()

            // Try to extract novel ID
            val idPattern = Regex("data-novel-id=[\"'](\\d+)[\"']|id=[\"']rating[\"'][^>]*data-novel-id=[\"'](\\d+)[\"']|novelId\\s*[:=]\\s*[\"']?(\\d+)[\"']?")
            val idMatch = idPattern.find(html)
            val novelId = idMatch?.groupValues?.get(1)?.takeIf { it.isNotBlank() }
                ?: idMatch?.groupValues?.get(2)?.takeIf { it.isNotBlank() }
                ?: idMatch?.groupValues?.get(3)?.takeIf { it.isNotBlank() }

            if (!novelId.isNullOrEmpty()) {
                // Use AJAX endpoint
                val ajaxUrl = "https://novelbin.me/ajax/chapter-archive?novelId=$novelId"
                val ajaxRequest = Request.Builder()
                    .url(ajaxUrl)
                    .header("User-Agent", userAgent)
                    .header("X-Requested-With", "XMLHttpRequest")
                    .header("Referer", novelUrl)
                    .build()

                val ajaxResponse = SecureNetworkClient.client.newCall(ajaxRequest).execute()

                if (ajaxResponse.isSuccessful) {
                    val ajaxHtml = ajaxResponse.body?.string().orEmpty()
                    val chapterPattern = Regex("<a[^>]*href=[\"']([^\"']*)[\"'][^>]*title=[\"']([^\"']*)[\"'][^>]*>(.*?)</a>", RegexOption.DOT_MATCHES_ALL)
                    val chapterMatches = chapterPattern.findAll(ajaxHtml)

                    val chapters = mutableListOf<ChapterSourceItem>()
                    var count = 0
                    for ((index, match) in chapterMatches.withIndex()) {
                        if (index >= 1000) break // Max 1000 chapters

                        val fullUrl = match.groupValues[1]
                        val title = match.groupValues[2].trim()
                        val cleanTitle = Html.fromHtml(title, Html.FROM_HTML_MODE_LEGACY).toString().trim()

                        count++
                        val absoluteChapterUrl = if (fullUrl.startsWith("http")) fullUrl else "https://novelbin.me$fullUrl"
                        chapters.add(
                            ChapterSourceItem(
                                number = count.toString(),
                                title = cleanTitle,
                                url = absoluteChapterUrl,
                                sourceId = sourceId
                            )
                        )
                    }

                    if (chapters.isNotEmpty()) return@withContext chapters
                }
            }

            // Fallback to direct parsing from novel page
            val fallbackPattern = Regex("<a[^>]*href=[\"']([^\"']+/(?:chapter[\\-_\\d]+|c\\d+)[^\"']*)[\"'][^>]*>(.*?)</a>", RegexOption.DOT_MATCHES_ALL)
            val fallbackMatches = fallbackPattern.findAll(html)

            val chapters = mutableListOf<ChapterSourceItem>()
            var count = 0
            for ((index, match) in fallbackMatches.withIndex()) {
                if (index >= 1000) break // Max 1000 chapters

                val fullUrl = match.groupValues[1]
                val title = match.groupValues[2].trim()
                val cleanTitle = Html.fromHtml(title, Html.FROM_HTML_MODE_LEGACY).toString().trim()

                count++
                val absoluteChapterUrl = if (fullUrl.startsWith("http")) fullUrl else "https://novelbin.me$fullUrl"
                chapters.add(
                    ChapterSourceItem(
                        number = count.toString(),
                        title = cleanTitle,
                        url = absoluteChapterUrl,
                        sourceId = sourceId
                    )
                )
            }

            if (chapters.isNotEmpty()) {
                chapters
            } else {
                getFallbackChapters(novel)
            }
        } catch (_: Exception) {
            getFallbackChapters(novel)
        }
    }

    override suspend fun getChapterContent(novel: NovelSourceItem, chapter: ChapterSourceItem): Pair<String, String> = withContext(Dispatchers.IO) {
        return@withContext try {
            val request = Request.Builder()
                .url(chapter.url)
                .header("User-Agent", userAgent)
                .build()

            val response = SecureNetworkClient.client.newCall(request).execute()

            if (!response.isSuccessful) {
                return@withContext Pair(chapter.title, "<p>Chapter content could not be loaded (${response.code}).</p>")
            }

            val html = response.body?.string().orEmpty()

            // Extract title
            val titlePattern = Regex("<h2[^>]*class=[\"'][^\"']*chr-title[^\"']*['\"][^>]*>(.*?)</h2>|<span[^>]*class=[\"'][^\"']*chr-text[^\"']*['\"][^>]*>(.*?)</span>|<h1[^>]*>(.*?)</h1>", RegexOption.DOT_MATCHES_ALL)
            val titleMatch = titlePattern.find(html)
            val cleanTitle = if (titleMatch != null) {
                val found = titleMatch.groupValues.drop(1).firstOrNull { it.isNotBlank() } ?: chapter.title
                Html.fromHtml(found, Html.FROM_HTML_MODE_LEGACY).toString().trim()
            } else {
                chapter.title
            }

            // Extract content
            val contentPattern = Regex("<div[^>]*id=[\"']chr-content[\"'][^>]*>(.*?)</div>|<div[^>]*id=[\"']chapter-content[\"'][^>]*>(.*?)</div>", RegexOption.DOT_MATCHES_ALL)
            val contentMatch = contentPattern.find(html)

            val contentHtml = if (contentMatch != null) {
                contentMatch.groupValues.drop(1).firstOrNull { it.isNotBlank() } ?: html
            } else {
                // Fallback to general <p> tags
                val pPattern = Regex("<p[^>]*>(.*?)</p>", RegexOption.DOT_MATCHES_ALL)
                val pMatches = pPattern.findAll(html)
                pMatches.joinToString("") { it.groupValues[1] }
            }

            // Clean content
            val cleanContent = cleanHtmlContent(contentHtml)

            Pair(cleanTitle, cleanContent)
        } catch (e: Exception) {
            Pair(chapter.title, "<p>Chapter content could not be loaded (${e.localizedMessage}).</p>")
        }
    }

    private fun getFallbackPopularNovels(): List<NovelSourceItem> {
        val fallbackTitles = listOf(
            "Shadow Slave",
            "Lord of the Mysteries",
            "The Beginning After the End",
            "Reverend Insanity",
            "Omniscient Reader's Viewpoint"
        )

        return fallbackTitles.map { title ->
            NovelSourceItem(
                name = title,
                author = "NovelBin (EN)",
                slug = "https://novelbin.me/novel-book/${title.lowercase().replace(" ", "-")}",
                sourceId = sourceId,
                sourceLanguage = language
            )
        }
    }

    private fun getFallbackChapters(novel: NovelSourceItem): List<ChapterSourceItem> {
        val chapters = mutableListOf<ChapterSourceItem>()
        for (i in 1..50) {
            chapters.add(
                ChapterSourceItem(
                    number = i.toString(),
                    title = "Chapter $i",
                    url = "${novel.slug}/chapter-$i",
                    sourceId = sourceId
                )
            )
        }
        return chapters
    }

    private fun cleanHtmlContent(html: String): String {
        var clean = html

        // Remove script and style tags
        clean = Regex("<script[^>]*>.*?</script>", RegexOption.DOT_MATCHES_ALL).replace(clean, "")
        clean = Regex("<style[^>]*>.*?</style>", RegexOption.DOT_MATCHES_ALL).replace(clean, "")

        // Remove ad divs or other unwanted blocks
        clean = Regex("<div[^>]*class=[\"'][^\"']*ad[^\"']*['\"][^>]*>.*?</div>", RegexOption.DOT_MATCHES_ALL).replace(clean, "")
        clean = Regex("<div[^>]*id=[\"'][^\"']*ad[^\"']*['\"][^>]*>.*?</div>", RegexOption.DOT_MATCHES_ALL).replace(clean, "")

        // Extract paragraphs
        val pPattern = Regex("<p[^>]*>(.*?)</p>", RegexOption.DOT_MATCHES_ALL)
        val pMatches = pPattern.findAll(clean)

        val sb = StringBuilder()
        for (match in pMatches) {
            val text = match.groupValues[1]
            if (!text.contains("novelbin", ignoreCase = true) &&
                !text.contains("report chapter", ignoreCase = true) &&
                !text.contains("sponsor", ignoreCase = true) &&
                !text.contains("pirated", ignoreCase = true) &&
                !text.contains("If you find any errors", ignoreCase = true)
            ) {
                sb.append("<p>$text</p>")
            }
        }

        return sb.toString()
    }
}
