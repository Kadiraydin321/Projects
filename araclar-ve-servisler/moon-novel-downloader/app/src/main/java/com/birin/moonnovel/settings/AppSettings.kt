package com.birin.moonnovel.settings

import android.content.Context
import android.content.SharedPreferences

object AppSettings {
    private const val PREFS = "moon_app_settings"

    // 3 Karanlık Tema
    const val THEME_DARK = "DARK"
    const val THEME_AMOLED = "AMOLED"
    const val THEME_MIDNIGHT = "MIDNIGHT"

    // 3 Aydınlık Tema
    const val THEME_SEPIA = "SEPIA"
    const val THEME_LIGHT_WHITE = "LIGHT_WHITE"
    const val THEME_MINT = "MINT"

    private fun getPrefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun getTheme(context: Context): String =
        getPrefs(context).getString("app_theme", THEME_DARK) ?: THEME_DARK

    fun setTheme(context: Context, theme: String) {
        getPrefs(context).edit().putString("app_theme", theme).apply()
    }

    fun getTtsSpeed(context: Context): Float =
        getPrefs(context).getFloat("tts_default_speed", 1.0f)

    fun setTtsSpeed(context: Context, speed: Float) {
        getPrefs(context).edit().putFloat("tts_default_speed", speed).apply()
    }

    fun getTtsLanguage(context: Context): String =
        getPrefs(context).getString("tts_language", "tr") ?: "tr"

    fun setTtsLanguage(context: Context, lang: String) {
        getPrefs(context).edit().putString("tts_language", lang).apply()
    }

    fun getTtsVoice(context: Context): String =
        getPrefs(context).getString("tts_voice_name", "") ?: ""

    fun setTtsVoice(context: Context, voiceName: String) {
        getPrefs(context).edit().putString("tts_voice_name", voiceName).apply()
    }

    fun getTtsPitch(context: Context): Float =
        getPrefs(context).getFloat("tts_pitch", 1.0f)

    fun setTtsPitch(context: Context, pitch: Float) {
        getPrefs(context).edit().putFloat("tts_pitch", pitch).apply()
    }

    fun getDefaultSource(context: Context): String =
        getPrefs(context).getString("default_source", "ALL") ?: "ALL"

    fun setDefaultSource(context: Context, source: String) {
        getPrefs(context).edit().putString("default_source", source).apply()
    }

    fun getFontSize(context: Context): Float =
        getPrefs(context).getFloat("reader_font_size", 17f)

    fun setFontSize(context: Context, size: Float) {
        getPrefs(context).edit().putFloat("reader_font_size", size).apply()
    }
}
