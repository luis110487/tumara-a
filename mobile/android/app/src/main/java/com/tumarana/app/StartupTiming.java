package com.tumarana.app;

final class StartupTiming {
    static final long MIN_BRAND_MS = 5000L;
    static long remaining(long now, long deadline) { return Math.max(0L, deadline - now); }
}
