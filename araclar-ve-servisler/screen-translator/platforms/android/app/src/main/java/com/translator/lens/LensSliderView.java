package com.translator.lens;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.List;

/**
 * Android için Google Lens tarzı kaydırmalı (swipe slider) görünüm.
 * Kullanıcı parmağını ekranda gezdirdikçe perdeleme efekti ile
 * orijinal ekran ile yapay zeka çevirisini yan yana gösterir.
 * Saf Java ile kodlanmıştır (Kotlin ve Node.js/Electron içermez).
 */
public class LensSliderView extends View {

    private List<TextBlockModel> blocks = new ArrayList<>();
    private float sliderRatio = 0.5f; // Başlangıçta ekranın %50'si
    private boolean isDragging = false;
    private final float handleRadius = 45f;

    // Çizim nesneleri
    private final Paint bgBoxPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint sliderLinePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint handlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint handleTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    public LensSliderView(Context context) {
        super(context);
        initPaints();
    }

    private void initPaints() {
        // Metin kutusu koyu arka planı
        bgBoxPaint.setColor(Color.argb(220, 15, 23, 42)); // Modern slate
        bgBoxPaint.setStyle(Paint.Style.FILL);

        // Metin boyası
        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(36f);
        textPaint.setFakeBoldText(true);

        // Metin kutusu kenarlığı
        borderPaint.setColor(Color.argb(160, 99, 102, 241)); // Indigo vurgusu
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(3f);

        // Perde ayırıcı çizgisi
        sliderLinePaint.setColor(Color.argb(240, 255, 255, 255));
        sliderLinePaint.setStrokeWidth(6f);

        // Kaydırıcı tutamağı
        handlePaint.setColor(Color.argb(250, 79, 70, 229));
        handlePaint.setStyle(Paint.Style.FILL);

        // Tutamak içindeki simge
        handleTextPaint.setColor(Color.WHITE);
        handleTextPaint.setTextSize(28f);
        handleTextPaint.setTextAlign(Paint.Align.CENTER);
        handleTextPaint.setFakeBoldText(true);
    }

    public void updateBlocks(List<TextBlockModel> newBlocks) {
        this.blocks = (newBlocks != null) ? newBlocks : new ArrayList<>();
        invalidate(); // Yeniden çiz
    }

    public void setSliderRatio(float ratio) {
        this.sliderRatio = Math.max(0.05f, Math.min(0.95f, ratio));
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        int h = getHeight();
        if (w == 0 || h == 0) return;

        float sliderX = w * sliderRatio;

        // 1. Google Lens Perde Efekti (Slider'ın sağ tarafına çevirileri çiz)
        canvas.save();
        canvas.clipRect(sliderX, 0, w, h);
        drawTranslatedBlocks(canvas);
        canvas.restore();

        // 2. Dikey Perde Çizgisi
        canvas.drawLine(sliderX, 0, sliderX, h, sliderLinePaint);

        // 3. Ortadaki Tutamak (Rozet)
        float centerY = h / 2.0f;
        canvas.drawCircle(sliderX, centerY, handleRadius, handlePaint);
        canvas.drawText("◀ ▶", sliderX, centerY + 10f, handleTextPaint);
    }

    private void drawTranslatedBlocks(Canvas canvas) {
        for (TextBlockModel block : blocks) {
            String translated = block.getTranslatedText();
            if (translated == null || translated.trim().isEmpty()) continue;

            RectF rect = new RectF(
                block.getX() - 6,
                block.getY() - 4,
                block.getRight() + 6,
                block.getBottom() + 4
            );

            // Arka plan ve kenarlık
            canvas.drawRoundRect(rect, 10f, 10f, bgBoxPaint);
            canvas.drawRoundRect(rect, 10f, 10f, borderPaint);

            // Yazı boyutunu kutuya göre uyarla
            float targetTextSize = Math.max(24f, block.getHeight() * 0.65f);
            textPaint.setTextSize(targetTextSize);

            // Metni dikeyde ortala
            Paint.FontMetrics fm = textPaint.getFontMetrics();
            float baseline = rect.centerY() - (fm.ascent + fm.descent) / 2.0f;
            canvas.drawText(translated, rect.left + 8f, baseline, textPaint);
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        float x = event.getX();
        float currentSliderX = getWidth() * sliderRatio;

        switch (event.getAction()) {
            case MotionEvent.ACTION_DOWN:
                if (Math.abs(x - currentSliderX) <= (handleRadius * 2.0f)) {
                    isDragging = true;
                    return true;
                }
                break;
            case MotionEvent.ACTION_MOVE:
                if (isDragging) {
                    sliderRatio = Math.max(0.05f, Math.min(0.95f, x / (float) getWidth()));
                    invalidate();
                    return true;
                }
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (isDragging) {
                    isDragging = false;
                    return true;
                }
                break;
        }
        return super.onTouchEvent(event);
    }
}
