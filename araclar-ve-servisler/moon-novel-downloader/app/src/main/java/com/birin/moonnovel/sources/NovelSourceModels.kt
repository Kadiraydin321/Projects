package com.birin.moonnovel.sources

data class NovelSourceItem(
    val name: String,
    val author: String,
    val slug: String,
    val sourceId: String, // "novelgecesi", "wuxiaworld", "boxnovel"
    val sourceLanguage: String = "TR", // "TR" veya "EN"
    val coverUrl: String? = null
)

data class ChapterSourceItem(
    val number: String,
    val title: String,
    val url: String,
    val sourceId: String = "novelgecesi"
)

interface NovelSourceAdapter {
    val sourceId: String
    val sourceDisplayName: String
    val language: String
    suspend fun search(query: String): List<NovelSourceItem>
    suspend fun getChapters(novel: NovelSourceItem): List<ChapterSourceItem>
    suspend fun getChapterContent(novel: NovelSourceItem, chapter: ChapterSourceItem): Pair<String, String> // Pair<Title, CleanHtmlContent>
}
