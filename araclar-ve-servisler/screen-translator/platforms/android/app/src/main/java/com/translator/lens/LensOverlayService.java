package com.translator.lens;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.WindowManager;
import java.util.List;

/**
 * Ekranın üzerinde kayan Google Lens arayüzünü (LensSliderView)
 * yöneten ön plan Android servisi.
 * Saf Java ile kodlanmıştır (Kotlin içermez).
 */
public class LensOverlayService extends Service {

    private WindowManager windowManager;
    private LensSliderView overlayView;
    private WindowManager.LayoutParams params;
    private final IBinder binder = new LocalBinder();

    public class LocalBinder extends Binder {
        public LensOverlayService getService() {
            return LensOverlayService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(1001, buildNotification());

        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        overlayView = new LensSliderView(this);

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        windowManager.addView(overlayView, params);
    }

    public void updateBlocks(List<TextBlockModel> blocks) {
        if (overlayView != null) {
            overlayView.updateBlocks(blocks);
        }
    }

    public void setClickThrough(boolean clickThrough) {
        if (overlayView != null && windowManager != null) {
            if (clickThrough) {
                params.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
            } else {
                params.flags &= ~WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
            }
            windowManager.updateViewLayout(overlayView, params);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null && windowManager != null) {
            windowManager.removeView(overlayView);
            overlayView = null;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "lens_overlay_channel",
                "Google Lens Ekran Çevirisi",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, "lens_overlay_channel");
        } else {
            builder = new Notification.Builder(this);
        }
        return builder.setContentTitle("Screen Translator AI Aktif")
            .setContentText("Google Lens kaydırmalı ekran çevirisi çalışıyor.")
            .setSmallIcon(android.R.drawable.ic_menu_search)
            .build();
    }
}
