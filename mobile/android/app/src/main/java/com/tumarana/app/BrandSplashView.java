package com.tumarana.app;

import android.content.Context;
import android.graphics.*;
import android.view.View;

/** Local Android launch artwork. Coordinates scale to the available window. */
public final class BrandSplashView extends View {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Bitmap professionals;
    private final Bitmap logo;
    private final Typeface bold = Typeface.create("sans-serif", Typeface.BOLD);
    private final Typeface regular = Typeface.create("sans-serif", Typeface.NORMAL);
    private String status = "Conectando contigo…";
    private boolean retry;
    private static final int NAVY = Color.rgb(4, 35, 77);
    private static final int ORANGE = Color.rgb(255, 172, 0);

    public BrandSplashView(Context context) {
        super(context);
        professionals = BitmapFactory.decodeResource(getResources(), R.drawable.splash_professionals);
        logo = BitmapFactory.decodeResource(getResources(), R.drawable.brand_logo);
        setContentDescription("TuMaraña.com. Conectamos necesidades con habilidades. Cargando aplicación.");
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_YES);
        setFocusable(true);
    }

    public void setRetry(boolean value) {
        retry = value;
        status = value ? "No pudimos conectar. Toca para reintentar" : "Conectando contigo…";
        setClickable(value);
        setContentDescription(value ? status : "TuMaraña.com. Cargando aplicación.");
        if (value && isShown()) announceForAccessibility(status);
        invalidate();
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float w = getWidth(), h = getHeight();
        if (w == 0 || h == 0) return;
        // A bounded portrait composition remains legible on tablets and landscape.
        float unit = Math.min(w / 360f, h / 720f);
        canvas.save();
        paint.setShader(new LinearGradient(0, 0, w, h,
            new int[]{Color.WHITE, Color.WHITE, Color.WHITE}, null, Shader.TileMode.CLAMP));
        canvas.drawRect(0, 0, w, h, paint);
        paint.setShader(null);
        canvas.translate((w - 360 * unit) / 2, (h - 720 * unit) / 2);
        canvas.scale(unit, unit);

        // Original logo artwork, with its original colors on white.
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.WHITE);
        float logoHeight = 316f * logo.getHeight() / logo.getWidth();
        canvas.drawBitmap(logo, null, new RectF(22, 165 - logoHeight / 2, 338, 165 + logoHeight / 2), paint);
        // The same locally bundled professionals used by the existing product.
        float imageHeight = 314, imageWidth = imageHeight * professionals.getWidth() / professionals.getHeight();
        canvas.drawBitmap(professionals, null,
            new RectF((360 - imageWidth) / 2, 320, (360 + imageWidth) / 2, 320 + imageHeight), paint);
        paint.setShader(new LinearGradient(0, 520, 0, 650,
            new int[]{Color.TRANSPARENT, Color.WHITE}, null, Shader.TileMode.CLAMP));
        canvas.drawRect(0, 520, 360, 655, paint);
        paint.setShader(null);
        text(canvas, "Servicios y profesionales", 180, 622, 18, NAVY, bold, Paint.Align.CENTER);
        text(canvas, "de confianza en un solo lugar", 180, 646, 18, NAVY, bold, Paint.Align.CENTER);
        paint.setColor(Color.rgb(76, 104, 141));
        canvas.drawRoundRect(106, 670, 254, 674, 2, 2, paint);
        paint.setColor(ORANGE);
        canvas.drawRoundRect(106, 670, retry ? 254 : 160, 674, 2, 2, paint);
        text(canvas, status, 180, 700, retry ? 12 : 11, NAVY, regular, Paint.Align.CENTER);
        canvas.restore();
    }

    private void text(Canvas canvas, String value, float x, float y, float size, int color, Typeface type, Paint.Align align) {
        paint.setShader(null); paint.setStyle(Paint.Style.FILL);
        paint.setColor(color); paint.setTextSize(size); paint.setTypeface(type); paint.setTextAlign(align);
        canvas.drawText(value, x, y, paint);
    }
}
