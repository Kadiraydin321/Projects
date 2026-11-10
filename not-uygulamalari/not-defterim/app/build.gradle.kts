plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.example.noteapp"
    compileSdk = 35
    buildToolsVersion = "36.1.0"

    defaultConfig {
        applicationId = "com.example.noteapp"
        minSdk = 26
        targetSdk = 35
        versionCode = 37
        versionName = "1.5.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("Long", "BUILD_TIME", "${System.currentTimeMillis()}L")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation("org.nanohttpd:nanohttpd:2.3.1")

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    // Room
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)

    // Biometric & Coroutines & Coil & WorkManager
    implementation(libs.androidx.biometric)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.coil.compose)
    implementation(libs.androidx.work.runtime.ktx)

    // ML Kit OCR & Barcode Scanning
    implementation("com.google.android.gms:play-services-mlkit-text-recognition:19.0.1")
    implementation("com.google.android.gms:play-services-mlkit-barcode-scanning:18.3.1")

    // CameraX
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")

    // ZXing Core
    implementation("com.google.zxing:core:3.5.3")

    debugImplementation(libs.androidx.ui.tooling)
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}

tasks.register("exportApkToRoot") {
    description = "Derlenen release APK'sini dogrudan NotDefterim kok dizinine kopyalar ve surum bilgisini senkronize eder."
    group = "distribution"
    dependsOn("assembleRelease")
    doLast {
        val releaseApk = file("build/outputs/apk/release/app-release.apk")
        val targetApk = file("../NoteApp-release.apk")
        if (releaseApk.exists()) {
            releaseApk.copyTo(targetApk, overwrite = true)
            val vName = android.defaultConfig.versionName ?: "1.5.0"
            val vCode = android.defaultConfig.versionCode ?: 37
            val versionFile = file("../version.json")
            versionFile.writeText(
                """{
  "appName": "NotDefterim",
  "version": "$vName",
  "versionName": "$vName",
  "versionCode": $vCode,
  "apkFileName": "NoteApp-release.apk",
  "minSdk": 26,
  "targetSdk": 35,
  "buildDate": "${java.time.LocalDate.now()}",
  "notes": "APK NotDefterim kok dizininde saklanmakta ve tum surum bilgisi bu dosyadan dinamik cekilmektedir."
}
"""
            )
            println("[NotDefterim] APK ve surum bilgisi ana dizine guncellendi: ${targetApk.absolutePath}")
        }
    }
}
