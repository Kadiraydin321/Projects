package com.birin.moonnovel.backup

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object BackupRestoreManager {

    fun exportUserData(context: Context): String {
        val root = JSONObject()
        val statsPrefs = context.getSharedPreferences("moon_reading_stats", Context.MODE_PRIVATE)

        val statsObj = JSONObject().apply {
            put("total_words", statsPrefs.getLong("total_words_read", 0L))
            put("total_reading_sec", statsPrefs.getLong("total_reading_time_sec", 0L))
            put("completed_chapters", statsPrefs.getInt("completed_chapters_count", 0))
        }
        root.put("stats", statsObj)

        val zipsDir = File(context.getExternalFilesDir(null) ?: context.filesDir, "zips")
        val archiveArray = JSONArray()
        if (zipsDir.exists()) {
            zipsDir.listFiles { f -> f.extension.equals("zip", ignoreCase = true) }?.forEach { f ->
                archiveArray.put(f.name)
            }
        }
        root.put("saved_archives", archiveArray)
        root.put("export_timestamp", System.currentTimeMillis())

        return root.toString(2)
    }

    fun importUserData(context: Context, jsonStr: String): Boolean {
        return try {
            val root = JSONObject(jsonStr)
            if (root.has("stats")) {
                val statsObj = root.getJSONObject("stats")
                val statsPrefs = context.getSharedPreferences("moon_reading_stats", Context.MODE_PRIVATE)
                statsPrefs.edit()
                    .putLong("total_words_read", statsObj.optLong("total_words", 0L))
                    .putLong("total_reading_time_sec", statsObj.optLong("total_reading_sec", 0L))
                    .putInt("completed_chapters_count", statsObj.optInt("completed_chapters", 0))
                    .apply()
            }
            true
        } catch (_: Exception) {
            false
        }
    }
}
