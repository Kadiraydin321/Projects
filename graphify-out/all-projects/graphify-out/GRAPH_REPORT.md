# Graph Report - all-projects  (2026-11-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 6581 nodes · 15466 edges · 307 communities (162 shown, 145 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 484 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a81c40c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 231
- Community 232
- Community 233
- Community 234
- Community 235
- Community 236
- Community 239
- Community 241
- Community 242
- Community 247
- Community 248
- Community 290
- Community 291
- Community 292

## God Nodes (most connected - your core abstractions)
1. `Note` - 178 edges
2. `NoteDetailViewModel` - 86 edges
3. `NoteDetailScreen()` - 83 edges
4. `NotesViewModel` - 70 edges
5. `NoteRepository` - 69 edges
6. `Category` - 64 edges
7. `SettingsViewModel` - 63 edges
8. `AppSettingsManager` - 60 edges
9. `getSession()` - 55 edges
10. `NoteDao` - 54 edges

## Surprising Connections (you probably didn't know these)
- `TestPipelineFlow` --uses--> `ConfigManager`  [INFERRED]
  tests/test_pipeline.py → core/config.py
- `TestTranslators` --uses--> `GoogleTranslatorEngine`  [INFERRED]
  tests/test_translators.py → core/engines/translation/google_translator.py
- `DummyCapture` --uses--> `BaseCaptureEngine`  [INFERRED]
  tests/test_pipeline.py → core/interfaces/capture_base.py
- `LensOverlayWindow` --uses--> `TextBlock`  [INFERRED]
  platforms/windows/lens_overlay.py → core/interfaces/ocr_base.py
- `TestOptimizerModules` --uses--> `TextBlock`  [INFERRED]
  tests/test_optimizer.py → core/interfaces/ocr_base.py

## Import Cycles
- None detected.

## Communities (307 total, 145 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (17): register_default_plugins(), MockOCREngine, RapidOCREngine, WinRTOCREngine, GoogleTranslatorEngine, BaseCaptureEngine, BaseOCREngine, TextBlock (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (34): probe_target(), tcp_ping(), create_zip_bytes(), generate_dataset(), run_integrity_tests(), sha256(), banner(), print_section() (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (13): ConfigManager, TranslationPipeline, check_single_instance(), main(), MainApplication, SignalBridge, LensOverlayWindow, RegionSelector (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (14): BiometricPromptManager, findFragmentActivity(), OpticalImportResult, ExportVaultDialog(), ImportVaultDialog(), SettingsGroupCard(), SettingsScreen(), OpticalQrScannerDialog() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (39): WordGoalStatus, AudioTrimmerBottomSheet(), ActiveEditorStyles, BottomEditorBar(), detectActiveEditorStyles(), isInsideDelimiters(), isInsideItalic(), NoteToolCategory (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (42): check_windows(), get_system_info(), main(), run_command(), get_audio_volume(), get_brightness(), get_disk_space(), get_network_info() (+34 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (92): ACTION_MAP, applyNoteColor(), applyTheme(), callIpc(), closeNoteContextMenu(), computeCrc32(), createNewNote(), createNewNoteWithTitle() (+84 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (92): ACTION_MAP, applyNoteColor(), applyTheme(), callIpc(), closeNoteContextMenu(), computeCrc32(), createNewNote(), createNewNoteWithTitle() (+84 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (11): generateQrBitmap(), QrCodeDialog(), CategoriesOverviewSection(), CategoryItemCard(), DashboardScreen(), HeaderSection(), LiveTransferMonitorContent(), PermissionCard() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (7): TagManagerBottomSheet(), noteEntranceModifier(), NotesScreen(), QuickFabOption(), SectionHeader(), NotesViewModel, QuickSyncState

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (12): BackupManager, BackupResult, Error, NeedsPassword, RestoreResult, Success, InvalidVaultFileException, VaultExportEngine (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (10): AppSummaryDto, CategoryStatItem, DeviceInfoResponse, KtorTransferServer, StorageItemDto, TransferMetricsTracker, TransferProgressMetric, WhatsAppAccountDto (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (14): extract_pin_from_request(), ServerState, StatusChangeCallback, SyncPayload, SyncServer, SyncStatusData, SyncStatusEvent, extract_pin_from_request() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (21): AsyncTaskQueue, DLQItem, TaskRecord, TaskStatus, run_async(), test_1_normal_async_task_execution(), _test(), test_2_exception_handling() (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (3): CategoryBadge(), CategoryColorPicker(), KeepCheckboxIcon()

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (8): AppShortcutManager, ActiveTagQuery, ActiveWikilinkQuery, TagSuggestionEngine, NoteApp, TrashCleanupScheduler, AppShortcutManagerTest, TagSuggestionEngineTest

### Community 17 - "Community 17"
Cohesion: 0.04
Nodes (3): BatchActionButton(), BatchActionsBottomBar(), ChecklistProgressRing()

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (5): ReaderActivity, OnPageChangeCallback, UtteranceProgressListener, OnSeekBarChangeListener, TranslationEngine

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (34): BackupInfo, DEFAULT_PBKDF2_ITERATIONS, HASH_LEN, HEADER_LEN, IV_LEN, MAX_ARCHIVE_ENTRIES, MAX_ENTRY_SIZE, MAX_TOTAL_EXTRACTED_SIZE (+26 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (3): isEffectivelyBlankNoteContent(), NoteDetailViewModel, NoteHistorySnapshot

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (10): test_1_basic_put_get(), test_2_lru_eviction_order(), test_3_lru_access_refresh(), test_4_ttl_expiration(), test_5_multithreaded_race_condition(), test_6_eviction_callback(), test_7_capacity_validation(), test_8_update_existing_key_refreshes_ttl() (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.05
Nodes (44): AdjustControlPanel(), applyColorAdjustmentsToBitmap(), applyCropHandleDrag(), buildCombinedColorFilter(), calculateCropFraction(), CropAspectRatio, FREE, RATIO_16_9 (+36 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (9): __dirname, __filename, CarverEngine, DiskDetector, SampleDiskGenerator, BUILTIN_SIGNATURES, parseCustomSignature(), runTests() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (17): ApiResponse, AuditLogger, AuditRecord, IdempotencyRecord, LiteLLMAnthropicBridge, OrderService, ProblemDetails, order_service() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (12): StoragePermissionManager, WhatsAppItemStats, WhatsAppLocationInfo, WhatsAppScanner, WhatsAppType, WHATSAPP, WHATSAPP_BUSINESS, CategorySummary (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (7): Database, extract_wikilinks(), NOTE_COLUMNS, now_millis(), parse_json_array(), sync_note_links_internal(), to_json_array()

### Community 28 - "Community 28"
Cohesion: 0.06
Nodes (19): AppSettingsManager, LockTimeoutPolicy, FIFTEEN_MINUTES, FIVE_MINUTES, IMMEDIATE, ONE_MINUTE, QuickActionLocation, DRAWER_HEADER (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (33): AspectFitRect, DrawingScaleHelper, DrawingFloatingToolbar(), CanvasPattern, BLANK, CHALKBOARD, DOTS, GRID (+25 more)

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (12): FolderDialog, HttpServer, bound_port_, engine_, HttpServer::HttpServer(), listen_socket_, start_port_, json_escape() (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (7): Database, extract_wikilinks(), NOTE_COLUMNS, now_millis(), parse_json_array(), sync_note_links_internal(), to_json_array()

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (5): Note, NoteMerger, NoteMergerTest, NoteSortTest, FakeNoteRepository

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (30): APP_JS, execute_ipc_action(), handle_legacy_http_request(), ICON_PNG, INDEX_HTML, INIT_SCRIPT, LegacyApiError, LegacyApiRequest (+22 more)

### Community 34 - "Community 34"
Cohesion: 0.06
Nodes (30): APP_JS, execute_ipc_action(), handle_legacy_http_request(), ICON_PNG, INDEX_HTML, INIT_SCRIPT, LegacyApiError, LegacyApiRequest (+22 more)

### Community 35 - "Community 35"
Cohesion: 0.06
Nodes (18): constant_time_pin_match(), is_allowed_client_ip(), create_test_note(), test_allowed_client_ip(), test_constant_time_pin_matching(), test_db_crud_operations(), test_tag_filtering(), test_trash_and_restore() (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (7): ScreenCapture, OCREngine, TextBlock, WinOCREngine, PipelineWorker, LRUCache, TranslatorEngine

### Community 37 - "Community 37"
Cohesion: 0.08
Nodes (3): AdGuardDohDns, BackupRestoreManager, SecureNetworkClient

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (6): AutoResizeText(), MarkdownPreview(), MarkdownText(), parseInlineMarkdown(), parseMarkdownCardPreview(), MarkdownVisualTransformation

### Community 39 - "Community 39"
Cohesion: 0.06
Nodes (34): activeHexItem, activePreviewItem, activeTab, addLog(), adminStatus, checkSafety(), consoleLogs, counts (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (18): AppStatistics, CategoryStat, DailyStreakInfo, MediaInventory, TagFrequency, StatisticsCalculator, CategoryDistributionCard(), DailyWordGoalCard() (+10 more)

### Community 41 - "Community 41"
Cohesion: 0.08
Nodes (5): DraftRecoveryManager, DraftStorage, InMemoryDraftStorage, SharedPreferencesDraftStorage, DraftRecoveryManagerTest

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (3): MainActivity, AnimatorListenerAdapter, SavedArchive

### Community 43 - "Community 43"
Cohesion: 0.06
Nodes (38): eslintConfig, dependencies, jose@^6.2.7, lucide-react@^1.28.0, next@16.2.12, next-themes@^0.4.6, @prisma/client@^6.19.3, react@19.2.4 (+30 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (22): prisma, @prisma/client, prisma, prisma, prisma, deleteCihaz(), getCihazlar(), createLog() (+14 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (14): query_ollama_stream(), probe_target(), tcp_ping(), banner(), print_section(), print_summary(), print_test_result(), save_reports() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (8): MarkdownTable, MarkdownTableParser, TableAlignment, CENTER, LEFT, RIGHT, MarkdownTableView(), MarkdownTableParserTest

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (3): AppSettings, TtsVoiceHelper, VoiceItem

### Community 49 - "Community 49"
Cohesion: 0.09
Nodes (16): NoteGraphStats, NoteLinkGraphEngine, NoteNode, OutboundLinksResult, WikilinkReference, BacklinkCard(), EmptySectionPlaceholder(), NoteLinkGraphBottomSheet() (+8 more)

### Community 50 - "Community 50"
Cohesion: 0.07
Nodes (19): btnBrightness, btnRegistry, btnTestSpeed, btnVolume, txtCPU, txtDisk, txtNetwork, txtOS (+11 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (17): backup_folder(), cancel_shutdown(), clean_temp(), drive_status(), free_games(), get_auth_url(), get_drive_service(), get_notes() (+9 more)

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (10): CalendarDay, CalendarNoteGrouper, DateFilterMode, CREATED_DATE, REMINDER_DATE, UPDATED_DATE, DateGroup, CalendarAgendaBar() (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (17): base64_encode_bytes(), CarverEngine, CarverEngine::CarverEngine(), files_mutex_, found_files_, is_paused_, is_running_, should_stop_ (+9 more)

### Community 57 - "Community 57"
Cohesion: 0.11
Nodes (27): getLocalSubnets(), http, httpGet(), net, os, probeTarget(), scanSubnet(), worker() (+19 more)

### Community 58 - "Community 58"
Cohesion: 0.09
Nodes (10): ArchiveViewHolder, ChapterGridViewHolder, ChapterListViewHolder, BaseAdapter, BaseAdapter, BaseAdapter, BaseAdapter, NovelViewHolder (+2 more)

### Community 59 - "Community 59"
Cohesion: 0.10
Nodes (9): BackupManager, BackupRestoreStats, constant_time_eq(), CryptoManager, test_constant_time_eq(), test_encrypt_decrypt_format(), test_zeroize_bytes(), zeroize_bytes() (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.06
Nodes (9): crypto, electron_1, fs, gotTheLock, main_1, path, PROTOCOL, readline (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.10
Nodes (9): BackupManager, BackupRestoreStats, constant_time_eq(), CryptoManager, test_constant_time_eq(), test_encrypt_decrypt_format(), test_zeroize_bytes(), zeroize_bytes() (+1 more)

### Community 62 - "Community 62"
Cohesion: 0.14
Nodes (22): addBolum(), addCihazTuru(), addJigKategorisi(), deleteBolum(), deleteCihazTuru(), deleteJigKategorisi(), deleteRol(), updateBolum() (+14 more)

### Community 63 - "Community 63"
Cohesion: 0.12
Nodes (3): BatchNoteExportItem, NoteExporter, HtmlExporterTest

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (9): CategoryScanResult, MediaCategory, ALL_STORAGE, AUDIO, DOCUMENTS, PHOTOS, VIDEOS, MediaCategoryScanner (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.09
Nodes (4): CacheManager, FrameDiffDetector, TextClusterer, TestOptimizerModules

### Community 66 - "Community 66"
Cohesion: 0.13
Nodes (9): WidgetFabBehavior, DIRECT_DRAW, DIRECT_IMAGE, DIRECT_NEW_NOTE, DIRECT_TODO, DIRECT_VOICE, DOCK_TOOLBAR, POPUP_MENU (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.14
Nodes (17): applyCodeBlock(), applyMarkdownWrap(), applyPrefixToLine(), findFormattingSpanAtCursor(), findWordAt(), hasFormattingInside(), hasFormattingOutside(), insertTextAtCursor() (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.13
Nodes (7): TextWatcher, NovelBinAdapter, NovelGecesiAdapter, ChapterSourceItem, NovelSourceAdapter, NovelSourceItem, WuxiaWorldEnAdapter

### Community 70 - "Community 70"
Cohesion: 0.12
Nodes (10): MathExpression, MathExpressionType, DISPLAY, INLINE, MathFormulaEngine, MathTemplate, MathFormulaBottomSheet(), QuickSymbolPalette() (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.13
Nodes (10): AppUpdateManager, CandidateRelease, Checking, Downloading, Error, Idle, ReadyToInstall, UpdateAvailable (+2 more)

### Community 73 - "Community 73"
Cohesion: 0.08
Nodes (27): { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, author, description, devDependencies, autoprefixer@^10.4.27, electron@^33.4.11, electron-builder@^24.13.3 (+19 more)

### Community 74 - "Community 74"
Cohesion: 0.07
Nodes (20): NotesLayoutMode, COMPACT_LIST, LIST, STAGGERED_GRID, NoteSortOrder, COLOR, CREATED_ASC, CREATED_DESC (+12 more)

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (3): Converters, NoteDatabase, AppModule

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (5): CategoryLockManager, CategoryLockStorage, InMemoryCategoryLockStorage, SharedPreferencesCategoryLockStorage, CategoryLockManagerTest

### Community 77 - "Community 77"
Cohesion: 0.16
Nodes (4): ClipboardHelper, CopyResult, SmartCopyBottomSheet(), ClipboardHelperTest

### Community 78 - "Community 78"
Cohesion: 0.09
Nodes (21): ApiError, ApiRequest, ApiResponse, APP_EXE, APP_JS, get_default_install_dir(), get_desktop_dir(), get_start_menu_dir() (+13 more)

### Community 79 - "Community 79"
Cohesion: 0.07
Nodes (29): FoundFile, accessed_time_str, attributes_str, category, confidence, created_time_str, detection_source, display_name (+21 more)

### Community 80 - "Community 80"
Cohesion: 0.13
Nodes (13): PreviewData, data, hex, mime, type, RecoveryResult, destination_dir, error (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.14
Nodes (12): ExpansionResult, MacroSnippet, SnippetCategory, ALL, CALLOUT, DATE_TIME, FORMATTING, PRODUCTIVITY (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.11
Nodes (10): main(), parseArgs(), path, AuthValidator, DiscoveryProbe, net, SyncTestEngine, StressRunner (+2 more)

### Community 85 - "Community 85"
Cohesion: 0.12
Nodes (14): NoteGroupingMode, CATEGORY, FLAT, TIMELINE, NoteSection, NoteTimelineGrouper, TimelineBucket, OLDER (+6 more)

### Community 86 - "Community 86"
Cohesion: 0.07
Nodes (25): MftRun, cluster_count, lcn, NtfsDeletedFile, accessed_time, accessed_time_str, alloc_size, attributes_str (+17 more)

### Community 87 - "Community 87"
Cohesion: 0.14
Nodes (10): KeywordFrequency, NoteMetrics, NoteMetricsEngine, ReadabilityGrade, CHALLENGING, EASY, MODERATE, TECHNICAL (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.12
Nodes (10): main(), parseArgs(), path, AuthValidator, DiscoveryProbe, net, SyncTestEngine, StressRunner (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.09
Nodes (16): ImageEngine, is_running_, mutex_, should_stop_, status_, ImageTaskStatus, bad_sectors, bytes_written (+8 more)

### Community 90 - "Community 90"
Cohesion: 0.14
Nodes (18): { app, nativeImage }, fs, path, banner(), colors, fs, generateJsonReport(), generateMarkdownReport() (+10 more)

### Community 91 - "Community 91"
Cohesion: 0.13
Nodes (8): NetworkType, HOTSPOT, NONE, OTHER, USB_TETHERING, WIFI, NetworkUtils, NetworkUtilsTest

### Community 92 - "Community 92"
Cohesion: 0.13
Nodes (4): OpticalChunk, OpticalStreamProgress, OpticalTransferManager, OpticalTransferAndQrSyncTest

### Community 93 - "Community 93"
Cohesion: 0.10
Nodes (20): AppSettings, DesignPreset, COMPACT_POWER, CUSTOM, MINIMAL_NOTION, MODERN_MATERIAL, STUDIO_GLASS, VINTAGE_JOURNAL (+12 more)

### Community 94 - "Community 94"
Cohesion: 0.10
Nodes (14): DiskDetector, DriveItem, badge, description, free_bytes, free_human, fs_type, id (+6 more)

### Community 95 - "Community 95"
Cohesion: 0.15
Nodes (16): lucide-react, next-themes, react, getSistemLoglari(), globalSearch(), LoglarClient(), AdminDashboard(), dynamic (+8 more)

### Community 97 - "Community 97"
Cohesion: 0.11
Nodes (18): CardCornerStyle, ROUNDED, SHARP, SQUIRCLE, CardElevationStyle, BORDERED, ELEVATED, GLASS (+10 more)

### Community 98 - "Community 98"
Cohesion: 0.13
Nodes (11): CodeSyntaxHighlighter, CodeToken, CodeTokenType, COMMENT, KEYWORD, NUMBER, PLAIN, PUNCTUATION (+3 more)

### Community 99 - "Community 99"
Cohesion: 0.11
Nodes (4): GeminiTranslator, OllamaTranslator, DummyTranslator, TestTranslators

### Community 101 - "Community 101"
Cohesion: 0.18
Nodes (5): AppBackupScanner, AppDataDirInfo, InstalledAppInfo, FileItem, AppBackupScannerTest

### Community 103 - "Community 103"
Cohesion: 0.08
Nodes (24): NtfsBootSector, bytes_per_sector, checksum, clusters_per_index_buffer, clusters_per_mft_record, hidden_sectors, jump, media_descriptor (+16 more)

### Community 105 - "Community 105"
Cohesion: 0.17
Nodes (10): BoardTask, TaskBoardEngine, TaskBoardState, TaskPriority, HIGH, MEDIUM, NORMAL, TaskBoardBottomSheet() (+2 more)

### Community 106 - "Community 106"
Cohesion: 0.17
Nodes (5): UploadResponseDto, UploadedFileInfo, UploadManager, UploadManagerTest, InputStream

### Community 107 - "Community 107"
Cohesion: 0.10
Nodes (3): TextBlockModel, TranslationBridgeClient, TranslationCallback

### Community 109 - "Community 109"
Cohesion: 0.16
Nodes (5): TemplateManager, NoteTemplate, TemplateCard(), TemplatePickerBottomSheet(), TemplateInterpolationTest

### Community 110 - "Community 110"
Cohesion: 0.16
Nodes (6): TaskAnalyticsEngine, TaskItem, TaskSummary, ChecklistActionBottomSheet(), TaskActionButton(), TaskAnalyticsEngineTest

### Community 111 - "Community 111"
Cohesion: 0.17
Nodes (14): nextConfig, next, createJig(), deleteJig(), updateJig(), DuzenleJigPage(), dynamic, JigListesi() (+6 more)

### Community 112 - "Community 112"
Cohesion: 0.23
Nodes (16): createKullanici(), deleteKullanici(), getBolumler(), getKullanicilar(), getYoneticiler(), updateKullanici(), DuzenleKullaniciPage(), dynamic (+8 more)

### Community 114 - "Community 114"
Cohesion: 0.13
Nodes (10): ScreenSizeClass, COMPACT, EXPANDED, MEDIUM, SplitPaneLayoutHelper, SplitRatio, EQUAL, WIDE_EDITOR (+2 more)

### Community 115 - "Community 115"
Cohesion: 0.10
Nodes (21): build, appId, directories, files, nsis, productName, win, output (+13 more)

### Community 116 - "Community 116"
Cohesion: 0.14
Nodes (19): Category, constantTimePinMatch(), createBackupZipBuffer(), createNoteVaultBuffer(), decryptNoteVaultBuffer(), deriveKeyPBKDF2(), extractPin(), findEdgePath() (+11 more)

### Community 117 - "Community 117"
Cohesion: 0.13
Nodes (14): AppColorPalette, DEEP_OCEAN, FOREST_EMERALD, GLACIAL_ICE, MIDNIGHT_ROSE, SLATE_MINIMAL, WARM_AMBER, ThemeMode (+6 more)

### Community 118 - "Community 118"
Cohesion: 0.13
Nodes (3): NotesRemoteViewsFactory, NotesWidgetService, widgetMarkdownExcerpt()

### Community 119 - "Community 119"
Cohesion: 0.21
Nodes (3): WikiLink, WikiLinkParser, WikiLinkParserTest

### Community 120 - "Community 120"
Cohesion: 0.14
Nodes (19): constantTimePinMatch(), createBackupZipBuffer(), createNoteVaultBuffer(), decryptNoteVaultBuffer(), deriveKeyPBKDF2(), extractPin(), findEdgePath(), findStorePath() (+11 more)

### Community 122 - "Community 122"
Cohesion: 0.14
Nodes (3): AlarmScheduler, AndroidAlarmScheduler, QuickNoteTileService

### Community 123 - "Community 123"
Cohesion: 0.16
Nodes (3): OnTheFlyZipStreamer, ProgressInfo, OnTheFlyZipStreamerTest

### Community 124 - "Community 124"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 125 - "Community 125"
Cohesion: 0.14
Nodes (7): TrashRetentionPolicy, DAYS_14, DAYS_30, DAYS_7, NEVER, TrashCleanupEntryPoint, TrashCleanupWorker

### Community 126 - "Community 126"
Cohesion: 0.17
Nodes (9): check_feature(), generate_docs(), run_audit(), extract_base_tokens(), generate_case_variants(), generate_leet_variants(), generate_turkish_variants(), generate_typo_variants() (+1 more)

### Community 127 - "Community 127"
Cohesion: 0.19
Nodes (5): AttemptsRemaining, BiometricSessionManager, Locked, LockoutStatus, Unlocked

### Community 128 - "Community 128"
Cohesion: 0.15
Nodes (4): QrSyncManager, SyncQrPayload, BackupUiState, UpdateUiState

### Community 129 - "Community 129"
Cohesion: 0.21
Nodes (3): BatchNoteOperationEngine, BatchStatistics, BatchNoteOperationEngineTest

### Community 130 - "Community 130"
Cohesion: 0.20
Nodes (8): DiffLine, DiffResult, DiffType, ADDED, DELETED, UNCHANGED, NoteDiffEngine, NoteDiffEngineTest

### Community 131 - "Community 131"
Cohesion: 0.22
Nodes (4): NoteSummarizerEngine, NoteSummaryResult, ScoredSentence, NoteSummarizerEngineTest

### Community 132 - "Community 132"
Cohesion: 0.18
Nodes (11): crypto, generateTestDataset(), runIntegrityTests(), sha256(), calculateCrc32(), createZip(), dosDateTime(), readZip() (+3 more)

### Community 133 - "Community 133"
Cohesion: 0.18
Nodes (3): WaveformHelper, AudioWaveformScrubber(), WaveformHelperTest

### Community 134 - "Community 134"
Cohesion: 0.15
Nodes (10): trim(), VssScanner, VssSnapshot, creation_time, description, id, is_accessible, original_volume (+2 more)

### Community 137 - "Community 137"
Cohesion: 0.21
Nodes (3): AudioWaveformTrimmer, TrimWindow, AudioWaveformTrimmerTest

### Community 138 - "Community 138"
Cohesion: 0.27
Nodes (4): FindMatch, FindReplaceEngine, FindReplaceResult, FindReplaceEngineTest

### Community 139 - "Community 139"
Cohesion: 0.19
Nodes (11): crypto, generateTestDataset(), runIntegrityTests(), sha256(), calculateCrc32(), createZip(), dosDateTime(), readZip() (+3 more)

### Community 142 - "Community 142"
Cohesion: 0.26
Nodes (3): MarkdownRenderer, Span, MarkdownRendererTest

### Community 143 - "Community 143"
Cohesion: 0.24
Nodes (6): HeadingItem, NoteOutline, NoteOutlineEngine, HeadingRowItem(), NoteOutlineBottomSheet(), NoteOutlineEngineTest

### Community 145 - "Community 145"
Cohesion: 0.19
Nodes (12): getLocalSubnets(), http, httpGet(), net, os, probeTarget(), scanSubnet(), worker() (+4 more)

### Community 146 - "Community 146"
Cohesion: 0.12
Nodes (16): author, description, engines, node, keywords, license, main, name (+8 more)

### Community 147 - "Community 147"
Cohesion: 0.12
Nodes (16): author, description, engines, node, keywords, license, main, name (+8 more)

### Community 149 - "Community 149"
Cohesion: 0.18
Nodes (9): AppUpdateManager, Checking, Downloading, Error, Idle, ReadyToInstall, UpdateAvailable, UpdateStatus (+1 more)

### Community 150 - "Community 150"
Cohesion: 0.25
Nodes (3): GalleryGridCalculator, GalleryGridItem, GalleryGridCalculatorTest

### Community 153 - "Community 153"
Cohesion: 0.14
Nodes (10): driveC, driveD, drives, getFallbackDrives(), isLoadingDrives, loadDrives(), recycleBin, { selectedSource = null, onSelect = () => {}, isScanning = false } (+2 more)

### Community 155 - "Community 155"
Cohesion: 0.15
Nodes (9): AuthenticationError, AuthenticationFailed, AuthenticationLockout, AuthenticationSuccess, AuthenticationCallback, BiometricResult, FeatureUnavailable, HardwareUnavailable (+1 more)

### Community 160 - "Community 160"
Cohesion: 0.29
Nodes (3): apply_mft_fixup(), NtfsScanner, parse_run_list()

### Community 161 - "Community 161"
Cohesion: 0.25
Nodes (10): login(), logout(), POST(), LoginPage(), handleSubmit(), createSession(), decrypt(), deleteSession() (+2 more)

### Community 163 - "Community 163"
Cohesion: 0.25
Nodes (7): DesktopSyncClient, Error, NeedsPassword, Success, SyncResult, SyncServerStatus, SyncUiState

### Community 167 - "Community 167"
Cohesion: 0.31
Nodes (3): ReadingColumnSplitter, SplitColumns, ReadingColumnSplitterTest

### Community 170 - "Community 170"
Cohesion: 0.26
Nodes (5): get_driver_updates(), get_system_updates(), install_updates(), main(), run_powershell_script()

### Community 171 - "Community 171"
Cohesion: 0.17
Nodes (11): ScanStats, bytes_scanned, current_location, error_message, eta_seconds, files_found, percentage, speed_mbps (+3 more)

### Community 173 - "Community 173"
Cohesion: 0.27
Nodes (3): DatabaseMaintenanceManager, MaintenanceResult, MaintenanceUiState

### Community 176 - "Community 176"
Cohesion: 0.23
Nodes (5): run_all_tests(), test_audio_control(), test_basic_import(), test_network_info(), test_system_info()

### Community 177 - "Community 177"
Cohesion: 0.18
Nodes (11): FileSignature, category, extension, footer, header, header_offset, id, max_size (+3 more)

### Community 178 - "Community 178"
Cohesion: 0.33
Nodes (8): createCihaz(), updateCihaz(), DuzenleCihazPage(), dynamic, dynamic, YeniCihazPage(), YeniCihazForm(), handleSubmit()

### Community 180 - "Community 180"
Cohesion: 0.20
Nodes (9): RepairResult, details, file_type, original_file, original_size, repaired_file, repaired_size, success (+1 more)

### Community 181 - "Community 181"
Cohesion: 0.20
Nodes (7): ShredderEngine, ShredResult, bytes_shredded, file_path, message, passes_completed, success

### Community 182 - "Community 182"
Cohesion: 0.20
Nodes (7): copiedText, dumpData, filteredRows, isLoading, { item = null, sourcePath = '', onClose = () => {} }, searchFilter, selectedLength

### Community 184 - "Community 184"
Cohesion: 0.36
Nodes (3): ChecklistParser, ChecklistStats, ChecklistParserTest

### Community 185 - "Community 185"
Cohesion: 0.22
Nodes (6): http, https, { URL }, http, https, { URL }

### Community 186 - "Community 186"
Cohesion: 0.28
Nodes (5): DataStore, GraphData, GraphEdge, GraphNode, newDataStore()

### Community 187 - "Community 187"
Cohesion: 0.22
Nodes (8): WidgetDesignPreset, FROSTED_GLASS, ICE_GLACIAL, MINIMAL_TRANSPARENT, MODERN_RED, NEON_OBSIDIAN, PURE_BLACK, VINTAGE_WARM

### Community 191 - "Community 191"
Cohesion: 0.28
Nodes (5): newDataStore(), DataStore, GraphData, GraphEdge, GraphNode

### Community 196 - "Community 196"
Cohesion: 0.25
Nodes (8): scripts, build, dev, dist:win, pack:win, start, test, test-engine

### Community 197 - "Community 197"
Cohesion: 0.25
Nodes (6): errorMessage, extension, hexBytes, maxSizeMB, name, { onAdd = () => {}, onClose = () => {} }

### Community 199 - "Community 199"
Cohesion: 0.25
Nodes (8): CopyOption, COMPLETED_CHECKLIST, FORMATTED_MARKDOWN, FULL_NOTE, PLAIN_TEXT, REMAINING_CHECKLIST, SUMMARY, TITLE_ONLY

### Community 207 - "Community 207"
Cohesion: 0.38
Nodes (3): MetricCard(), NoteInsightsBottomSheet(), StructureDetailItem()

### Community 210 - "Community 210"
Cohesion: 0.33
Nodes (3): isLoading, { item = null, sourcePath = '', onClose = () => {}, onRecover = () => {} }, previewData

### Community 211 - "Community 211"
Cohesion: 0.67
Nodes (4): getBekleyenIstekler(), IsteklerPanosuClient(), dynamic, Home()

### Community 212 - "Community 212"
Cohesion: 0.33
Nodes (3): getLocalIP(), startUDPDiscoveryResponder(), SyncState

### Community 213 - "Community 213"
Cohesion: 0.60
Nodes (3): AttachmentList(), ImageAttachmentCard(), ModernAudioPlayerCard()

### Community 214 - "Community 214"
Cohesion: 0.33
Nodes (3): getLocalIP(), startUDPDiscoveryResponder(), SyncState

### Community 216 - "Community 216"
Cohesion: 0.60
Nodes (3): DiffLineRow(), DiffStatBadge(), NoteDiffDialog()

### Community 217 - "Community 217"
Cohesion: 0.40
Nodes (5): ImageEditorTab, ADJUST, CROP, DRAW, TEXT

### Community 222 - "Community 222"
Cohesion: 0.50
Nodes (3): svelte@^5.53.8, svelte, app

### Community 223 - "Community 223"
Cohesion: 0.50
Nodes (3): colorStyles, currentTheme, { title = '', value = '', subtitle = '', badge = '', accent = 'cyan' }

### Community 227 - "Community 227"
Cohesion: 0.83
Nodes (3): callApi(), runInstall(), runUninstall()

## Knowledge Gaps
- **389 isolated node(s):** `HardwareUnavailable`, `FeatureUnavailable`, `NoneEnrolled`, `AuthenticationSuccess`, `AuthenticationFailed` (+384 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1894 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **145 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Note` connect `Community 32` to `Community 129`, `Community 1`, `Community 4`, `Community 5`, `Community 10`, `Community 11`, `Community 17`, `Community 20`, `Community 22`, `Community 166`, `Community 40`, `Community 46`, `Community 49`, `Community 52`, `Community 54`, `Community 56`, `Community 74`, `Community 75`, `Community 76`, `Community 202`, `Community 85`, `Community 92`, `Community 97`, `Community 104`, `Community 113`, `Community 118`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `NoteDetailScreen()` (e.g. with `.onAddCategory()` and `.onBackgroundImageChange()`) actually correct?**
  _`NoteDetailScreen()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HardwareUnavailable`, `FeatureUnavailable`, `NoneEnrolled` to the rest of the system?**
  _389 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0332634102487264 - nodes in this community are weakly interconnected._
- **Why does `ReaderActivity` connect `Community 18` to `Community 48`, `Community 68`, `Community 198`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08154059680777238 - nodes in this community are weakly interconnected._
- **Why does `NoteDetailViewModel` connect `Community 20` to `Community 162`, `Community 5`, `Community 4`, `Community 69`, `Community 166`, `Community 71`, `Community 104`, `Community 41`, `Community 102`, `Community 168`, `Community 10`, `Community 109`, `Community 46`, `Community 188`, `Community 213`, `Community 122`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._