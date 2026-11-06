package com.translator.lens;

import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Android istemcisi ile Python Çekirdek Motoru veya Google Gemini API
 * arasında ultra hafif eşzamansız JSON haberleşmesini sağlayan köprü.
 * Saf Java ile yazılmıştır (Kotlin ve Node.js içermez).
 */
public class TranslationBridgeClient {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String serverUrl = "http://10.0.2.2:8765/translate"; // Standart Python yerel köprüsü
    private String geminiApiKey = "";

    public interface TranslationCallback {
        void onSuccess(List<TextBlockModel> updatedBlocks);
        void onError(Exception e);
    }

    public TranslationBridgeClient() {}

    public void setServerUrl(String url) {
        this.serverUrl = url;
    }

    public void setGeminiApiKey(String apiKey) {
        this.geminiApiKey = apiKey;
    }

    /**
     * Algılanan blokları Python motoruna veya Gemini API'ye toplu olarak gönderir.
     */
    public void translateBlocksAsync(List<TextBlockModel> blocks, TranslationCallback callback) {
        if (blocks == null || blocks.isEmpty()) {
            if (callback != null) callback.onSuccess(new ArrayList<>());
            return;
        }

        executor.execute(() -> {
            try {
                // JSON yükünü hazırla
                JSONArray textArray = new JSONArray();
                for (TextBlockModel block : blocks) {
                    textArray.put(block.getText());
                }

                JSONObject payload = new JSONObject();
                payload.put("texts", textArray);
                payload.put("target_lang", "tr");

                // HTTP POST isteği
                URL url = new URL(serverUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setConnectTimeout(3000);
                conn.setReadTimeout(5000);
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line.trim());
                    }

                    JSONObject resObj = new JSONObject(response.toString());
                    JSONArray transArray = resObj.getJSONArray("translations");

                    for (int i = 0; i < blocks.size() && i < transArray.length(); i++) {
                        blocks.get(i).setTranslatedText(transArray.getString(i));
                    }

                    mainHandler.post(() -> {
                        if (callback != null) callback.onSuccess(blocks);
                    });
                } else {
                    throw new Exception("HTTP Hata Kodu: " + code);
                }

            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (callback != null) callback.onError(e);
                });
            }
        });
    }
}
