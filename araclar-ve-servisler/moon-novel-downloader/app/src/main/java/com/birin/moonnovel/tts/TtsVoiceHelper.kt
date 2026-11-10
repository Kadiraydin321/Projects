package com.birin.moonnovel.tts

import android.app.AlertDialog
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import android.view.LayoutInflater
import android.widget.Button
import android.widget.ImageButton
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.birin.moonnovel.R
import com.birin.moonnovel.settings.AppSettings
import java.util.Locale

object TtsVoiceHelper {

    data class VoiceItem(
        val voice: Voice,
        val displayName: String,
        val isNetwork: Boolean
    )

    fun getAvailableVoices(tts: TextToSpeech?, languageCode: String): List<VoiceItem> {
        val allVoices = tts?.voices ?: return emptyList()
        val targetLang = languageCode.lowercase()

        val filtered = allVoices.filter { voice ->
            voice.locale.language.equals(targetLang, ignoreCase = true)
        }.sortedWith(compareBy({ it.isNetworkConnectionRequired }, { it.name }))

        var femaleIndex = 1
        var maleIndex = 1
        var generalIndex = 1

        return filtered.map { voice ->
            val isNetwork = voice.isNetworkConnectionRequired
            val netStr = if (isNetwork) "Çevrimiçi (Ağ)" else "Cihaz İçi (Yerel)"
            val nameLower = voice.name.lowercase()

            val genderDesc = when {
                nameLower.contains("female") || nameLower.contains("f0") || nameLower.contains("-f-") -> {
                    "Kadın Sesi #${femaleIndex++}"
                }
                nameLower.contains("male") || nameLower.contains("m0") || nameLower.contains("-m-") -> {
                    "Erkek Sesi #${maleIndex++}"
                }
                else -> {
                    "Ses Profili #${generalIndex++}"
                }
            }

            val cleanIdentifier = voice.name.substringAfterLast("/")
            val label = "$genderDesc • $netStr\n($cleanIdentifier)"
            VoiceItem(voice, label, isNetwork)
        }
    }

    fun applySettingsToTts(tts: TextToSpeech?, context: Context, forceLang: String? = null) {
        if (tts == null) return

        val langCode = forceLang ?: AppSettings.getTtsLanguage(context)
        val targetLocale = if (langCode == "en") Locale.US else Locale("tr", "TR")

        try {
            val res = tts.setLanguage(targetLocale)
            if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                val fallbackRes = tts.setLanguage(Locale(targetLocale.language))
                if (fallbackRes == TextToSpeech.LANG_MISSING_DATA || fallbackRes == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.language = Locale.getDefault()
                }
            }
        } catch (_: Exception) {}

        val speed = AppSettings.getTtsSpeed(context)
        tts.setSpeechRate(speed)

        val pitch = AppSettings.getTtsPitch(context)
        tts.setPitch(pitch)

        val savedVoiceName = AppSettings.getTtsVoice(context)
        if (savedVoiceName.isNotBlank()) {
            val matchingVoice = tts.voices?.find { it.name == savedVoiceName }
            if (matchingVoice != null) {
                try {
                    tts.voice = matchingVoice
                } catch (_: Exception) {}
            }
        }
    }

    fun showVoiceSelectionDialog(
        context: Context,
        tts: TextToSpeech?,
        onVoiceSelected: ((Voice) -> Unit)? = null
    ) {
        val view = LayoutInflater.from(context).inflate(R.layout.dialog_voice_select, null)
        val dialog = AlertDialog.Builder(context)
            .setView(view)
            .create()

        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val btnClose = view.findViewById<ImageButton>(R.id.btnVoiceDialogClose)
        val rgPitch = view.findViewById<RadioGroup>(R.id.rgPitch)
        val rbPitchLow = view.findViewById<RadioButton>(R.id.rbPitchLow)
        val rbPitchNormal = view.findViewById<RadioButton>(R.id.rbPitchNormal)
        val rbPitchHigh = view.findViewById<RadioButton>(R.id.rbPitchHigh)
        val rgVoiceList = view.findViewById<RadioGroup>(R.id.rgVoiceList)
        val btnVoiceTest = view.findViewById<Button>(R.id.btnVoiceTest)
        val btnVoiceApply = view.findViewById<Button>(R.id.btnVoiceApply)
        val tvVoiceSubtitle = view.findViewById<TextView>(R.id.tvVoiceSubtitle)

        btnClose.setOnClickListener { dialog.dismiss() }

        // Mevcut Pitch
        when (AppSettings.getTtsPitch(context)) {
            0.8f -> rbPitchLow.isChecked = true
            1.2f -> rbPitchHigh.isChecked = true
            else -> rbPitchNormal.isChecked = true
        }

        val langCode = AppSettings.getTtsLanguage(context)
        val availableVoices = getAvailableVoices(tts, langCode)
        val currentVoiceName = AppSettings.getTtsVoice(context)

        if (availableVoices.isEmpty()) {
            val emptyTv = TextView(context)
            emptyTv.text = "Cihazınızda $langCode dili için özel ses profili ayrıştırılamadı. Varsayılan sistem sesi kullanılacaktır."
            emptyTv.setTextColor(ContextCompat.getColor(context, R.color.text_muted))
            emptyTv.textSize = 13f
            emptyTv.setPadding(8, 16, 8, 16)
            rgVoiceList.addView(emptyTv)
        } else {
            val crimson = ContextCompat.getColor(context, R.color.crimson_red)
            val white = ContextCompat.getColor(context, R.color.text_white)
            val colorStateList = ColorStateList.valueOf(crimson)

            for (item in availableVoices) {
                val rb = RadioButton(context)
                rb.id = item.voice.name.hashCode()
                rb.tag = item.voice
                rb.text = item.displayName
                rb.setTextColor(white)
                rb.buttonTintList = colorStateList
                rb.textSize = 12f
                rb.setPadding(8, 12, 8, 12)

                if (item.voice.name == currentVoiceName) {
                    rb.isChecked = true
                }
                rgVoiceList.addView(rb)
            }

            if (rgVoiceList.checkedRadioButtonId == -1 && rgVoiceList.childCount > 0) {
                (rgVoiceList.getChildAt(0) as? RadioButton)?.isChecked = true
            }
        }

        // Test Dinleme
        btnVoiceTest.setOnClickListener {
            val selectedRb = rgVoiceList.findViewById<RadioButton>(rgVoiceList.checkedRadioButtonId)
            val testVoice = selectedRb?.tag as? Voice

            val testPitch = when {
                rbPitchLow.isChecked -> 0.8f
                rbPitchHigh.isChecked -> 1.2f
                else -> 1.0f
            }

            if (tts != null) {
                tts.setPitch(testPitch)
                if (testVoice != null) {
                    try {
                        tts.voice = testVoice
                    } catch (_: Exception) {}
                }
                val sampleText = if (langCode == "en") {
                    "Hello! Moon Novel reader voice is ready for you."
                } else {
                    "Merhaba! Moon Novel ile keyifli okumalar dilerim."
                }
                tts.speak(sampleText, TextToSpeech.QUEUE_FLUSH, null, "TEST_SAMPLE")
            } else {
                Toast.makeText(context, "TTS motoru henüz hazır değil.", Toast.LENGTH_SHORT).show()
            }
        }

        // Uygula & Kaydet
        btnVoiceApply.setOnClickListener {
            val selectedRb = rgVoiceList.findViewById<RadioButton>(rgVoiceList.checkedRadioButtonId)
            val selectedVoice = selectedRb?.tag as? Voice

            val selectedPitch = when {
                rbPitchLow.isChecked -> 0.8f
                rbPitchHigh.isChecked -> 1.2f
                else -> 1.0f
            }
            AppSettings.setTtsPitch(context, selectedPitch)

            if (selectedVoice != null) {
                AppSettings.setTtsVoice(context, selectedVoice.name)
                tts?.voice = selectedVoice
                onVoiceSelected?.invoke(selectedVoice)
            }
            tts?.setPitch(selectedPitch)

            Toast.makeText(context, "Ses profili başarıyla uygulandı! 🎧", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }

        dialog.show()
    }
}
