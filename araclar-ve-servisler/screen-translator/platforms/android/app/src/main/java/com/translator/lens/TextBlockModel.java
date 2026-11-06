package com.translator.lens;

/**
 * Android tarafında algılanan ve çevrilen metin bloklarının veri modeli.
 * Saf Java ile yazılmıştır (Kotlin içermez).
 */
public class TextBlockModel {
    private String text;
    private String translatedText;
    private int x;
    private int y;
    private int width;
    private int height;
    private float confidence;

    public TextBlockModel(String text, String translatedText, int x, int y, int width, int height) {
        this.text = text;
        this.translatedText = translatedText;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.confidence = 1.0f;
    }

    public String getText() { return text; }
    public String getTranslatedText() { return translatedText; }
    public void setTranslatedText(String translatedText) { this.translatedText = translatedText; }

    public int getX() { return x; }
    public int getY() { return y; }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public int getRight() { return x + width; }
    public int getBottom() { return y + height; }
    public float getConfidence() { return confidence; }
}
