package com.omnibackup.transfer

import com.omnibackup.transfer.core.server.KtorTransferServer
import com.omnibackup.transfer.core.server.TransferMetricsTracker
import com.omnibackup.transfer.core.server.UploadManager
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.testApplication
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class KtorTransferServerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private val testServer = KtorTransferServer(port = 8888)

    @Test
    fun testSafeContentDispositionTurkishCharacters() {
        val fileName = "Fotoğrafım_2026.jpg"
        val header = testServer.safeContentDisposition(fileName)

        // RFC 6266 standardı: attachment; filename="cleanAscii"; filename*=UTF-8''urlEncoded
        assertTrue("Header attachment ile başlamalı", header.startsWith("attachment;"))
        assertTrue("filename= ASCII fallback parametresini içermeli", header.contains("filename=\"Fotografim_2026.jpg\""))
        assertTrue("filename*= UTF-8 encode parametresini içermeli", header.contains("filename*=UTF-8''"))
        assertTrue("UTF-8 percent encoded olmalı", header.contains("Foto%C4%9Fraf%C4%B1m_2026.jpg"))

        // ASCII fallback kısmında Türkçe özel karakterler olmamalı
        val asciiPart = header.substringAfter("filename=\"").substringBefore("\"")
        assertFalse(asciiPart.contains("ğ"))
        assertFalse(asciiPart.contains("ı"))
        assertFalse(asciiPart.contains("ş"))
        assertFalse(asciiPart.contains("ç"))
        assertFalse(asciiPart.contains("ö"))
        assertFalse(asciiPart.contains("ü"))
    }

    @Test
    fun testSafeContentDispositionSpecialNames() {
        val fileName = "Türkçe Şarkı & Müzik (Full).mp3"
        val header = testServer.safeContentDisposition(fileName)

        assertTrue(header.contains("filename*=UTF-8''"))
        val asciiPart = header.substringAfter("filename=\"").substringBefore("\"")
        assertEquals("Turkce_Sarki___Muzik__Full_.mp3", asciiPart)
    }

    @Test
    fun testRootEndpointReturnsDashboardHtml() = testApplication {
        val server = KtorTransferServer(port = 8080)
        application {
            with(server) { configureServer() }
        }

        val response = client.get("/")
        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.headers[HttpHeaders.ContentType]?.contains("text/html") == true)
        val body = response.bodyAsText()
        assertTrue("Web paneli başlığı veya anahtarı HTML içinde olmalı", body.contains("OmniBackup"))
    }

    @Test
    fun testAuthEndpointValidation() = testApplication {
        val server = KtorTransferServer(port = 8080)
        application {
            with(server) { configureServer() }
        }

        val pin = server.currentPin

        // 1. Doğru PIN ile kimlik doğrulama
        val validResponse = client.post("/api/v1/auth?pin=$pin")
        assertEquals(HttpStatusCode.OK, validResponse.status)
        assertTrue(validResponse.bodyAsText().contains("authenticated"))

        // 2. Yanlış PIN ile kimlik doğrulama
        val invalidResponse = client.post("/api/v1/auth?pin=0000_WRONG")
        assertEquals(HttpStatusCode.Unauthorized, invalidResponse.status)
        assertTrue(invalidResponse.bodyAsText().contains("Geçersiz PIN"))

        // 3. Eksik PIN ile kimlik doğrulama
        val missingPinResponse = client.post("/api/v1/auth")
        assertEquals(HttpStatusCode.Unauthorized, missingPinResponse.status)
    }

    @Test
    fun testUploadsListProtectedEndpoint() = testApplication {
        val server = KtorTransferServer(port = 8080)
        application {
            with(server) { configureServer() }
        }

        // PIN olmadan erişim engellenmeli (401)
        val unauthResponse = client.get("/api/v1/uploads")
        assertEquals(HttpStatusCode.Unauthorized, unauthResponse.status)

        // PIN ile erişim başarılı olmalı (200)
        val authResponse = client.get("/api/v1/uploads?pin=${server.currentPin}")
        assertEquals(HttpStatusCode.OK, authResponse.status)
        assertEquals("[]", authResponse.bodyAsText().trim())
    }

    @Test
    fun testBidirectionalFileUploadAndDownload() = testApplication {
        val uploadDir = tempFolder.newFolder("UploadedStorage")
        val customUploadManager = UploadManager(customStorageDir = uploadDir)
        val server = KtorTransferServer(port = 8080, uploadManager = customUploadManager)

        application {
            with(server) { configureServer() }
        }

        val pin = server.currentPin
        val payloadText = "OmniBackup Transfer Unit Test Payload - Bi-Directional Stream Verification."
        val payloadBytes = payloadText.toByteArray(Charsets.UTF_8)

        // 1. POST /api/v1/upload (PC -> Telefon Aktarımı)
        val uploadResponse = client.submitFormWithBinaryData(
            url = "/api/v1/upload?pin=$pin",
            formData = formData {
                append("file", payloadBytes, Headers.build {
                    append(HttpHeaders.ContentType, "text/plain")
                    append(HttpHeaders.ContentDisposition, "filename=\"test_document.txt\"")
                })
            }
        )

        assertEquals(HttpStatusCode.OK, uploadResponse.status)
        val uploadResponseBody = uploadResponse.bodyAsText()
        assertTrue(uploadResponseBody.contains("\"status\": \"success\""))
        assertTrue(uploadResponseBody.contains("test_document.txt"))

        // Hedef dizindeki dosyanın varlığını ve içeriğini doğrula
        val savedFile = File(uploadDir, "test_document.txt")
        assertTrue("Yüklenen dosya diskte mevcut olmalı", savedFile.exists())
        assertEquals(payloadText, savedFile.readText())

        // UploadManager geçmişinde kayıt olduğunu doğrula
        val uploadsHistory = server.uploadManager.uploadedFiles.value
        assertEquals(1, uploadsHistory.size)
        assertEquals("test_document.txt", uploadsHistory.first().fileName)
        assertTrue(uploadsHistory.first().isSuccess)

        // 2. GET /api/v1/download (Telefon -> PC İndirme)
        val downloadResponse = client.get("/api/v1/download?path=${savedFile.absolutePath}&pin=$pin")
        assertEquals(HttpStatusCode.OK, downloadResponse.status)
        assertEquals(payloadText, downloadResponse.bodyAsText())
        assertTrue(
            downloadResponse.headers[HttpHeaders.ContentDisposition]?.contains("test_document.txt") == true
        )

        // 3. GET /api/v1/download Hata Senaryoları
        val missingPathResponse = client.get("/api/v1/download?pin=$pin")
        assertEquals(HttpStatusCode.BadRequest, missingPathResponse.status)

        val notFoundResponse = client.get("/api/v1/download?path=/tmp/non_existent_file_xyz.txt&pin=$pin")
        assertEquals(HttpStatusCode.NotFound, notFoundResponse.status)

        val unauthDownload = client.get("/api/v1/download?path=${savedFile.absolutePath}")
        assertEquals(HttpStatusCode.Unauthorized, unauthDownload.status)
    }

    @Test
    fun testCategoriesStatsEndpoint() = testApplication {
        val server = KtorTransferServer(port = 8080)
        application {
            with(server) { configureServer() }
        }

        val response = client.get("/api/v1/categories/stats") {
            header("X-Auth-PIN", server.currentPin)
        }

        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(body.contains("photos"))
        assertTrue(body.contains("videos"))
        assertTrue(body.contains("audio"))
        assertTrue(body.contains("documents"))
        assertTrue(body.contains("apps"))
        assertTrue(body.contains("whatsapp"))
    }

    @Test
    fun testCategoryBackupInvalidCategoryBothRoutes() = testApplication {
        val server = KtorTransferServer(port = 8080)
        application {
            with(server) { configureServer() }
        }

        // /backup/category ve /download/category rotaları ve category / type parametreleri testi
        val res1 = client.get("/api/v1/backup/category?type=invalid_xyz&pin=${server.currentPin}")
        assertEquals(HttpStatusCode.BadRequest, res1.status)

        val res2 = client.get("/api/v1/download/category?category=invalid_xyz&pin=${server.currentPin}")
        assertEquals(HttpStatusCode.BadRequest, res2.status)
    }

    @Test
    fun testFilesExplorerEndpoint() = testApplication {
        val server = KtorTransferServer(port = 8080)
        application {
            with(server) { configureServer() }
        }

        val testFolder = tempFolder.newFolder("ExplorerTest")
        File(testFolder, "demo.txt").writeBytes("Demo Content".toByteArray())

        val response = client.get("/api/v1/files?path=${testFolder.absolutePath}&pin=${server.currentPin}")
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(body.contains("demo.txt"))

        val invalidDirResponse = client.get("/api/v1/files?path=/tmp/invalid_folder_not_exist_123&pin=${server.currentPin}")
        assertEquals(HttpStatusCode.BadRequest, invalidDirResponse.status)
    }

    @Test
    fun testTransferMetricsTrackerCalculations() {
        val totalBytes = 10 * 1024 * 1024L // 10 MB
        val tracker = TransferMetricsTracker(totalBytes)

        val metric = tracker.updateProgress(5 * 1024 * 1024L, "test_file.dat")
        if (metric != null) {
            assertEquals(50.0f, metric.percentage, 0.1f)
            assertFalse(metric.isCompleted)
            assertEquals("test_file.dat", metric.currentFile)
        }

        val finishMetric = tracker.finish()
        assertEquals(100.0f, finishMetric.percentage, 0.01f)
        assertTrue(finishMetric.isCompleted)
        assertEquals(0L, finishMetric.etaSeconds)
        assertEquals("Tamamlandı", finishMetric.currentFile)
    }
}
