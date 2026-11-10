package com.birin.moonnovel.reader

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.text.Html
import android.text.SpannableString
import android.text.Spanned
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsetsController
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.birin.moonnovel.R
import com.birin.moonnovel.settings.AppSettings
import com.birin.moonnovel.theme.AppThemeManager
import com.birin.moonnovel.translation.TranslationEngine
import com.birin.moonnovel.tts.TtsVoiceHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.File

class ReaderActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var readerRootLayout: FrameLayout
    private lateinit var viewPagerReader: ViewPager2
    private lateinit var readerTopBar: LinearLayout
    private lateinit var readerBottomContainer: FrameLayout
    private lateinit var readerBottomBar: LinearLayout
    private lateinit var btnReaderBack: ImageButton
    private lateinit var tvReaderNovelTitle: TextView
    private lateinit var tvReaderChapterTitle: TextView
    private lateinit var btnTranslateChapter: Button
    private lateinit var btnToggleTtsPanel: ImageButton
    private lateinit var tvReaderPageIndicator: TextView
    private lateinit var btnQuickStartTts: TextView

    // 6 Tema (3 Karanlık + 3 Aydınlık) & Font Ayarları
    private lateinit var btnThemeDark: TextView
    private lateinit var btnThemeAmoled: TextView
    private lateinit var btnThemeMidnight: TextView
    private lateinit var btnThemeSepia: TextView
    private lateinit var btnThemeLightWhite: TextView
    private lateinit var btnThemeMint: TextView
    private lateinit var btnFontSmaller: TextView
    private lateinit var btnFontBigger: TextView

    // TTS Kontrolleri
    private lateinit var ttsControlPanel: LinearLayout
    private lateinit var tvTtsSentenceCounter: TextView
    private lateinit var btnTtsVoiceProfile: Button
    private lateinit var btnTtsClose: ImageButton
    private lateinit var tvTtsCurrentSentence: TextView

    private lateinit var tvTtsProgressStart: TextView
    private lateinit var sbTtsProgress: SeekBar
    private lateinit var tvTtsProgressEnd: TextView

    private lateinit var btnTtsPrev: ImageButton
    private lateinit var btnTtsPlayPause: ImageButton
    private lateinit var btnTtsNext: ImageButton

    private lateinit var btnTtsSpeed08: TextView
    private lateinit var btnTtsSpeed10: TextView
    private lateinit var btnTtsSpeed12: TextView
    private lateinit var btnTtsSpeed15: TextView
    private lateinit var btnTtsSpeed20: TextView

    private lateinit var btnTtsPitchLow: TextView
    private lateinit var btnTtsPitchNormal: TextView
    private lateinit var btnTtsPitchHigh: TextView

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private var tts: TextToSpeech? = null
    private var isTtsReady = false
    private var isTtsPlaying = false
    private var ttsSentenceIndex = 0
    private var ttsSentences = listOf<String>()
    private var ttsRate = 1.0f
    private var ttsPitch = 1.0f
    private var currentSpokenSentence: String? = null

    private var currentTheme = AppSettings.THEME_DARK
    private var currentFontSizeSp = 17f

    private var novelTitle = ""
    private var chapterTitle = ""
    private var chapterNumber = ""
    private var rawHtmlContent = ""
    private var fullPlainText = ""
    private val pages = mutableListOf<String>()
    private lateinit var pagerAdapter: ReaderPagerAdapter

    private var sessionStartTime = 0L
    private var audioManager: AudioManager? = null
    private var focusRequest: AudioFocusRequest? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reader)
        sessionStartTime = System.currentTimeMillis()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager

        try {
            initViews()
            initData()
            setupListeners()
            setupTts()
        } catch (e: Exception) {
            Toast.makeText(this, "Okuyucu açılırken hata oluştu: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun initViews() {
        readerRootLayout = findViewById(R.id.readerRootLayout)
        viewPagerReader = findViewById(R.id.viewPagerReader)
        readerTopBar = findViewById(R.id.readerTopBar)
        readerBottomContainer = findViewById(R.id.readerBottomContainer)
        readerBottomBar = findViewById(R.id.readerBottomBar)
        btnReaderBack = findViewById(R.id.btnReaderBack)
        tvReaderNovelTitle = findViewById(R.id.tvReaderNovelTitle)
        tvReaderChapterTitle = findViewById(R.id.tvReaderChapterTitle)
        btnTranslateChapter = findViewById(R.id.btnTranslateChapter)
        btnToggleTtsPanel = findViewById(R.id.btnToggleTtsPanel)
        tvReaderPageIndicator = findViewById(R.id.tvReaderPageIndicator)
        btnQuickStartTts = findViewById(R.id.btnQuickStartTts)

        btnThemeDark = findViewById(R.id.btnThemeDark)
        btnThemeAmoled = findViewById(R.id.btnThemeAmoled)
        btnThemeMidnight = findViewById(R.id.btnThemeMidnight)
        btnThemeSepia = findViewById(R.id.btnThemeSepia)
        btnThemeLightWhite = findViewById(R.id.btnThemeLightWhite)
        btnThemeMint = findViewById(R.id.btnThemeMint)
        btnFontSmaller = findViewById(R.id.btnFontSmaller)
        btnFontBigger = findViewById(R.id.btnFontBigger)

        ttsControlPanel = findViewById(R.id.ttsControlPanel)
        tvTtsSentenceCounter = findViewById(R.id.tvTtsSentenceCounter)
        btnTtsVoiceProfile = findViewById(R.id.btnTtsVoiceProfile)
        btnTtsClose = findViewById(R.id.btnTtsClose)
        tvTtsCurrentSentence = findViewById(R.id.tvTtsCurrentSentence)

        tvTtsProgressStart = findViewById(R.id.tvTtsProgressStart)
        sbTtsProgress = findViewById(R.id.sbTtsProgress)
        tvTtsProgressEnd = findViewById(R.id.tvTtsProgressEnd)

        btnTtsPrev = findViewById(R.id.btnTtsPrev)
        btnTtsPlayPause = findViewById(R.id.btnTtsPlayPause)
        btnTtsNext = findViewById(R.id.btnTtsNext)

        btnTtsSpeed08 = findViewById(R.id.btnTtsSpeed08)
        btnTtsSpeed10 = findViewById(R.id.btnTtsSpeed10)
        btnTtsSpeed12 = findViewById(R.id.btnTtsSpeed12)
        btnTtsSpeed15 = findViewById(R.id.btnTtsSpeed15)
        btnTtsSpeed20 = findViewById(R.id.btnTtsSpeed20)

        btnTtsPitchLow = findViewById(R.id.btnTtsPitchLow)
        btnTtsPitchNormal = findViewById(R.id.btnTtsPitchNormal)
        btnTtsPitchHigh = findViewById(R.id.btnTtsPitchHigh)
    }

    private fun initData() {
        novelTitle = intent.getStringExtra("EXTRA_NOVEL_TITLE") ?: "Novel"
        chapterTitle = intent.getStringExtra("EXTRA_CHAPTER_TITLE") ?: "Bölüm"
        chapterNumber = intent.getStringExtra("EXTRA_CHAPTER_NUMBER") ?: "1"
        rawHtmlContent = intent.getStringExtra("EXTRA_CHAPTER_HTML") ?: ""

        val filePath = intent.getStringExtra("EXTRA_FILE_PATH")
        if (filePath != null) {
            val file = File(filePath)
            if (file.exists()) {
                rawHtmlContent = file.readText()
            }
        }

        tvReaderNovelTitle.text = novelTitle
        tvReaderChapterTitle.text = chapterTitle

        fullPlainText = Html.fromHtml(rawHtmlContent, Html.FROM_HTML_MODE_LEGACY).toString().trim()
        currentTheme = AppSettings.getTheme(this)
        currentFontSizeSp = AppSettings.getFontSize(this)
        ttsRate = AppSettings.getTtsSpeed(this)
        ttsPitch = AppSettings.getTtsPitch(this)

        paginateContent(fullPlainText)

        pagerAdapter = ReaderPagerAdapter(pages)
        viewPagerReader.adapter = pagerAdapter
        viewPagerReader.offscreenPageLimit = 1

        applyTheme(currentTheme)
        updatePageIndicator(0)

        viewPagerReader.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                updatePageIndicator(position)
                if (!isTtsPlaying && ttsControlPanel.visibility == View.VISIBLE) {
                    alignTtsSentenceToCurrentPage()
                    updateSentenceDisplay()
                }
            }
        })

        prepareTtsSentences()
        updateVoiceButtonLabel()
        refreshSpeedChips()
        refreshPitchChips()
    }

    private fun prepareTtsSentences() {
        // Gelişmiş akıcı TTS cümle ayırıcı: Kısaltmalardaki (Mr., Dr., vb.) noktaları cümle sonu sanmaz, sahne ayraçlarını temizler
        val cleanedText = fullPlainText
            .replace(Regex("^[\\s*\\-_=~.]{3,}$", RegexOption.MULTILINE), "")
            .replace(Regex("[\u200B\u200C\u200D\uFEFF]"), "")

        val sentenceSplitRegex = Regex("(?<!\\b(Mr|Mrs|Ms|Dr|Prof|Capt|Gen|Lt|Col|Sgt|vs|vol|ch|pt|bk)\\.)(?<=[.!?\\n])\\s+")
        ttsSentences = cleanedText.split(sentenceSplitRegex)
            .map { it.trim() }
            .filter { it.length > 2 && !it.matches(Regex("^[\\s*\\-_=~.]{2,}$")) }

        if (ttsSentences.isEmpty() && fullPlainText.isNotBlank()) {
            ttsSentences = listOf(fullPlainText)
        }
        sbTtsProgress.max = (ttsSentences.size - 1).coerceAtLeast(0)
        tvTtsProgressEnd.text = "${ttsSentences.size.coerceAtLeast(1)}"
    }

    private fun paginateContent(text: String) {
        pages.clear()
        val charPerPage = (950 * (17f / currentFontSizeSp)).toInt().coerceIn(400, 2000)
        var start = 0
        while (start < text.length) {
            var end = (start + charPerPage).coerceAtMost(text.length)
            if (end < text.length) {
                val lastBreak = text.lastIndexOf('\n', end)
                val lastSpace = text.lastIndexOf(' ', end)
                if (lastBreak > start + (charPerPage / 2)) {
                    end = lastBreak + 1
                } else if (lastSpace > start + (charPerPage / 2)) {
                    end = lastSpace + 1
                }
            }
            pages.add(text.substring(start, end).trim())
            start = end
        }
        if (pages.isEmpty()) {
            pages.add(text)
        }
    }

    private fun updatePageIndicator(position: Int) {
        val total = pages.size.coerceAtLeast(1)
        val current = position + 1
        tvReaderPageIndicator.text = "Sayfa $current / $total"
    }

    private fun setupListeners() {
        btnReaderBack.setOnClickListener { finish() }

        // Çeviri butonu
        btnTranslateChapter.setOnClickListener {
            btnTranslateChapter.isEnabled = false
            btnTranslateChapter.text = "Çevriliyor..."
            scope.launch {
                val translated = TranslationEngine.translateEnToTr(fullPlainText)
                fullPlainText = translated
                paginateContent(fullPlainText)
                if (::pagerAdapter.isInitialized) {
                    pagerAdapter.notifyDataSetChanged()
                }
                updatePageIndicator(viewPagerReader.currentItem)
                prepareTtsSentences()
                btnTranslateChapter.text = "Orijinal / TR"
                btnTranslateChapter.isEnabled = true
                Toast.makeText(this@ReaderActivity, "Türkçeye çevrildi! 🎉", Toast.LENGTH_SHORT).show()
            }
        }

        // 6 Farklı Okuma Teması (3 Karanlık + 3 Aydınlık)
        btnThemeDark.setOnClickListener { applyTheme(AppSettings.THEME_DARK) }
        btnThemeAmoled.setOnClickListener { applyTheme(AppSettings.THEME_AMOLED) }
        btnThemeMidnight.setOnClickListener { applyTheme(AppSettings.THEME_MIDNIGHT) }
        btnThemeSepia.setOnClickListener { applyTheme(AppSettings.THEME_SEPIA) }
        btnThemeLightWhite.setOnClickListener { applyTheme(AppSettings.THEME_LIGHT_WHITE) }
        btnThemeMint.setOnClickListener { applyTheme(AppSettings.THEME_MINT) }

        // Font boyutu
        btnFontSmaller.setOnClickListener {
            if (currentFontSizeSp > 12f) {
                currentFontSizeSp -= 1.5f
                AppSettings.setFontSize(this, currentFontSizeSp)
                paginateContent(fullPlainText)
                if (::pagerAdapter.isInitialized) {
                    pagerAdapter.notifyDataSetChanged()
                }
            }
        }
        btnFontBigger.setOnClickListener {
            if (currentFontSizeSp < 28f) {
                currentFontSizeSp += 1.5f
                AppSettings.setFontSize(this, currentFontSizeSp)
                paginateContent(fullPlainText)
                if (::pagerAdapter.isInitialized) {
                    pagerAdapter.notifyDataSetChanged()
                }
            }
        }

        // Alt bardan hızlı başlat
        btnQuickStartTts.setOnClickListener {
            showTtsPanel()
            playTts()
        }

        // TTS Panelini Aç / Kapat
        btnToggleTtsPanel.setOnClickListener {
            if (ttsControlPanel.visibility == View.VISIBLE) {
                hideTtsPanel()
            } else {
                showTtsPanel()
            }
        }

        btnTtsClose.setOnClickListener {
            hideTtsPanel()
        }

        // Ses Seçimi Butonu (TTS Paneli İçi)
        btnTtsVoiceProfile.setOnClickListener {
            TtsVoiceHelper.showVoiceSelectionDialog(this, tts) {
                updateVoiceButtonLabel()
                if (isTtsPlaying) {
                    speakCurrentSentence()
                }
            }
        }

        // Oynat / Duraklat
        btnTtsPlayPause.setOnClickListener {
            if (isTtsPlaying) pauseTts() else playTts()
        }

        btnTtsNext.setOnClickListener {
            if (ttsSentenceIndex < ttsSentences.size - 1) {
                ttsSentenceIndex++
                speakCurrentSentence()
            }
        }

        btnTtsPrev.setOnClickListener {
            if (ttsSentenceIndex > 0) {
                ttsSentenceIndex--
                speakCurrentSentence()
            }
        }

        // Cümle Kaydırma SeekBar'ı (Scrubbing)
        sbTtsProgress.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser && progress in ttsSentences.indices) {
                    ttsSentenceIndex = progress
                    updateSentenceDisplay()
                    highlightSentenceAndFlipPage(ttsSentenceIndex)
                }
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {}

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                if (isTtsPlaying) {
                    speakCurrentSentence()
                }
            }
        })

        // Hız Kontrolleri
        btnTtsSpeed08.setOnClickListener { setTtsSpeed(0.8f) }
        btnTtsSpeed10.setOnClickListener { setTtsSpeed(1.0f) }
        btnTtsSpeed12.setOnClickListener { setTtsSpeed(1.2f) }
        btnTtsSpeed15.setOnClickListener { setTtsSpeed(1.5f) }
        btnTtsSpeed20.setOnClickListener { setTtsSpeed(2.0f) }

        // Ton (Pitch) Kontrolleri
        btnTtsPitchLow.setOnClickListener { setTtsPitch(0.8f) }
        btnTtsPitchNormal.setOnClickListener { setTtsPitch(1.0f) }
        btnTtsPitchHigh.setOnClickListener { setTtsPitch(1.2f) }
    }

    private fun showTtsPanel() {
        readerBottomBar.visibility = View.GONE
        ttsControlPanel.visibility = View.VISIBLE
        btnToggleTtsPanel.setColorFilter(ContextCompat.getColor(this, R.color.crimson_red))

        // Alttaki metnin panel altında kalmaması için padding'i dinamik arttır
        viewPagerReader.setPadding(0, dpToPx(58), 0, dpToPx(190))

        alignTtsSentenceToCurrentPage()
        updateSentenceDisplay()
        updateVoiceButtonLabel()
    }

    private fun hideTtsPanel() {
        pauseTts()
        currentSpokenSentence = null
        if (::pagerAdapter.isInitialized) {
            pagerAdapter.notifyDataSetChanged()
        }

        ttsControlPanel.visibility = View.GONE
        readerBottomBar.visibility = View.VISIBLE
        btnToggleTtsPanel.setColorFilter(ContextCompat.getColor(this, R.color.crimson_light))

        // Normal okuma padding'ine dön
        viewPagerReader.setPadding(0, dpToPx(58), 0, dpToPx(58))
    }

    private fun alignTtsSentenceToCurrentPage() {
        if (ttsSentences.isEmpty()) return
        val currentPageText = pages.getOrNull(viewPagerReader.currentItem) ?: return

        val foundIndex = ttsSentences.indexOfFirst { sentence ->
            sentence.length > 5 && currentPageText.contains(sentence.take(20))
        }
        if (foundIndex >= 0) {
            ttsSentenceIndex = foundIndex
        }
    }

    private fun updateVoiceButtonLabel() {
        val savedVoice = AppSettings.getTtsVoice(this)
        if (savedVoice.isNotBlank()) {
            val voiceItem = TtsVoiceHelper.getAvailableVoices(tts, AppSettings.getTtsLanguage(this)).find { it.voice.name == savedVoice }
            if (voiceItem != null) {
                val shortName = voiceItem.displayName.substringBefore(" •")
                btnTtsVoiceProfile.text = "🎧 $shortName"
            } else {
                btnTtsVoiceProfile.text = "🎧 Ses Değiştir"
            }
        } else {
            btnTtsVoiceProfile.text = "🎧 Ses Seç"
        }
    }

    private fun applyTheme(theme: String) {
        currentTheme = theme
        AppSettings.setTheme(this, theme)
        val themeModel = AppThemeManager.THEMES.find { it.id == theme } ?: AppThemeManager.THEMES[0]

        readerRootLayout.setBackgroundColor(themeModel.readerBg)
        window.statusBarColor = themeModel.bgColor
        window.navigationBarColor = themeModel.bgColor

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.setSystemBarsAppearance(
                if (!themeModel.isDark) WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS else 0,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            @Suppress("DEPRECATION")
            var flags = window.decorView.systemUiVisibility
            flags = if (!themeModel.isDark) {
                flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            } else {
                flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            }
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = flags
        }

        if (::pagerAdapter.isInitialized) {
            pagerAdapter.notifyDataSetChanged()
        }
    }

    private fun setTtsSpeed(speed: Float) {
        ttsRate = speed
        AppSettings.setTtsSpeed(this, speed)
        tts?.setSpeechRate(speed)
        refreshSpeedChips()
    }

    private fun refreshSpeedChips() {
        val activeBg = ContextCompat.getDrawable(this, R.drawable.bg_tts_chip_active)
        val inactiveBg = ContextCompat.getDrawable(this, R.drawable.bg_tts_chip_inactive)
        val activeColor = Color.WHITE
        val inactiveColor = ContextCompat.getColor(this, R.color.text_muted)

        val map = mapOf(
            btnTtsSpeed08 to 0.8f,
            btnTtsSpeed10 to 1.0f,
            btnTtsSpeed12 to 1.2f,
            btnTtsSpeed15 to 1.5f,
            btnTtsSpeed20 to 2.0f
        )

        for ((view, value) in map) {
            val isSelected = Math.abs(ttsRate - value) < 0.05f
            view.background = if (isSelected) activeBg else inactiveBg
            view.setTextColor(if (isSelected) activeColor else inactiveColor)
            view.setTypeface(null, if (isSelected) Typeface.BOLD else Typeface.NORMAL)
        }
    }

    private fun setTtsPitch(pitch: Float) {
        ttsPitch = pitch
        AppSettings.setTtsPitch(this, pitch)
        tts?.setPitch(pitch)
        refreshPitchChips()
    }

    private fun refreshPitchChips() {
        val activeBg = ContextCompat.getDrawable(this, R.drawable.bg_tts_chip_active)
        val inactiveBg = ContextCompat.getDrawable(this, R.drawable.bg_tts_chip_inactive)
        val activeColor = Color.WHITE
        val inactiveColor = ContextCompat.getColor(this, R.color.text_muted)

        val map = mapOf(
            btnTtsPitchLow to 0.8f,
            btnTtsPitchNormal to 1.0f,
            btnTtsPitchHigh to 1.2f
        )

        for ((view, value) in map) {
            val isSelected = Math.abs(ttsPitch - value) < 0.05f
            view.background = if (isSelected) activeBg else inactiveBg
            view.setTextColor(if (isSelected) activeColor else inactiveColor)
            view.setTypeface(null, if (isSelected) Typeface.BOLD else Typeface.NORMAL)
        }
    }

    private fun setupTts() {
        tts = TextToSpeech(this, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsReady = true
            TtsVoiceHelper.applySettingsToTts(tts, this)
            updateVoiceButtonLabel()

            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    runOnUiThread {
                        highlightSentenceAndFlipPage(ttsSentenceIndex)
                    }
                }

                override fun onDone(utteranceId: String?) {
                    runOnUiThread {
                        if (isTtsPlaying) {
                            if (ttsSentenceIndex < ttsSentences.size - 1) {
                                ttsSentenceIndex++
                                speakCurrentSentence()
                            } else {
                                pauseTts()
                                Toast.makeText(this@ReaderActivity, "Bölüm sonuna ulaşıldı. 📖", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                }

                override fun onError(utteranceId: String?) {
                    handleTtsError()
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    handleTtsError()
                }
            })
        } else {
            isTtsReady = false
            Toast.makeText(this, "Cihazın ses motoru başlatılamadı.", Toast.LENGTH_LONG).show()
        }
    }

    private fun handleTtsError() {
        runOnUiThread {
            if (isTtsPlaying && ttsSentenceIndex < ttsSentences.size - 1) {
                ttsSentenceIndex++
                speakCurrentSentence()
            } else {
                pauseTts()
            }
        }
    }

    private fun requestAudioFocus(): Boolean {
        if (audioManager == null) return true
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val playbackAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(playbackAttributes)
                .build()
            focusRequest = request
            audioManager?.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            audioManager?.requestAudioFocus(
                null,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    private fun abandonAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager?.abandonAudioFocus(null)
        }
    }

    private fun playTts() {
        if (ttsSentences.isEmpty()) return
        if (!isTtsReady) {
            Toast.makeText(this, "Ses motoru hazırlanıyor, lütfen bekleyin...", Toast.LENGTH_SHORT).show()
            return
        }
        requestAudioFocus()
        isTtsPlaying = true
        btnTtsPlayPause.setImageResource(android.R.drawable.ic_media_pause)
        speakCurrentSentence()
    }

    private fun pauseTts() {
        isTtsPlaying = false
        btnTtsPlayPause.setImageResource(android.R.drawable.ic_media_play)
        tts?.stop()
        abandonAudioFocus()
    }

    private fun speakCurrentSentence() {
        if (ttsSentenceIndex in ttsSentences.indices) {
            val sentence = ttsSentences[ttsSentenceIndex].trim()
            updateSentenceDisplay()

            if (sentence.isBlank()) {
                if (ttsSentenceIndex < ttsSentences.size - 1) {
                    ttsSentenceIndex++
                    speakCurrentSentence()
                }
                return
            }

            tts?.speak(sentence, TextToSpeech.QUEUE_FLUSH, null, "UTT_${System.currentTimeMillis()}")
            highlightSentenceAndFlipPage(ttsSentenceIndex)
        }
    }

    private fun updateSentenceDisplay() {
        if (ttsSentenceIndex in ttsSentences.indices) {
            val sentence = ttsSentences[ttsSentenceIndex]
            tvTtsCurrentSentence.text = sentence
            val total = ttsSentences.size.coerceAtLeast(1)
            val current = ttsSentenceIndex + 1
            val pct = (current * 100) / total
            tvTtsSentenceCounter.text = "• Cümle $current / $total (%$pct)"
            tvTtsProgressStart.text = "$current"
            tvTtsProgressEnd.text = "$total"
            sbTtsProgress.progress = ttsSentenceIndex
        }
    }

    private fun highlightSentenceAndFlipPage(index: Int) {
        val sentence = ttsSentences.getOrNull(index) ?: return
        currentSpokenSentence = sentence

        val targetSnippet = sentence.take(24)
        val targetPage = pages.indexOfFirst { it.contains(targetSnippet) }
        if (targetPage >= 0 && viewPagerReader.currentItem != targetPage) {
            viewPagerReader.setCurrentItem(targetPage, true)
        }

        if (::pagerAdapter.isInitialized) {
            pagerAdapter.notifyDataSetChanged()
        }
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    override fun onDestroy() {
        pauseTts()
        tts?.shutdown()
        val durationSec = (System.currentTimeMillis() - sessionStartTime) / 1000
        val wordCount = fullPlainText.split(Regex("\\s+")).size
        com.birin.moonnovel.stats.ReadingStatsManager.addReadingSession(this, wordCount, durationSec)
        super.onDestroy()
    }

    // ViewPager2 Adapter
    inner class ReaderPagerAdapter(private val items: List<String>) : RecyclerView.Adapter<ReaderPagerAdapter.PageViewHolder>() {

        inner class PageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val tvContent: TextView = itemView.findViewById(R.id.tvReaderPageContent)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PageViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_reader_page, parent, false)
            return PageViewHolder(view)
        }

        override fun onBindViewHolder(holder: PageViewHolder, position: Int) {
            val pageText = items[position]
            holder.tvContent.textSize = currentFontSizeSp

            val themeModel = AppThemeManager.THEMES.find { it.id == currentTheme } ?: AppThemeManager.THEMES[0]
            holder.itemView.setBackgroundColor(themeModel.readerBg)

            // Cümle Vurgulama
            val activeSentence = currentSpokenSentence
            if (!activeSentence.isNullOrBlank() && pageText.contains(activeSentence)) {
                val spannable = SpannableString(pageText)
                val start = pageText.indexOf(activeSentence)
                if (start >= 0) {
                    val end = (start + activeSentence.length).coerceAtMost(pageText.length)
                    spannable.setSpan(
                        BackgroundColorSpan(themeModel.highlightColor),
                        start,
                        end,
                        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
                    )
                    spannable.setSpan(
                        ForegroundColorSpan(if (themeModel.isDark) Color.WHITE else Color.BLACK),
                        start,
                        end,
                        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
                    )
                }
                holder.tvContent.text = spannable
            } else {
                holder.tvContent.text = pageText
            }

            holder.tvContent.setTextColor(themeModel.readerText)

            // Sayfaya tek dokunulduğunda üst ve alt panelleri senkronize aç/kapat
            holder.itemView.setOnClickListener {
                val isVisible = readerTopBar.visibility == View.VISIBLE
                val targetVis = if (isVisible) View.GONE else View.VISIBLE
                readerTopBar.visibility = targetVis
                readerBottomContainer.visibility = targetVis
            }
        }

        override fun getItemCount(): Int = items.size
    }
}
