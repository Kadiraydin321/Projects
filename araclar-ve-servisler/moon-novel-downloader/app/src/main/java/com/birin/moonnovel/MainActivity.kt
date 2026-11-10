package com.birin.moonnovel

import android.animation.ValueAnimator
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsetsController
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.birin.moonnovel.reader.ReaderActivity
import com.birin.moonnovel.settings.AppSettings
import com.birin.moonnovel.sources.ChapterSourceItem
import com.birin.moonnovel.sources.NovelBinAdapter
import com.birin.moonnovel.sources.NovelGecesiAdapter
import com.birin.moonnovel.sources.NovelSourceAdapter
import com.birin.moonnovel.sources.NovelSourceItem
import com.birin.moonnovel.sources.WuxiaWorldEnAdapter
import com.birin.moonnovel.theme.AppThemeManager
import com.birin.moonnovel.updater.AppUpdateManager
import com.birin.moonnovel.updater.UpdateStatus
import kotlinx.coroutines.*
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID
import java.util.zip.CRC32
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

data class SavedArchive(val file: File, val title: String, val sizeStr: String)

class MainActivity : AppCompatActivity() {

    private lateinit var rootLayout: LinearLayout
    private lateinit var topBar: LinearLayout
    private lateinit var btnBack: ImageButton
    private lateinit var btnToggleLayout: ImageButton
    private lateinit var btnSettings: ImageButton
    private lateinit var btnLibrary: ImageButton
    private lateinit var tvHeaderTitle: TextView
    private lateinit var tvHeaderSub: TextView

    // Ekran kapsayıcıları
    private lateinit var viewSearchAndNovels: LinearLayout
    private lateinit var viewChapters: LinearLayout
    private lateinit var viewLibrary: LinearLayout
    private lateinit var heroSearchSection: LinearLayout
    private lateinit var tvHeroTitle: TextView
    private lateinit var tvHeroSubtitle: TextView
    private lateinit var tvNovelsHeader: TextView
    private lateinit var emptySearchState: LinearLayout
    private lateinit var emptyLibraryState: LinearLayout
    private lateinit var tvEmptySubtitle: TextView

    // Kaynak filtreleme barları
    private lateinit var tabSourceAll: TextView
    private lateinit var tabSourceTR: TextView
    private lateinit var tabSourceEN: TextView

    // Bölüm filtreleme ve sıralama
    private lateinit var etFilterChapters: EditText
    private lateinit var btnSortChapters: ImageButton
    private var isSortAscending = true

    private lateinit var etSearch: EditText
    private lateinit var btnSearch: Button
    private lateinit var bottomStatusCard: LinearLayout
    private lateinit var progressBar: ProgressBar
    private var mainTts: android.speech.tts.TextToSpeech? = null
    private lateinit var tvStatus: TextView

    private lateinit var lvNovels: ListView
    private lateinit var lvChapters: ListView
    private lateinit var gvChapters: GridView
    private lateinit var lvDownloads: ListView

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private lateinit var updateManager: AppUpdateManager

    // Çoklu Kaynak Adaptörleri (TR: NovelGecesi, EN: WuxiaWorld, NovelBin)
    private val trAdapter = NovelGecesiAdapter()
    private val enAdapter = WuxiaWorldEnAdapter()
    private val novelBinAdapter = NovelBinAdapter()
    private val allAdapters = listOf<NovelSourceAdapter>(trAdapter, enAdapter, novelBinAdapter)
    private var activeSourceFilter: String = "ALL" // "ALL", "TR", "EN"

    private var selectedNovel: NovelSourceItem? = null
    private val allNovelList = mutableListOf<NovelSourceItem>()
    private val displayedNovelList = mutableListOf<NovelSourceItem>()

    private val fullChapterList = mutableListOf<ChapterSourceItem>()
    private val filteredChapterList = mutableListOf<ChapterSourceItem>()
    private val archiveList = mutableListOf<SavedArchive>()

    private lateinit var novelAdapter: BaseAdapter
    private lateinit var chapterListAdapter: BaseAdapter
    private lateinit var chapterGridAdapter: BaseAdapter
    private lateinit var archiveAdapter: BaseAdapter

    private var currentMode = "search" // "search", "chapters", "library"
    private var isGridMode = true
    private var isSearchExpanded = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        updateManager = AppUpdateManager(this)

        initViews()
        setupAdapters()
        setupListeners()
        observeUpdates()

        // Kaydedilmiş varsayılan kaynak sekmesini ve temayı uygula
        val defaultSrc = com.birin.moonnovel.settings.AppSettings.getDefaultSource(this)
        selectSourceTab(defaultSrc)
        applyCurrentThemeToMain()

        // Açılışta sessiz arka plan güncelleme kontrolü
        updateManager.checkForUpdates(isManual = false)
    }

    private fun initViews() {
        rootLayout = findViewById(R.id.rootLayout)
        topBar = findViewById(R.id.topBar)
        btnBack = findViewById(R.id.btnBack)
        btnToggleLayout = findViewById(R.id.btnToggleLayout)
        btnSettings = findViewById(R.id.btnSettings)
        btnLibrary = findViewById(R.id.btnLibrary)
        tvHeaderTitle = findViewById(R.id.tvHeaderTitle)
        tvHeaderSub = findViewById(R.id.tvHeaderSub)

        viewSearchAndNovels = findViewById(R.id.viewSearchAndNovels)
        viewChapters = findViewById(R.id.viewChapters)
        viewLibrary = findViewById(R.id.viewLibrary)
        heroSearchSection = findViewById(R.id.heroSearchSection)
        tvHeroTitle = findViewById(R.id.tvHeroTitle)
        tvHeroSubtitle = findViewById(R.id.tvHeroSubtitle)
        tvNovelsHeader = findViewById(R.id.tvNovelsHeader)
        emptySearchState = findViewById(R.id.emptySearchState)
        emptyLibraryState = findViewById(R.id.emptyLibraryState)
        tvEmptySubtitle = findViewById(R.id.tvEmptySubtitle)

        tabSourceAll = findViewById(R.id.tabSourceAll)
        tabSourceTR = findViewById(R.id.tabSourceTR)
        tabSourceEN = findViewById(R.id.tabSourceEN)

        etFilterChapters = findViewById(R.id.etFilterChapters)
        btnSortChapters = findViewById(R.id.btnSortChapters)

        etSearch = findViewById(R.id.etSearch)
        btnSearch = findViewById(R.id.btnSearch)
        bottomStatusCard = findViewById(R.id.bottomStatusCard)
        progressBar = findViewById(R.id.progressBar)
        tvStatus = findViewById(R.id.tvStatus)

        lvNovels = findViewById(R.id.lvNovels)
        lvChapters = findViewById(R.id.lvChapters)
        gvChapters = findViewById(R.id.gvChapters)
        lvDownloads = findViewById(R.id.lvDownloads)
    }

    // Statik ViewHolder yapıları (Yüksek hızlı kaydırma ve sıfır findViewById maliyeti)
    private class NovelViewHolder(
        val titleView: TextView,
        val authorView: TextView,
        val badge: TextView
    )

    private class ChapterGridViewHolder(
        val numView: TextView,
        val titleView: TextView
    )

    private class ChapterListViewHolder(
        val numView: TextView,
        val titleView: TextView
    )

    private class ArchiveViewHolder(
        val titleView: TextView,
        val sizeView: TextView
    )

    private fun setupAdapters() {
        // 1. Novel Listesi Adapter (ViewHolder optimizasyonlu)
        novelAdapter = object : BaseAdapter() {
            override fun getCount(): Int = displayedNovelList.size
            override fun getItem(position: Int): Any = displayedNovelList[position]
            override fun getItemId(position: Int): Long = position.toLong()

            override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
                val view: View
                val holder: NovelViewHolder
                if (convertView == null) {
                    view = LayoutInflater.from(this@MainActivity).inflate(R.layout.item_novel_card, parent, false)
                    holder = NovelViewHolder(
                        titleView = view.findViewById(R.id.tvNovelItemTitle),
                        authorView = view.findViewById(R.id.tvNovelItemAuthor),
                        badge = view.findViewById(R.id.tvNovelItemSourceBadge)
                    )
                    view.tag = holder
                } else {
                    view = convertView
                    holder = view.tag as NovelViewHolder
                }

                val item = displayedNovelList[position]
                val currentTheme = AppThemeManager.getCurrentTheme(this@MainActivity)
                holder.titleView.text = item.name
                holder.titleView.setTextColor(currentTheme.textPrimary)
                holder.authorView.text = if (item.author.isNotEmpty()) item.author else "Yazar Belirtilmemiş"
                holder.authorView.setTextColor(currentTheme.textSecondary)

                holder.badge.text = item.sourceLanguage
                if (item.sourceLanguage == "TR") {
                    holder.badge.setBackgroundResource(R.drawable.bg_badge_red)
                } else {
                    holder.badge.setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.card_stroke))
                }
                return view
            }
        }
        lvNovels.adapter = novelAdapter

        // 2. Bölüm Grid Adapter (ViewHolder optimizasyonlu)
        chapterGridAdapter = object : BaseAdapter() {
            override fun getCount(): Int = filteredChapterList.size
            override fun getItem(position: Int): Any = filteredChapterList[position]
            override fun getItemId(position: Int): Long = position.toLong()

            override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
                val view: View
                val holder: ChapterGridViewHolder
                if (convertView == null) {
                    view = LayoutInflater.from(this@MainActivity).inflate(R.layout.item_chapter_grid, parent, false)
                    holder = ChapterGridViewHolder(
                        numView = view.findViewById(R.id.tvCardChapterNum),
                        titleView = view.findViewById(R.id.tvCardChapterTitle)
                    )
                    view.tag = holder
                } else {
                    view = convertView
                    holder = view.tag as ChapterGridViewHolder
                }

                val item = filteredChapterList[position]
                val currentTheme = AppThemeManager.getCurrentTheme(this@MainActivity)
                holder.numView.text = "Bölüm ${item.number}"
                val clean = item.title.trim()
                val isGeneric = clean.isEmpty() || clean.equals("Bölüm ${item.number}", ignoreCase = true) || clean == item.number

                holder.titleView.text = if (isGeneric) "${item.number}. Bölüm" else clean
                holder.titleView.setTextColor(currentTheme.textPrimary)
                return view
            }
        }
        gvChapters.adapter = chapterGridAdapter

        // 3. Bölüm Liste Adapter (ViewHolder optimizasyonlu)
        chapterListAdapter = object : BaseAdapter() {
            override fun getCount(): Int = filteredChapterList.size
            override fun getItem(position: Int): Any = filteredChapterList[position]
            override fun getItemId(position: Int): Long = position.toLong()

            override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
                val view: View
                val holder: ChapterListViewHolder
                if (convertView == null) {
                    view = LayoutInflater.from(this@MainActivity).inflate(R.layout.item_chapter_list, parent, false)
                    holder = ChapterListViewHolder(
                        numView = view.findViewById(R.id.tvListChapterNum),
                        titleView = view.findViewById(R.id.tvListChapterTitle)
                    )
                    view.tag = holder
                } else {
                    view = convertView
                    holder = view.tag as ChapterListViewHolder
                }

                val item = filteredChapterList[position]
                val currentTheme = AppThemeManager.getCurrentTheme(this@MainActivity)
                val clean = item.title.trim()
                val isGeneric = clean.isEmpty() || clean.equals("Bölüm ${item.number}", ignoreCase = true) || clean == item.number

                if (isGeneric) {
                    holder.numView.text = "Bölüm ${item.number}"
                    holder.titleView.visibility = View.VISIBLE
                    holder.titleView.text = ""
                } else {
                    holder.numView.text = "Bölüm ${item.number}:"
                    holder.titleView.visibility = View.VISIBLE
                    holder.titleView.text = clean
                    holder.titleView.setTextColor(currentTheme.textPrimary)
                }
                return view
            }
        }
        lvChapters.adapter = chapterListAdapter

        // 4. İndirilen Arşiv Deposu Adapter (ViewHolder optimizasyonlu)
        archiveAdapter = object : BaseAdapter() {
            override fun getCount(): Int = archiveList.size
            override fun getItem(position: Int): Any = archiveList[position]
            override fun getItemId(position: Int): Long = position.toLong()

            override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
                val view: View
                val holder: ArchiveViewHolder
                if (convertView == null) {
                    view = LayoutInflater.from(this@MainActivity).inflate(R.layout.item_archive_card, parent, false)
                    holder = ArchiveViewHolder(
                        titleView = view.findViewById(R.id.tvArchiveTitle),
                        sizeView = view.findViewById(R.id.tvArchiveSize)
                    )
                    view.tag = holder
                } else {
                    view = convertView
                    holder = view.tag as ArchiveViewHolder
                }

                val item = archiveList[position]
                val currentTheme = AppThemeManager.getCurrentTheme(this@MainActivity)
                holder.titleView.text = item.title
                holder.titleView.setTextColor(currentTheme.textPrimary)
                holder.sizeView.text = "ZIP Arşivi • ${item.sizeStr}"
                holder.sizeView.setTextColor(currentTheme.textSecondary)
                return view
            }
        }
        lvDownloads.adapter = archiveAdapter
    }

    private fun setupListeners() {
        btnSearch.setOnClickListener {
            val query = etSearch.text.toString().trim()
            if (query.isNotEmpty()) {
                searchNovels(query)
            }
        }

        btnBack.setOnClickListener {
            showNovelsView()
        }

        btnToggleLayout.setOnClickListener {
            isGridMode = !isGridMode
            updateChapterViewMode()
        }

        btnLibrary.setOnClickListener {
            if (currentMode == "library") {
                showNovelsView()
            } else {
                showLibraryView()
            }
        }

        btnSettings.setOnClickListener {
            showAppSettingsDialog()
        }

        // Kaynak Tab Butonları
        tabSourceAll.setOnClickListener { selectSourceTab("ALL") }
        tabSourceTR.setOnClickListener { selectSourceTab("TR") }
        tabSourceEN.setOnClickListener { selectSourceTab("EN") }

        // Bölüm filtreleme anlık arama
        etFilterChapters.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterChapters(s?.toString() ?: "")
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // Sıralama Butonu (1..N veya N..1)
        btnSortChapters.setOnClickListener {
            isSortAscending = !isSortAscending
            applySortChapters()
        }

        lvNovels.setOnItemClickListener { _, _, position, _ ->
            selectedNovel = displayedNovelList[position]
            loadAllChapters(selectedNovel!!)
        }

        gvChapters.setOnItemClickListener { _, _, position, _ ->
            val novel = selectedNovel ?: return@setOnItemClickListener
            downloadAndProcessChapter(novel, filteredChapterList[position])
        }

        lvChapters.setOnItemClickListener { _, _, position, _ ->
            val novel = selectedNovel ?: return@setOnItemClickListener
            downloadAndProcessChapter(novel, filteredChapterList[position])
        }

        lvDownloads.setOnItemClickListener { _, _, position, _ ->
            openSavedArchiveInReader(archiveList[position].file)
        }
    }

    private fun selectSourceTab(tab: String) {
        activeSourceFilter = tab
        tabSourceAll.isSelected = (tab == "ALL")
        tabSourceTR.isSelected = (tab == "TR")
        tabSourceEN.isSelected = (tab == "EN")

        val white = ContextCompat.getColor(this, R.color.text_white)
        val muted = ContextCompat.getColor(this, R.color.text_muted)

        tabSourceAll.setTextColor(if (tab == "ALL") white else muted)
        tabSourceTR.setTextColor(if (tab == "TR") white else muted)
        tabSourceEN.setTextColor(if (tab == "EN") white else muted)

        applySourceFilter()
    }

    private fun applySourceFilter() {
        displayedNovelList.clear()
        when (activeSourceFilter) {
            "TR" -> displayedNovelList.addAll(allNovelList.filter { it.sourceLanguage == "TR" })
            "EN" -> displayedNovelList.addAll(allNovelList.filter { it.sourceLanguage == "EN" })
            else -> displayedNovelList.addAll(allNovelList)
        }
        novelAdapter.notifyDataSetChanged()

        if (displayedNovelList.isNotEmpty()) {
            emptySearchState.visibility = View.GONE
            tvNovelsHeader.visibility = View.VISIBLE
            tvNovelsHeader.text = "🎉 ${displayedNovelList.size} adet Seri Bulundu:"
            lvNovels.visibility = View.VISIBLE
        } else if (allNovelList.isNotEmpty()) {
            tvNovelsHeader.text = "Bu kaynakta sonuç yok."
            lvNovels.visibility = View.GONE
            emptySearchState.visibility = View.VISIBLE
        }
    }

    private fun showAppSettingsDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_app_settings, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()

        val rgTheme = dialogView.findViewById<RadioGroup>(R.id.rgTheme)
        val rbThemeDark = dialogView.findViewById<RadioButton>(R.id.rbThemeDark)
        val rbThemeAmoled = dialogView.findViewById<RadioButton>(R.id.rbThemeAmoled)
        val rbThemeMidnight = dialogView.findViewById<RadioButton>(R.id.rbThemeMidnight)
        val rbThemeSepia = dialogView.findViewById<RadioButton>(R.id.rbThemeSepia)
        val rbThemeLightWhite = dialogView.findViewById<RadioButton>(R.id.rbThemeLightWhite)
        val rbThemeMint = dialogView.findViewById<RadioButton>(R.id.rbThemeMint)

        val rgDefaultSource = dialogView.findViewById<RadioGroup>(R.id.rgDefaultSource)
        val rbSourceAll = dialogView.findViewById<RadioButton>(R.id.rbSourceAll)
        val rbSourceTR = dialogView.findViewById<RadioButton>(R.id.rbSourceTR)
        val rbSourceEN = dialogView.findViewById<RadioButton>(R.id.rbSourceEN)

        val rgTtsLang = dialogView.findViewById<RadioGroup>(R.id.rgTtsLang)
        val rbLangTR = dialogView.findViewById<RadioButton>(R.id.rbLangTR)
        val rbLangEN = dialogView.findViewById<RadioButton>(R.id.rbLangEN)

        val rgTtsSpeed = dialogView.findViewById<RadioGroup>(R.id.rgTtsSpeed)
        val rbSpeed08 = dialogView.findViewById<RadioButton>(R.id.rbSpeed08)
        val rbSpeed10 = dialogView.findViewById<RadioButton>(R.id.rbSpeed10)
        val rbSpeed12 = dialogView.findViewById<RadioButton>(R.id.rbSpeed12)
        val rbSpeed15 = dialogView.findViewById<RadioButton>(R.id.rbSpeed15)

        val rgSettingsPitch = dialogView.findViewById<RadioGroup>(R.id.rgSettingsPitch)
        val rbSettingsPitchLow = dialogView.findViewById<RadioButton>(R.id.rbSettingsPitchLow)
        val rbSettingsPitchNormal = dialogView.findViewById<RadioButton>(R.id.rbSettingsPitchNormal)
        val rbSettingsPitchHigh = dialogView.findViewById<RadioButton>(R.id.rbSettingsPitchHigh)

        val btnOpenVoiceProfiles = dialogView.findViewById<Button>(R.id.btnOpenVoiceProfiles)
        val btnSaveSettings = dialogView.findViewById<Button>(R.id.btnSaveSettings)

        // Mevcut 6 tema ayarını yükle
        when (AppSettings.getTheme(this)) {
            AppSettings.THEME_AMOLED -> rbThemeAmoled.isChecked = true
            AppSettings.THEME_MIDNIGHT -> rbThemeMidnight.isChecked = true
            AppSettings.THEME_SEPIA -> rbThemeSepia.isChecked = true
            AppSettings.THEME_LIGHT_WHITE -> rbThemeLightWhite.isChecked = true
            AppSettings.THEME_MINT -> rbThemeMint.isChecked = true
            else -> rbThemeDark.isChecked = true
        }

        when (AppSettings.getDefaultSource(this)) {
            "TR" -> rbSourceTR.isChecked = true
            "EN" -> rbSourceEN.isChecked = true
            else -> rbSourceAll.isChecked = true
        }

        if (AppSettings.getTtsLanguage(this) == "en") {
            rbLangEN.isChecked = true
        } else {
            rbLangTR.isChecked = true
        }

        when (AppSettings.getTtsSpeed(this)) {
            0.8f -> rbSpeed08.isChecked = true
            1.2f -> rbSpeed12.isChecked = true
            1.5f -> rbSpeed15.isChecked = true
            else -> rbSpeed10.isChecked = true
        }

        when (AppSettings.getTtsPitch(this)) {
            0.8f -> rbSettingsPitchLow.isChecked = true
            1.2f -> rbSettingsPitchHigh.isChecked = true
            else -> rbSettingsPitchNormal.isChecked = true
        }

        btnOpenVoiceProfiles.setOnClickListener {
            val selectedLang = if (rbLangEN.isChecked) "en" else "tr"
            AppSettings.setTtsLanguage(this, selectedLang)

            if (mainTts == null) {
                mainTts = android.speech.tts.TextToSpeech(this) { status ->
                    if (status == android.speech.tts.TextToSpeech.SUCCESS) {
                        com.birin.moonnovel.tts.TtsVoiceHelper.applySettingsToTts(mainTts, this)
                        com.birin.moonnovel.tts.TtsVoiceHelper.showVoiceSelectionDialog(this, mainTts)
                    } else {
                        Toast.makeText(this, "TTS motoru başlatılamadı.", Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                com.birin.moonnovel.tts.TtsVoiceHelper.applySettingsToTts(mainTts, this)
                com.birin.moonnovel.tts.TtsVoiceHelper.showVoiceSelectionDialog(this, mainTts)
            }
        }

        btnSaveSettings.setOnClickListener {
            val selectedTheme = when {
                rbThemeAmoled.isChecked -> AppSettings.THEME_AMOLED
                rbThemeMidnight.isChecked -> AppSettings.THEME_MIDNIGHT
                rbThemeSepia.isChecked -> AppSettings.THEME_SEPIA
                rbThemeLightWhite.isChecked -> AppSettings.THEME_LIGHT_WHITE
                rbThemeMint.isChecked -> AppSettings.THEME_MINT
                else -> AppSettings.THEME_DARK
            }
            AppSettings.setTheme(this, selectedTheme)
            applyCurrentThemeToMain()

            val selectedSource = when {
                rbSourceTR.isChecked -> "TR"
                rbSourceEN.isChecked -> "EN"
                else -> "ALL"
            }
            AppSettings.setDefaultSource(this, selectedSource)
            selectSourceTab(selectedSource)

            val selectedLang = if (rbLangEN.isChecked) "en" else "tr"
            AppSettings.setTtsLanguage(this, selectedLang)

            val selectedSpeed = when {
                rbSpeed08.isChecked -> 0.8f
                rbSpeed12.isChecked -> 1.2f
                rbSpeed15.isChecked -> 1.5f
                else -> 1.0f
            }
            AppSettings.setTtsSpeed(this, selectedSpeed)

            val selectedPitch = when {
                rbSettingsPitchLow.isChecked -> 0.8f
                rbSettingsPitchHigh.isChecked -> 1.2f
                else -> 1.0f
            }
            AppSettings.setTtsPitch(this, selectedPitch)

            if (mainTts != null) {
                com.birin.moonnovel.tts.TtsVoiceHelper.applySettingsToTts(mainTts, this)
            }

            dialog.dismiss()
            Toast.makeText(this, "Tercihler başarıyla kaydedildi! ✨", Toast.LENGTH_SHORT).show()
        }

        dialog.show()
    }

    private fun applyCurrentThemeToMain() {
        val theme = AppThemeManager.getCurrentTheme(this)
        if (::rootLayout.isInitialized) {
            rootLayout.setBackgroundColor(theme.bgColor)
        }
        if (::topBar.isInitialized) {
            topBar.setBackgroundColor(theme.bgColor)
        }
        window.statusBarColor = theme.bgColor
        window.navigationBarColor = theme.bgColor

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.setSystemBarsAppearance(
                if (!theme.isDark) WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS else 0,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            @Suppress("DEPRECATION")
            var flags = window.decorView.systemUiVisibility
            flags = if (!theme.isDark) {
                flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            } else {
                flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            }
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = flags
        }

        if (::tvHeaderTitle.isInitialized) tvHeaderTitle.setTextColor(theme.textPrimary)
        if (::tvHeroTitle.isInitialized) tvHeroTitle.setTextColor(theme.textPrimary)
        if (::tvNovelsHeader.isInitialized) tvNovelsHeader.setTextColor(theme.textPrimary)
        if (::etSearch.isInitialized) etSearch.setTextColor(theme.textPrimary)
        if (::etFilterChapters.isInitialized) etFilterChapters.setTextColor(theme.textPrimary)

        if (::novelAdapter.isInitialized) novelAdapter.notifyDataSetChanged()
        if (::chapterGridAdapter.isInitialized) chapterGridAdapter.notifyDataSetChanged()
        if (::chapterListAdapter.isInitialized) chapterListAdapter.notifyDataSetChanged()
        if (::archiveAdapter.isInitialized) archiveAdapter.notifyDataSetChanged()
    }

    private fun filterChapters(query: String) {
        filteredChapterList.clear()
        if (query.isBlank()) {
            filteredChapterList.addAll(fullChapterList)
        } else {
            val q = query.lowercase().trim()
            filteredChapterList.addAll(fullChapterList.filter {
                it.number.contains(q) || it.title.lowercase().contains(q)
            })
        }
        applySortChapters()
    }

    private fun applySortChapters() {
        val sorted = if (isSortAscending) {
            filteredChapterList.sortedBy { it.number.toIntOrNull() ?: 0 }
        } else {
            filteredChapterList.sortedByDescending { it.number.toIntOrNull() ?: 0 }
        }
        filteredChapterList.clear()
        filteredChapterList.addAll(sorted)
        chapterListAdapter.notifyDataSetChanged()
        chapterGridAdapter.notifyDataSetChanged()
    }

    private fun observeUpdates() {
        scope.launch {
            updateManager.updateStatus.collect { status ->
                when (status) {
                    is UpdateStatus.Checking -> {
                        showStatus("Yeni sürüm kontrol ediliyor...", isBusy = true)
                    }
                    is UpdateStatus.UpdateAvailable -> {
                        hideStatus()
                        showUpdateDialog(status)
                    }
                    is UpdateStatus.UpToDate -> {
                        // Açılışta veya arka planda altta gereksiz yazı bırakma; sessizce gizle!
                        hideStatus()
                    }
                    is UpdateStatus.Downloading -> {
                        showStatus("Güncelleme indiriliyor: %${status.progressPercent}", isBusy = true)
                    }
                    is UpdateStatus.ReadyToInstall -> {
                        showStatus("✅ İndirme tamamlandı, kurulum başlatıldı!", isBusy = false)
                        scope.launch {
                            delay(4000)
                            hideStatus()
                        }
                    }
                    is UpdateStatus.Error -> {
                        showStatus("❌ ${status.message}", isBusy = false)
                        scope.launch {
                            delay(5000)
                            hideStatus()
                        }
                    }
                    else -> {}
                }
            }
        }
    }

    private fun showUpdateDialog(update: UpdateStatus.UpdateAvailable) {
        AlertDialog.Builder(this)
            .setTitle("🚀 Yeni Sürüm Mevcut!")
            .setMessage("Mevcut: v${update.currentVersionName}\nYeni: v${update.remoteVersionName}\n\nYenilikler:\n${update.releaseNotes}")
            .setPositiveButton("Hemen Güncelle") { _, _ ->
                updateManager.downloadAndInstallUpdate(update)
            }
            .setNegativeButton("Daha Sonra", null)
            .show()
    }

    private fun updateChapterViewMode() {
        if (isGridMode) {
            gvChapters.visibility = View.VISIBLE
            lvChapters.visibility = View.GONE
            btnToggleLayout.setImageResource(android.R.drawable.ic_dialog_dialer)
        } else {
            gvChapters.visibility = View.GONE
            lvChapters.visibility = View.VISIBLE
            btnToggleLayout.setImageResource(android.R.drawable.ic_menu_sort_by_size)
        }
    }

    private fun showStatus(msg: String, isBusy: Boolean = false) {
        bottomStatusCard.visibility = View.VISIBLE
        progressBar.visibility = if (isBusy) View.VISIBLE else View.GONE
        tvStatus.text = msg
    }

    private fun hideStatus() {
        bottomStatusCard.visibility = View.GONE
    }

    private fun animateSearchToTop() {
        if (isSearchExpanded) return
        isSearchExpanded = true

        tvHeroTitle.animate().alpha(0f).setDuration(200).withEndAction {
            tvHeroTitle.visibility = View.GONE
        }.start()

        tvHeroSubtitle.animate().alpha(0f).setDuration(200).withEndAction {
            tvHeroSubtitle.visibility = View.GONE
        }.start()

        val params = heroSearchSection.layoutParams as LinearLayout.LayoutParams
        val animator = ValueAnimator.ofFloat(1f, 0f)
        animator.duration = 350
        animator.interpolator = AccelerateDecelerateInterpolator()
        animator.addUpdateListener { animation ->
            params.weight = animation.animatedValue as Float
            heroSearchSection.layoutParams = params
        }
        animator.addListener(object : android.animation.AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: android.animation.Animator) {
                params.height = LinearLayout.LayoutParams.WRAP_CONTENT
                params.weight = 0f
                heroSearchSection.layoutParams = params
                heroSearchSection.setPadding(0, 10, 0, 10)
            }
        })
        animator.start()
    }

    private fun searchNovels(query: String) {
        showStatus("Katalog taranıyor, lütfen bekleyin...", isBusy = true)
        scope.launch {
            val results = withContext(Dispatchers.IO) {
                val list = mutableListOf<NovelSourceItem>()
                for (adapter in allAdapters) {
                    try {
                        val res = adapter.search(query)
                        list.addAll(res)
                    } catch (_: Exception) {}
                }
                list
            }
            hideStatus()
            allNovelList.clear()
            allNovelList.addAll(results)

            animateSearchToTop()
            applySourceFilter()

            if (results.isEmpty()) {
                tvNovelsHeader.visibility = View.VISIBLE
                tvNovelsHeader.text = "0 adet Seri Bulundu :("
                lvNovels.visibility = View.GONE
                emptySearchState.visibility = View.VISIBLE
                tvEmptySubtitle.text = "\"$query\" aramasına uygun bir novel bulamadık.\nFarklı bir kelimeyle tekrar deneyelim mi? (◕‿◕✿)"
            }
        }
    }

    private fun getAdapterForNovel(novel: NovelSourceItem): NovelSourceAdapter {
        return allAdapters.find { it.sourceId == novel.sourceId }
            ?: if (novel.sourceLanguage == "TR") trAdapter else novelBinAdapter
    }

    private fun loadAllChapters(novel: NovelSourceItem) {
        currentMode = "chapters"
        btnBack.visibility = View.VISIBLE
        btnToggleLayout.visibility = View.VISIBLE
        btnSettings.visibility = View.GONE
        viewSearchAndNovels.visibility = View.GONE
        viewLibrary.visibility = View.GONE
        viewChapters.visibility = View.VISIBLE
        updateChapterViewMode()

        tvHeaderTitle.text = novel.name
        tvHeaderSub.text = "Tüm bölümler taranıyor..."
        showStatus("Bölümler yükleniyor, lütfen bekleyin...", isBusy = true)
        fullChapterList.clear()
        filteredChapterList.clear()
        chapterListAdapter.notifyDataSetChanged()
        chapterGridAdapter.notifyDataSetChanged()

        scope.launch {
            val adapter = getAdapterForNovel(novel)
            val chapters = adapter.getChapters(novel)

            hideStatus()
            fullChapterList.clear()
            fullChapterList.addAll(chapters)
            filterChapters(etFilterChapters.text.toString())

            if (chapters.isEmpty()) {
                tvHeaderSub.text = "Bölüm bulunamadı"
                showStatus("Bölüm listesi alınamadı.", isBusy = false)
            } else {
                tvHeaderSub.text = "Toplam ${chapters.size} Bölüm • Dokun ve Oku"
            }
        }
    }

    private fun showNovelsView() {
        currentMode = "search"
        btnBack.visibility = View.GONE
        btnToggleLayout.visibility = View.GONE
        btnSettings.visibility = View.VISIBLE
        viewSearchAndNovels.visibility = View.VISIBLE
        viewChapters.visibility = View.GONE
        viewLibrary.visibility = View.GONE
        tvHeaderTitle.text = "📖 Moon Novel"
        tvHeaderSub.text = "Kişisel Kütüphanen • Çevrimdışı Okuyucu"
        hideStatus()
        selectedNovel = null
    }

    private fun showLibraryView() {
        currentMode = "library"
        btnBack.visibility = View.VISIBLE
        btnToggleLayout.visibility = View.GONE
        btnSettings.visibility = View.GONE
        viewSearchAndNovels.visibility = View.GONE
        viewChapters.visibility = View.GONE
        viewLibrary.visibility = View.VISIBLE
        tvHeaderTitle.text = "📦 İndirilen Zip Deposu"
        tvHeaderSub.text = "Kaydedilen tüm bölümler ve arşivler"
        hideStatus()
        loadSavedArchives()
    }

    private fun loadSavedArchives() {
        archiveList.clear()
        val zipsDir = File(getExternalFilesDir(null) ?: filesDir, "zips")
        if (zipsDir.exists()) {
            val files = zipsDir.listFiles { f -> f.extension.equals("zip", ignoreCase = true) }
            if (files != null) {
                for (f in files.sortedByDescending { it.lastModified() }) {
                    val sizeKb = f.length() / 1024
                    archiveList.add(
                        SavedArchive(
                            file = f,
                            title = f.nameWithoutExtension.replace("_", " "),
                            sizeStr = if (sizeKb > 1024) "${sizeKb / 1024} MB" else "$sizeKb KB"
                        )
                    )
                }
            }
        }
        archiveAdapter.notifyDataSetChanged()
        if (archiveList.isEmpty()) {
            emptyLibraryState.visibility = View.VISIBLE
            lvDownloads.visibility = View.GONE
        } else {
            emptyLibraryState.visibility = View.GONE
            lvDownloads.visibility = View.VISIBLE
        }
    }

    private fun downloadAndProcessChapter(novel: NovelSourceItem, chapter: ChapterSourceItem) {
        showStatus("⏳ '${chapter.title}' yükleniyor...", isBusy = true)

        scope.launch {
            try {
                val adapter = getAdapterForNovel(novel)
                val contentPair = withContext(Dispatchers.IO) {
                    adapter.getChapterContent(novel, chapter)
                }
                val title = contentPair.first
                val rawHtml = contentPair.second

                if (rawHtml.isBlank()) {
                    hideStatus()
                    Toast.makeText(this@MainActivity, "Bölüm içeriği boş veya sunucudan çekilemedi.", Toast.LENGTH_SHORT).show()
                    return@launch
                }

                // Büyük bölümlerde Intent limitini aşmamak için geçici cache dosyasına yaz
                val cacheFile = File(cacheDir, "current_reading_chapter.html")
                withContext(Dispatchers.IO) {
                    try {
                        cacheFile.writeText(rawHtml, Charsets.UTF_8)
                    } catch (_: Exception) {}

                    try {
                        val pList = rawHtml.replace(Regex("<[^>]+>"), "\n").split("\n").map { it.trim() }.filter { it.isNotEmpty() }
                        val epub = createEpubFile(novel.name, chapter.number, title, pList)
                        createZipArchive(novel.name, chapter.number, title, epub, pList)
                    } catch (_: Exception) {}
                }

                hideStatus()

                // Profesyonel Dahili Moon+ Reader Sayfalı Okuyucuyu Başlat!
                val readerIntent = Intent(this@MainActivity, ReaderActivity::class.java).apply {
                    putExtra("EXTRA_NOVEL_TITLE", novel.name)
                    putExtra("EXTRA_CHAPTER_TITLE", title)
                    putExtra("EXTRA_CHAPTER_NUMBER", chapter.number)
                    putExtra("EXTRA_FILE_PATH", cacheFile.absolutePath)
                    if (rawHtml.length < 200_000) {
                        putExtra("EXTRA_CHAPTER_HTML", rawHtml)
                    }
                }
                startActivity(readerIntent)
            } catch (e: Exception) {
                hideStatus()
                Toast.makeText(this@MainActivity, "Bölüm açılırken hata oluştu: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun openSavedArchiveInReader(zipFile: File) {
        try {
            var textContent = ""
            java.util.zip.ZipFile(zipFile).use { zip ->
                val entries = zip.entries()
                while (entries.hasMoreElements()) {
                    val entry = entries.nextElement()
                    if (entry.name.endsWith(".txt", ignoreCase = true)) {
                        zip.getInputStream(entry).use { stream ->
                            textContent = stream.bufferedReader(Charsets.UTF_8).readText()
                        }
                        break
                    }
                }
            }

            val cacheFile = File(cacheDir, "current_reading_chapter.html")
            val htmlContent = "<p>${textContent.replace("\n", "</p><p>")}</p>"
            cacheFile.writeText(htmlContent, Charsets.UTF_8)

            val readerIntent = Intent(this, ReaderActivity::class.java).apply {
                putExtra("EXTRA_NOVEL_TITLE", zipFile.nameWithoutExtension.substringBefore("_Bolum"))
                putExtra("EXTRA_CHAPTER_TITLE", zipFile.nameWithoutExtension)
                putExtra("EXTRA_FILE_PATH", cacheFile.absolutePath)
                if (htmlContent.length < 200_000) {
                    putExtra("EXTRA_CHAPTER_HTML", htmlContent)
                }
            }
            startActivity(readerIntent)
        } catch (e: Exception) {
            Toast.makeText(this, "Arşiv okunamadı: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun createEpubFile(novelName: String, chapterNum: String, title: String, paragraphs: List<String>): File {
        val safeName = novelName.replace(Regex("[^a-zA-Z0-9_-]"), "_")
        val baseDir = getExternalFilesDir(null) ?: filesDir
        val epubDir = File(baseDir, "epubs")
        if (!epubDir.exists()) epubDir.mkdirs()
        val epubFile = File(epubDir, "${safeName}_Bolum_${chapterNum}.epub")

        val bodyBuilder = java.lang.StringBuilder()
        bodyBuilder.append("<h1>").append(escapeXml(title)).append("</h1>\n<hr/>\n")
        for (p in paragraphs) {
            bodyBuilder.append("<p>").append(escapeXml(p)).append("</p>\n")
        }

        val chapterXhtml = """
            <?xml version="1.0" encoding="utf-8"?>
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="tr" lang="tr">
            <head>
              <title>${escapeXml(title)}</title>
              <style>
                body { font-family: sans-serif; margin: 5%; line-height: 1.6; color: #e0e0e0; background-color: #0A0A0C; }
                h1 { font-size: 1.4em; text-align: center; margin-top: 1em; color: #E11D48; }
                hr { border: 0; height: 1px; background: #2A2A36; margin: 1.5em 0; }
                p { text-indent: 1.2em; margin-bottom: 0.8em; text-align: justify; }
              </style>
            </head>
            <body>
            $bodyBuilder
            </body>
            </html>
        """.trimIndent()

        val containerXml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                <rootfiles>
                    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                </rootfiles>
            </container>
        """.trimIndent()

        val contentOpf = """
            <?xml version="1.0" encoding="UTF-8"?>
            <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
                <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                    <dc:title>${escapeXml(novelName)} - ${escapeXml(title)}</dc:title>
                    <dc:creator>Moon Novel Downloader</dc:creator>
                    <dc:language>tr</dc:language>
                    <dc:identifier id="BookID">urn:uuid:${UUID.randomUUID()}</dc:identifier>
                </metadata>
                <manifest>
                    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
                    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
                </manifest>
                <spine toc="ncx">
                    <itemref idref="chapter1"/>
                </spine>
            </package>
        """.trimIndent()

        val tocNcx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
                <head>
                    <meta name="dtb:uid" content="urn:uuid:${UUID.randomUUID()}"/>
                    <meta name="dtb:depth" content="1"/>
                    <meta name="dtb:totalPageCount" content="0"/>
                    <meta name="dtb:maxPageNumber" content="0"/>
                </head>
                <docTitle><text>${escapeXml(novelName)}</text></docTitle>
                <navMap>
                    <navPoint id="navPoint-1" playOrder="1">
                        <navLabel><text>${escapeXml(title)}</text></navLabel>
                        <content src="chapter1.xhtml"/>
                    </navPoint>
                </navMap>
            </ncx>
        """.trimIndent()

        ZipOutputStream(FileOutputStream(epubFile)).use { zos ->
            val mimetypeBytes = "application/epub+zip".toByteArray(Charsets.US_ASCII)
            val mimetypeEntry = ZipEntry("mimetype").apply {
                method = ZipEntry.STORED
                size = mimetypeBytes.size.toLong()
                compressedSize = mimetypeBytes.size.toLong()
                crc = CRC32().apply { update(mimetypeBytes) }.value
            }
            zos.putNextEntry(mimetypeEntry)
            zos.write(mimetypeBytes)
            zos.closeEntry()

            zos.putNextEntry(ZipEntry("META-INF/container.xml"))
            zos.write(containerXml.toByteArray(Charsets.UTF_8))
            zos.closeEntry()

            zos.putNextEntry(ZipEntry("OEBPS/content.opf"))
            zos.write(contentOpf.toByteArray(Charsets.UTF_8))
            zos.closeEntry()

            zos.putNextEntry(ZipEntry("OEBPS/toc.ncx"))
            zos.write(tocNcx.toByteArray(Charsets.UTF_8))
            zos.closeEntry()

            zos.putNextEntry(ZipEntry("OEBPS/chapter1.xhtml"))
            zos.write(chapterXhtml.toByteArray(Charsets.UTF_8))
            zos.closeEntry()
        }

        return epubFile
    }

    private fun createZipArchive(novelName: String, chapterNum: String, title: String, epubFile: File, paragraphs: List<String>): File {
        val safeName = novelName.replace(Regex("[^a-zA-Z0-9_-]"), "_")
        val baseDir = getExternalFilesDir(null) ?: filesDir
        val zipsDir = File(baseDir, "zips")
        if (!zipsDir.exists()) zipsDir.mkdirs()
        val zipFile = File(zipsDir, "${safeName}_Bolum_${chapterNum}.zip")

        ZipOutputStream(FileOutputStream(zipFile)).use { zos ->
            zos.putNextEntry(ZipEntry("${safeName}_Bolum_${chapterNum}.epub"))
            FileInputStream(epubFile).use { fis ->
                fis.copyTo(zos)
            }
            zos.closeEntry()

            val txtContent = "$title\n" + "=".repeat(40) + "\n\n" + paragraphs.joinToString("\n\n")
            zos.putNextEntry(ZipEntry("${safeName}_Bolum_${chapterNum}.txt"))
            zos.write(txtContent.toByteArray(Charsets.UTF_8))
            zos.closeEntry()
        }

        return zipFile
    }

    private fun escapeXml(str: String): String {
        return str.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;")
    }

    override fun onResume() {
        super.onResume()
        applyCurrentThemeToMain()
        if (::updateManager.isInitialized && updateManager.hasPendingInstall()) {
            updateManager.retryPendingInstall()
        }
    }

    override fun onDestroy() {
        mainTts?.stop()
        mainTts?.shutdown()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (currentMode == "chapters" || currentMode == "library") {
            showNovelsView()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}
