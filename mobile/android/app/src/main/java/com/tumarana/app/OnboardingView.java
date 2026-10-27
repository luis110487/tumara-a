package com.tumarana.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Offline, accessible first-run introduction. No changes to the hosted website. */
public final class OnboardingView extends FrameLayout {
    private static final int NAVY = Color.rgb(4, 35, 77);
    private static final int ORANGE = Color.rgb(255, 164, 0);
    private static final String[][] PAGES = {
        {"Encuentra profesionales", "de confianza", "Hogar, negocio y soluciones para tu día a día.",
         "Perfiles con verificación", "Contacto directo", "Calificaciones de clientes", "Solicita desde tu celular"},
        {"Compara y elige", "con tranquilidad", "Conoce a los profesionales antes de solicitar un servicio.",
         "Explora por categoría", "Busca en tu ciudad", "Consulta experiencia y reseñas", "Conoce sus trabajos"},
        {"Cuéntanos", "qué necesitas", "Envía tu solicitud al profesional que elijas.",
         "Describe tu necesidad", "Indica tu ubicación", "Propón una fecha y una hora", "Revisa antes de enviar"},
        {"Conversa y coordina", "en un solo lugar", "Continúa la conversación desde la solicitud de tu servicio.",
         "Mensajes dentro de la app", "Consulta tus solicitudes", "Coordina con el profesional", "Comparte tu experiencia"}
    };
    private final TextView title, subtitle, position;
    private final LinearLayout benefits;
    private final ScrollView scroll;
    private final Button[] dots = new Button[PAGES.length];
    private final Runnable onComplete;
    private int page;
    private float startX, startY;
    private boolean horizontalSwipe;

    public OnboardingView(Context context, int initialPage, Runnable onComplete) {
        super(context);
        this.onComplete = onComplete;
        setBackgroundColor(Color.WHITE);
        LinearLayout column = new LinearLayout(context);
        column.setOrientation(LinearLayout.VERTICAL);
        addView(column, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        FrameLayout header = new FrameLayout(context);
        column.addView(header, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(82)));
        ImageView logo = new ImageView(context);
        logo.setImageResource(R.drawable.brand_logo);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription("TuMaraña.com");
        LayoutParams logoParams = new LayoutParams(dp(152), dp(76), Gravity.CENTER);
        header.addView(logo, logoParams);
        Button skip = new Button(context);
        skip.setText(R.string.onboarding_skip); skip.setAllCaps(false); skip.setTextSize(14);
        skip.setTextColor(NAVY); skip.setBackgroundColor(Color.TRANSPARENT);
        skip.setContentDescription("Saltar introducción");
        header.addView(skip, new LayoutParams(dp(76), dp(56), Gravity.END | Gravity.TOP));
        skip.setOnClickListener(v -> this.onComplete.run());

        scroll = new ScrollView(context);
        scroll.setFillViewport(true);
        column.addView(scroll, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1));
        LinearLayout content = new LinearLayout(context);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(24), dp(4), dp(24), dp(8));
        scroll.addView(content, new ScrollView.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
        title = label(30, NAVY, true);
        if (android.os.Build.VERSION.SDK_INT >= 28) title.setAccessibilityHeading(true);
        content.addView(title);
        subtitle = label(16, NAVY, false);
        subtitle.setPadding(0, dp(10), 0, dp(12));
        content.addView(subtitle);
        ImageView art = new ImageView(context);
        art.setImageResource(R.drawable.splash_professionals);
        art.setScaleType(ImageView.ScaleType.FIT_CENTER);
        art.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        art.setBackground(rounded(Color.rgb(239, 245, 252), 22));
        int availableHeight = getResources().getConfiguration().screenHeightDp;
        int artHeight = Math.min(235, Math.max(150, availableHeight / 3));
        content.addView(art, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(artHeight)));
        benefits = new LinearLayout(context);
        benefits.setOrientation(LinearLayout.VERTICAL);
        benefits.setPadding(0, dp(14), 0, 0);
        content.addView(benefits);

        LinearLayout footer = new LinearLayout(context);
        footer.setOrientation(LinearLayout.VERTICAL);
        footer.setPadding(dp(20), 0, dp(20), dp(16));
        column.addView(footer);
        LinearLayout indicators = new LinearLayout(context);
        indicators.setGravity(Gravity.CENTER);
        footer.addView(indicators, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(48)));
        for (int i = 0; i < dots.length; i++) {
            final int destination = i;
            Button dot = new Button(context);
            dot.setText("●"); dot.setTextSize(14); dot.setMinWidth(0); dot.setMinimumWidth(0);
            dot.setPadding(0, 0, 0, 0); dot.setBackgroundColor(Color.TRANSPARENT);
            dot.setOnClickListener(v -> showPage(destination, true));
            dots[i] = dot;
            indicators.addView(dot, new LinearLayout.LayoutParams(dp(48), dp(48)));
        }
        position = label(12, Color.rgb(84, 102, 130), false);
        position.setGravity(Gravity.CENTER);
        position.setPadding(0, 0, 0, dp(8));
        footer.addView(position);
        Button begin = new Button(context);
        begin.setText(R.string.onboarding_begin); begin.setAllCaps(false); begin.setTextSize(17);
        begin.setTypeface(Typeface.DEFAULT, Typeface.BOLD); begin.setTextColor(NAVY);
        begin.setBackground(rounded(ORANGE, 12));
        footer.addView(begin, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(52)));
        begin.setOnClickListener(v -> this.onComplete.run());
        showPage(initialPage, false);
    }

    public int getPage() { return page; }
    public boolean previousPage() {
        if (page == 0) return false;
        showPage(page - 1, true);
        return true;
    }

    private void showPage(int destination, boolean announce) {
        page = Math.max(0, Math.min(PAGES.length - 1, destination));
        String[] data = PAGES[page];
        SpannableString heading = new SpannableString(data[0] + "\n" + data[1]);
        heading.setSpan(new ForegroundColorSpan(Color.rgb(226, 116, 0)), data[0].length() + 1,
            heading.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        title.setText(heading); subtitle.setText(data[2]);
        benefits.removeAllViews();
        for (int i = 3; i < data.length; i++) {
            LinearLayout row = new LinearLayout(getContext());
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, dp(4), 0, dp(4));
            TextView check = label(13, Color.WHITE, true);
            check.setText("✓"); check.setGravity(Gravity.CENTER);
            check.setBackground(rounded(NAVY, 20));
            check.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            row.addView(check, new LinearLayout.LayoutParams(dp(23), dp(23)));
            TextView text = label(14, NAVY, false);
            text.setText(data[i]); text.setPadding(dp(10), 0, 0, 0);
            row.addView(text, new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));
            benefits.addView(row);
        }
        for (int i = 0; i < dots.length; i++) {
            dots[i].setTextColor(i == page ? ORANGE : Color.rgb(185, 202, 224));
            dots[i].setSelected(i == page);
            dots[i].setContentDescription("Pantalla " + (i + 1) + " de " + dots.length + (i == page ? ", actual" : ""));
        }
        position.setText(getResources().getString(R.string.onboarding_position, page + 1, PAGES.length));
        scroll.post(() -> scroll.scrollTo(0, 0));
        if (announce) announceForAccessibility(title.getText() + ". " + position.getText());
    }

    @Override public boolean onInterceptTouchEvent(MotionEvent event) {
        if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
            startX = event.getX(); startY = event.getY(); horizontalSwipe = false;
        } else if (event.getActionMasked() == MotionEvent.ACTION_MOVE) {
            float dx = Math.abs(event.getX() - startX), dy = Math.abs(event.getY() - startY);
            if (dx > dp(32) && dx > dy * 1.5f) { horizontalSwipe = true; return true; }
        }
        return super.onInterceptTouchEvent(event);
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        if (!horizontalSwipe) return super.onTouchEvent(event);
        if (event.getActionMasked() == MotionEvent.ACTION_UP) {
            float distance = event.getX() - startX;
            if (Math.abs(distance) > dp(48)) showPage(page + (distance < 0 ? 1 : -1), true);
            else performClick();
            horizontalSwipe = false;
        } else if (event.getActionMasked() == MotionEvent.ACTION_CANCEL) horizontalSwipe = false;
        return true;
    }

    @Override public boolean performClick() { return super.performClick(); }

    private TextView label(float size, int color, boolean bold) {
        TextView view = new TextView(getContext());
        view.setTextSize(size); view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }
    private GradientDrawable rounded(int color, float radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color); drawable.setCornerRadius(dp(radius));
        return drawable;
    }
    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
