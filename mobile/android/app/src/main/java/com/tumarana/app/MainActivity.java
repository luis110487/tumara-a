package com.tumarana.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceResponse;
import android.widget.FrameLayout;
import androidx.core.splashscreen.SplashScreen;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Handler startupHandler = new Handler(Looper.getMainLooper());
    private long splashDeadline;
    private boolean brandTimeElapsed;
    private BrandSplashView splash;
    private OnboardingView onboarding;
    private OnBackPressedCallback onboardingBack;
    private boolean contentReady;
    private boolean polling;
    private boolean failed;
    private final Runnable timeout = () -> showRetry();

    @Override public void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(DeviceLocationPlugin.class);
        registerPlugin(DeviceInputModePlugin.class);
        registerPlugin(DeviceNotificationsPlugin.class);
        super.onCreate(state);
        if (getBridge() == null) return;
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (contentReady && onboarding == null && splash == null && getBridge() != null)
                    getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('tm:android-back'));", null);
            }
        });
        useLightBars();
        splash = new BrandSplashView(this);
        addContentView(splash, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        splashDeadline = state == null ? android.os.SystemClock.elapsedRealtime() + StartupTiming.MIN_BRAND_MS
            : state.getLong("splash_deadline", android.os.SystemClock.elapsedRealtime() + StartupTiming.MIN_BRAND_MS);
        splash.post(() -> startupHandler.postDelayed(() -> {
            brandTimeElapsed = true;
            advanceStartup();
        }, StartupTiming.remaining(android.os.SystemClock.elapsedRealtime(), splashDeadline)));
        if (!getPreferences(MODE_PRIVATE).getBoolean("onboarding_complete_v1", false)) {
            onboarding = new OnboardingView(this, state == null ? 0 : state.getInt("onboarding_page", 0), this::completeOnboarding);
            addContentView(onboarding, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            onboarding.setVisibility(View.INVISIBLE);
            onboardingBack = new OnBackPressedCallback(false) {
                @Override public void handleOnBackPressed() {
                    if (onboarding != null && !onboarding.previousPage()) completeOnboarding();
                }
            };
            getOnBackPressedDispatcher().addCallback(this, onboardingBack);
        }
        splash.setOnClickListener(v -> {
            if (!failed) return;
            failed = false;
            polling = false;
            splash.setRetry(false);
            handler.removeCallbacksAndMessages(null);
            handler.postDelayed(timeout, 20000);
            getBridge().getWebView().loadUrl(getBridge().getAppUrl());
        });
        splash.setClickable(false);
        getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                android.net.Uri uri = request.getUrl();
                // Only API requests use the existing online proxy. UI files and routes stay bundled.
                if ("https".equals(uri.getScheme()) && "tumara-a.vercel.app".equals(uri.getHost()) &&
                    (uri.getPath() != null && (uri.getPath().startsWith("/api/") || uri.getPath().equals("/health")))) {
                    return null;
                }
                return super.shouldInterceptRequest(view, request);
            }
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!failed && !contentReady && !polling) {
                    polling = true;
                    waitForContent(view);
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) showRetry();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                super.onReceivedHttpError(view, request, response);
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showRetry();
            }
        });
        handler.postDelayed(timeout, 20000);
    }

    private void waitForContent(WebView view) {
        if (splash == null || failed || contentReady || isFinishing() || isDestroyed()) return;
        view.evaluateJavascript("Boolean(document.getElementById('root') && document.getElementById('root').childElementCount)", ready -> {
            if (splash == null || failed || isFinishing() || isDestroyed()) return;
            if ("true".equals(ready)) {
                contentReady = true;
                polling = false;
                handler.removeCallbacksAndMessages(null);
                advanceStartup();
            } else {
                handler.postDelayed(() -> waitForContent(view), 120);
            }
        });
    }

    private void advanceStartup() {
        if (!brandTimeElapsed || splash == null || isFinishing() || isDestroyed()) return;
        if (onboarding != null) {
            onboarding.setVisibility(View.VISIBLE);
            splash.setVisibility(View.GONE);
            if (onboardingBack != null) onboardingBack.setEnabled(true);
            useLightBars();
        } else if (contentReady) revealContent();
    }

    private void completeOnboarding() {
        if (onboarding == null) return;
        getPreferences(MODE_PRIVATE).edit().putBoolean("onboarding_complete_v1", true).apply();
        ((ViewGroup) onboarding.getParent()).removeView(onboarding);
        onboarding = null;
        if (onboardingBack != null) onboardingBack.remove();
        if (contentReady) {
            advanceStartup();
        } else if (splash != null) {
            splash.setVisibility(View.VISIBLE);
            getWindow().setStatusBarColor(Color.rgb(4, 35, 77));
            getWindow().setNavigationBarColor(Color.rgb(4, 35, 77));
            getWindow().getDecorView().setSystemUiVisibility(0);
            if (failed) splash.setRetry(true);
        }
    }

    private void revealContent() {
        if (splash == null) return;
        final BrandSplashView exiting = splash;
        splash = null;
        useLightBars();
        if (exiting.getVisibility() != View.VISIBLE) {
            ((ViewGroup) exiting.getParent()).removeView(exiting);
            notifyAppVisible();
        } else {
            exiting.animate().alpha(0).setDuration(220).withEndAction(() -> {
                if (exiting.getParent() instanceof ViewGroup) ((ViewGroup) exiting.getParent()).removeView(exiting);
                notifyAppVisible();
            }).start();
        }
    }

    @Override protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent); setIntent(intent);
        if(getBridge()!=null) getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('tm:push-open'));",null);
    }

    private void notifyAppVisible() {
        if (isFinishing() || isDestroyed() || getBridge() == null) return;
        getBridge().getWebView().evaluateJavascript("window.__tmAppVisible=true;window.dispatchEvent(new Event('tm:app-visible'));", null);
    }

    private void useLightBars() {
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility((android.os.Build.VERSION.SDK_INT >= 23 ? View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : 0) |
            (android.os.Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0));
    }

    @Override public void onSaveInstanceState(Bundle state) {
        state.putLong("splash_deadline", splashDeadline);
        if (onboarding != null) state.putInt("onboarding_page", onboarding.getPage());
        super.onSaveInstanceState(state);
    }

    private void showRetry() {
        if (splash == null || isFinishing() || isDestroyed()) return;
        failed = true;
        handler.removeCallbacksAndMessages(null);
        splash.setRetry(true);
    }

    @Override public void onDestroy() {
        startupHandler.removeCallbacksAndMessages(null);
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
