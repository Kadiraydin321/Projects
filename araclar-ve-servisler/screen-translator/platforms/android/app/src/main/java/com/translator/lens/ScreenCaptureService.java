package com.translator.lens;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.view.WindowManager;
import java.nio.ByteBuffer;

/**
 * Android 10+ uyumlu, MediaProjection tabanlı donanım hızlandırmalı
 * ekran yakalama servisi.
 * Saf Java ile kodlanmıştır (Kotlin içermez).
 */
public class ScreenCaptureService extends Service {

    public static final String EXTRA_RESULT_CODE = "RESULT_CODE";
    public static final String EXTRA_RESULT_DATA = "RESULT_DATA";

    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private int screenWidth;
    private int screenHeight;
    private int screenDensity;

    public interface FrameCallback {
        void onFrameAvailable(Bitmap bitmap);
    }
    private static FrameCallback frameCallback;

    public static void setFrameCallback(FrameCallback callback) {
        frameCallback = callback;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();
        startForeground(1002, buildNotification());

        if (intent != null) {
            int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
            Intent resultData = intent.getParcelableExtra(EXTRA_RESULT_DATA);

            if (resultCode != 0 && resultData != null) {
                initMediaProjection(resultCode, resultData);
            }
        }
        return START_NOT_STICKY;
    }

    private void initMediaProjection(int resultCode, Intent resultData) {
        WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics metrics = new DisplayMetrics();
        if (wm != null) {
            wm.getDefaultDisplay().getRealMetrics(metrics);
        }
        screenWidth = metrics.widthPixels;
        screenHeight = metrics.heightPixels;
        screenDensity = metrics.densityDpi;

        MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (mpm != null) {
            mediaProjection = mpm.getMediaProjection(resultCode, resultData);
            if (mediaProjection != null) {
                setupVirtualDisplay();
            }
        }
    }

    private void setupVirtualDisplay() {
        imageReader = ImageReader.newInstance(screenWidth, screenHeight, PixelFormat.RGBA_8888, 2);
        virtualDisplay = mediaProjection.createVirtualDisplay(
            "ScreenCapture",
            screenWidth,
            screenHeight,
            screenDensity,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.getSurface(),
            null,
            null
        );

        imageReader.setOnImageAvailableListener(reader -> {
            Image image = null;
            try {
                image = reader.acquireLatestImage();
                if (image != null && frameCallback != null) {
                    Bitmap bitmap = convertImageToBitmap(image);
                    if (bitmap != null) {
                        frameCallback.onFrameAvailable(bitmap);
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (image != null) {
                    image.close();
                }
            }
        }, null);
    }

    private Bitmap convertImageToBitmap(Image image) {
        Image.Plane[] planes = image.getPlanes();
        ByteBuffer buffer = planes[0].getBuffer();
        int pixelStride = planes[0].getPixelStride();
        int rowStride = planes[0].getRowStride();
        int rowPadding = rowStride - pixelStride * screenWidth;

        Bitmap bitmap = Bitmap.createBitmap(
            screenWidth + rowPadding / pixelStride,
            screenHeight,
            Bitmap.Config.ARGB_8888
        );
        bitmap.copyPixelsFromBuffer(buffer);
        return bitmap;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (virtualDisplay != null) {
            virtualDisplay.release();
            virtualDisplay = null;
        }
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "capture_channel",
                "Ekran Yakalama Servisi",
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
            builder = new Notification.Builder(this, "capture_channel");
        } else {
            builder = new Notification.Builder(this);
        }
        return builder.setContentTitle("Ekran Yakalama Aktif")
            .setContentText("Anlık ekran metinleri taranıyor...")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .build();
    }
}
