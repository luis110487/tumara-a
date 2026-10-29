package com.tumarana.app;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Bundled first-run welcome. Real controls remain accessible and work offline. */
public final class OnboardingView extends FrameLayout {
    private static final int NAVY = Color.rgb(9, 38, 83);
    private static final int ORANGE = Color.rgb(255, 151, 0);

    public OnboardingView(Context context, int initialPage, Runnable onComplete, Runnable onLogin) {
        super(context);
        setBackgroundColor(Color.WHITE);
        addView(new WelcomeBackdrop(context), new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        LinearLayout column = new LinearLayout(context);
        column.setOrientation(LinearLayout.VERTICAL);
        addView(column, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        ScrollView scroll = new ScrollView(context);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        scroll.setVerticalScrollBarEnabled(false);
        column.addView(scroll, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1));
        LinearLayout content = new LinearLayout(context);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(28), dp(24), dp(28), 0);
        scroll.addView(content, new ScrollView.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        ImageView logo = new ImageView(context);
        logo.setImageResource(R.drawable.brand_logo);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription("TuMaraña.com. Conectamos necesidades con habilidades.");
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(254), dp(84));
        logoParams.gravity = Gravity.START;
        logoParams.bottomMargin = dp(16);
        content.addView(logo, logoParams);

        TextView title = label(32, NAVY, true);
        title.setLetterSpacing(-0.035f);
        title.setLineSpacing(0, 1.02f);
        if (android.os.Build.VERSION.SDK_INT >= 28) title.setAccessibilityHeading(true);
        String heading = "Soluciones\npara tu hogar\nen un solo lugar";
        SpannableString emphasis = new SpannableString(heading);
        emphasis.setSpan(new ForegroundColorSpan(Color.rgb(222, 108, 0)),
            heading.indexOf("un solo lugar"), heading.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        title.setText(emphasis);
        content.addView(title, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        TextView subtitle = label(15, Color.rgb(57, 77, 106), false);
        subtitle.setText("Encuentra profesionales.\nCompara perfiles y elige con confianza.");
        subtitle.setLineSpacing(dp(2), 1.1f);
        subtitle.setPadding(0, dp(12), 0, dp(10));
        content.addView(subtitle);

        ImageView art = new ImageView(context);
        art.setImageResource(R.drawable.splash_professionals);
        art.setScaleType(ImageView.ScaleType.FIT_CENTER);
        art.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        int availableHeight = getResources().getConfiguration().screenHeightDp;
        int artHeight = Math.max(230, Math.min(380, availableHeight - 390));
        LinearLayout.LayoutParams artParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1);
        art.setMinimumHeight(dp(artHeight));
        content.addView(art, artParams);

        LinearLayout footer = new LinearLayout(context);
        footer.setOrientation(LinearLayout.VERTICAL);
        footer.setPadding(dp(24), dp(8), dp(24), dp(8));
        footer.setBackgroundColor(Color.WHITE);
        column.addView(footer, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
        Button begin = new Button(context);
        begin.setText("Comenzar  →");
        begin.setAllCaps(false);
        begin.setTextSize(17);
        begin.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        begin.setTextColor(NAVY);
        begin.setBackground(rounded(ORANGE, 28));
        begin.setStateListAnimator(null);
        footer.addView(begin, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(56)));
        begin.setOnClickListener(v -> onComplete.run());

        Button login = new Button(context);
        login.setText("¿Ya tienes una cuenta? Iniciar sesión");
        login.setContentDescription("¿Ya tienes una cuenta? Iniciar sesión");
        login.setAllCaps(false);
        login.setTextSize(13);
        login.setTextColor(NAVY);
        login.setBackgroundColor(Color.TRANSPARENT);
        login.setPadding(0, 0, 0, 0);
        footer.addView(login, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(48)));
        login.setOnClickListener(v -> onLogin.run());
    }

    // Preserve the startup lifecycle contract; the new welcome is a single screen.
    public int getPage() { return 0; }
    public boolean previousPage() { return false; }

    private TextView label(float size, int color, boolean bold) {
        TextView view = new TextView(getContext());
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        return view;
    }
    private GradientDrawable rounded(int color, float radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radius));
        return drawable;
    }
    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private final class WelcomeBackdrop extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        WelcomeBackdrop(Context context) { super(context); setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO); }
        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            paint.setColor(Color.rgb(247, 250, 254));
            canvas.drawCircle(getWidth() * .73f, getHeight() * .68f, getWidth() * .78f, paint);
            paint.setColor(Color.rgb(255, 180, 46));
            canvas.drawCircle(getWidth() + dp(58), dp(136), dp(102), paint);
            paint.setColor(ORANGE);
            canvas.drawCircle(-dp(87), getHeight() * .69f, dp(153), paint);
        }
    }
}
