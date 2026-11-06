package com.translator.lens;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Android başlatıcı aktivitesi.
 * Kullanıcıdan gerekli sistem izinlerini (Overlay & MediaProjection) alır ve
 * servisleri başlatır. Saf Java ile kodlanmıştır (Kotlin ve Node.js içermez).
 */
public class MainActivity extends Activity {

    private static final int REQUEST_OVERLAY_PERMISSION = 2001;
    private static final int REQUEST_MEDIA_PROJECTION = 2002;

    private MediaProjectionManager projectionManager;
    private TextView statusTextView;
    private Button startButton;
    private Button stopButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Arayüzü dinamik oluştur (Saf Java)
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(48, 80, 48, 80);
        layout.setGravity(android.view.Gravity.CENTER_HORIZONTAL);

        TextView titleView = new TextView(this);
        titleView.setText("Screen Translator AI\nGoogle Lens Stili Ekran Çevirisi");
        titleView.setTextSize(22f);
        titleView.setTextAlignment(TextView.TEXT_ALIGNMENT_CENTER);
        titleView.setTextColor(android.graphics.Color.WHITE);
        titleView.setPadding(0, 0, 0, 48);
        layout.addView(titleView);

        statusTextView = new TextView(this);
        statusTextView.setText("Durum: Hazır (İzin bekleniyor)");
        statusTextView.setTextSize(16f);
        statusTextView.setTextColor(android.graphics.Color.LTGRAY);
        statusTextView.setPadding(0, 0, 0, 48);
        layout.addView(statusTextView);

        startButton = new Button(this);
        startButton.setText("Google Lens Çeviriyi Başlat");
        startButton.setBackgroundColor(android.graphics.Color.parseColor("#4F46E5")); // Indigo
        startButton.setTextColor(android.graphics.Color.WHITE);
        startButton.setPadding(24, 24, 24, 24);
        startButton.setOnClickListener(v -> checkPermissionsAndStart());
        layout.addView(startButton);

        stopButton = new Button(this);
        stopButton.setText("Çeviriyi Durdur");
        stopButton.setBackgroundColor(android.graphics.Color.parseColor("#EF4444")); // Red
        stopButton.setTextColor(android.graphics.Color.WHITE);
        stopButton.setPadding(24, 24, 24, 24);
        stopButton.setOnClickListener(v -> stopTranslationServices());
        layout.addView(stopButton);

        layout.setBackgroundColor(android.graphics.Color.parseColor("#0F172A")); // Koyu tema
        setContentView(layout);

        projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
    }

    private void checkPermissionsAndStart() {
        // 1. Kayan Pencere (Overlay) İzni Kontrolü
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "Lütfen diğer uygulamaların üzerinde gösterme izni verin.", Toast.LENGTH_LONG).show();
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION);
                return;
            }
        }

        // 2. Ekran Yakalama (MediaProjection) İzni İstemi
        if (projectionManager != null) {
            startActivityForResult(projectionManager.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_OVERLAY_PERMISSION) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                checkPermissionsAndStart();
            } else {
                Toast.makeText(this, "Kayan pencere izni reddedildi.", Toast.LENGTH_SHORT).show();
            }
        } else if (requestCode == REQUEST_MEDIA_PROJECTION) {
            if (resultCode == RESULT_OK && data != null) {
                startTranslationServices(resultCode, data);
            } else {
                Toast.makeText(this, "Ekran yakalama izni verilmedi.", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void startTranslationServices(int resultCode, Intent data) {
        // Overlay Servisini Başlat
        Intent overlayIntent = new Intent(this, LensOverlayService.class);
        startService(overlayIntent);

        // Ekran Yakalama Servisini Başlat
        Intent captureIntent = new Intent(this, ScreenCaptureService.class);
        captureIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, resultCode);
        captureIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, data);
        startService(captureIntent);

        statusTextView.setText("Durum: Google Lens Çeviri Aktif!");
        Toast.makeText(this, "Screen Translator AI Başlatıldı!", Toast.LENGTH_SHORT).show();
        moveTaskToBack(true); // Arka plana geç
    }

    private void stopTranslationServices() {
        stopService(new Intent(this, LensOverlayService.class));
        stopService(new Intent(this, ScreenCaptureService.class));
        statusTextView.setText("Durum: Durduruldu.");
        Toast.makeText(this, "Çeviri durduruldu.", Toast.LENGTH_SHORT).show();
    }
}
