-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# AndroidX Core
-dontwarn androidx.**
-keep class androidx.core.content.FileProvider { *; }

# Coroutines
-dontwarn kotlinx.coroutines.**

# App models
-keep class com.birin.moonnovel.NovelItem { *; }
