package com.birin.moonnovel.theme

import android.content.Context
import android.graphics.Color
import com.birin.moonnovel.settings.AppSettings

data class ThemeModel(
    val id: String,
    val name: String,
    val category: String, // "Karanlık" or "Aydınlık"
    val isDark: Boolean,
    val bgColor: Int,
    val cardColor: Int,
    val strokeColor: Int,
    val accentColor: Int,
    val textPrimary: Int,
    val textSecondary: Int,
    val readerBg: Int,
    val readerText: Int,
    val highlightColor: Int
)

object AppThemeManager {

    val THEMES = listOf(
        // 1. Obsidyen & Koyu Kırmızı (Varsayılan Koyu)
        ThemeModel(
            id = AppSettings.THEME_DARK,
            name = "Obsidyen & Kırmızı (Varsayılan)",
            category = "Karanlık",
            isDark = true,
            bgColor = Color.parseColor("#0A0A0C"),
            cardColor = Color.parseColor("#141419"),
            strokeColor = Color.parseColor("#2A2A38"),
            accentColor = Color.parseColor("#E11D48"),
            textPrimary = Color.parseColor("#FFFFFF"),
            textSecondary = Color.parseColor("#94A3B8"),
            readerBg = Color.parseColor("#0A0A0C"),
            readerText = Color.parseColor("#E2E8F0"),
            highlightColor = Color.parseColor("#55E11D48")
        ),
        // 2. Saf AMOLED Siyah
        ThemeModel(
            id = AppSettings.THEME_AMOLED,
            name = "Saf AMOLED Siyah",
            category = "Karanlık",
            isDark = true,
            bgColor = Color.parseColor("#000000"),
            cardColor = Color.parseColor("#0D0D11"),
            strokeColor = Color.parseColor("#1E1E26"),
            accentColor = Color.parseColor("#E11D48"),
            textPrimary = Color.parseColor("#FFFFFF"),
            textSecondary = Color.parseColor("#64748B"),
            readerBg = Color.parseColor("#000000"),
            readerText = Color.parseColor("#D1D5DB"),
            highlightColor = Color.parseColor("#55E11D48")
        ),
        // 3. Gece Mavisi & Derin Uzay
        ThemeModel(
            id = AppSettings.THEME_MIDNIGHT,
            name = "Gece Mavisi & Derin Uzay",
            category = "Karanlık",
            isDark = true,
            bgColor = Color.parseColor("#0B132B"),
            cardColor = Color.parseColor("#1C2541"),
            strokeColor = Color.parseColor("#3A506B"),
            accentColor = Color.parseColor("#48CAE4"),
            textPrimary = Color.parseColor("#FFFFFF"),
            textSecondary = Color.parseColor("#A0C4E2"),
            readerBg = Color.parseColor("#0B132B"),
            readerText = Color.parseColor("#E0E6ED"),
            highlightColor = Color.parseColor("#5548CAE4")
        ),
        // 4. Sepya Kitap Dokusu
        ThemeModel(
            id = AppSettings.THEME_SEPIA,
            name = "Sepya Kitap Dokusu",
            category = "Aydınlık",
            isDark = false,
            bgColor = Color.parseColor("#F4ECD8"),
            cardColor = Color.parseColor("#EADBBE"),
            strokeColor = Color.parseColor("#D4C4A3"),
            accentColor = Color.parseColor("#A83232"),
            textPrimary = Color.parseColor("#382A1B"),
            textSecondary = Color.parseColor("#6E5D4A"),
            readerBg = Color.parseColor("#F4ECD8"),
            readerText = Color.parseColor("#382A1B"),
            highlightColor = Color.parseColor("#55A83232")
        ),
        // 5. Kutup Beyazı & Temiz Aydınlık
        ThemeModel(
            id = AppSettings.THEME_LIGHT_WHITE,
            name = "Kutup Beyazı & Temiz Aydınlık",
            category = "Aydınlık",
            isDark = false,
            bgColor = Color.parseColor("#F8FAFC"),
            cardColor = Color.parseColor("#FFFFFF"),
            strokeColor = Color.parseColor("#E2E8F0"),
            accentColor = Color.parseColor("#E11D48"),
            textPrimary = Color.parseColor("#0F172A"),
            textSecondary = Color.parseColor("#64748B"),
            readerBg = Color.parseColor("#FFFFFF"),
            readerText = Color.parseColor("#1E293B"),
            highlightColor = Color.parseColor("#55E11D48")
        ),
        // 6. Pastel Nane & Adaçayı Yeşili
        ThemeModel(
            id = AppSettings.THEME_MINT,
            name = "Pastel Nane (Göz Yormayan)",
            category = "Aydınlık",
            isDark = false,
            bgColor = Color.parseColor("#EDF6F0"),
            cardColor = Color.parseColor("#DFEDE3"),
            strokeColor = Color.parseColor("#BCD8C4"),
            accentColor = Color.parseColor("#2D6A4F"),
            textPrimary = Color.parseColor("#1B3B2B"),
            textSecondary = Color.parseColor("#4D725D"),
            readerBg = Color.parseColor("#EDF6F0"),
            readerText = Color.parseColor("#1B3B2B"),
            highlightColor = Color.parseColor("#552D6A4F")
        )
    )

    fun getCurrentTheme(context: Context): ThemeModel {
        val currentId = AppSettings.getTheme(context)
        return THEMES.find { it.id == currentId } ?: THEMES[0]
    }

    fun getDarkThemes(): List<ThemeModel> = THEMES.filter { it.isDark }
    fun getLightThemes(): List<ThemeModel> = THEMES.filter { !it.isDark }
}
