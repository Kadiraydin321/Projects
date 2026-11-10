package com.birin.moonnovel.stats

import android.content.Context
import android.content.SharedPreferences

object ReadingStatsManager {

    private const val PREFS_NAME = "moon_reading_stats"
    private const val KEY_TOTAL_WORDS_READ = "total_words_read"
    private const val KEY_TOTAL_READING_TIME_SEC = "total_reading_time_sec"
    private const val KEY_COMPLETED_CHAPTERS = "completed_chapters_count"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun addReadingSession(context: Context, wordCount: Int, durationSeconds: Long) {
        val prefs = getPrefs(context)
        val currentWords = prefs.getLong(KEY_TOTAL_WORDS_READ, 0L)
        val currentTime = prefs.getLong(KEY_TOTAL_READING_TIME_SEC, 0L)
        val chapters = prefs.getInt(KEY_COMPLETED_CHAPTERS, 0)

        prefs.edit()
            .putLong(KEY_TOTAL_WORDS_READ, currentWords + wordCount.coerceAtLeast(0))
            .putLong(KEY_TOTAL_READING_TIME_SEC, currentTime + durationSeconds.coerceAtLeast(0))
            .putInt(KEY_COMPLETED_CHAPTERS, chapters + 1)
            .apply()
    }

    fun getStatsSummary(context: Context): Triple<Long, Long, Int> {
        val prefs = getPrefs(context)
        val totalWords = prefs.getLong(KEY_TOTAL_WORDS_READ, 0L)
        val totalTimeMinutes = prefs.getLong(KEY_TOTAL_READING_TIME_SEC, 0L) / 60
        val totalChapters = prefs.getInt(KEY_COMPLETED_CHAPTERS, 0)
        return Triple(totalWords, totalTimeMinutes, totalChapters)
    }
}
