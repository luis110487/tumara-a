package com.tumarana.app;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** One foreground fix; coordinates are never stored or sent to the application backend. */
@CapacitorPlugin(name = "DeviceLocation", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
})
public class DeviceLocationPlugin extends Plugin implements LocationListener {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService geocoding = Executors.newSingleThreadExecutor();
    private PluginCall pending;
    private LocationManager manager;
    private boolean resolving;
    private boolean locating;
    private AlertDialog dialog;
    private final Runnable timeout = () -> fail("No pudimos obtener la ciudad a tiempo.", "LOCATION_TIMEOUT");

    @PluginMethod public void getCurrentCity(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != null) { call.reject("Ya hay una búsqueda de ubicación en curso.", "LOCATION_BUSY"); return; }
            pending = call;
            if (!hasPermission()) requestPermissionForAlias("location", call, "locationPermissionResult");
            else checkSettings();
        });
    }

    private boolean hasPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @PermissionCallback private void locationPermissionResult(PluginCall call) {
        if (pending == null) return;
        if (hasPermission()) checkSettings();
        else fail("El permiso de ubicación no fue concedido.", "LOCATION_DENIED");
    }

    private void checkSettings() {
        if (pending == null) return;
        manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        boolean enabled = manager != null && (manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        if (enabled) { locate(); return; }
        dialog = new AlertDialog.Builder(getActivity()).setTitle("Activa la ubicación")
            .setMessage("Activa la ubicación del móvil para encontrar tu ciudad. También puedes elegirla manualmente.")
            .setPositiveButton("Activar", (d, which) -> {
                try { startActivityForResult(pending, new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS), "locationSettingsResult"); }
                catch (Exception e) { fail("No pudimos abrir los ajustes de ubicación.", "LOCATION_DISABLED"); }
            }).setNegativeButton("Ahora no", (d, which) -> fail("La ubicación está desactivada.", "LOCATION_DISABLED"))
            .setOnCancelListener(d -> fail("La ubicación está desactivada.", "LOCATION_DISABLED")).show();
    }

    @ActivityCallback private void locationSettingsResult(PluginCall call, ActivityResult result) {
        if (pending == null) return;
        boolean enabled = manager != null && (manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        if (enabled && hasPermission()) locate();
        else fail("Activa la ubicación o elige tu ciudad manualmente.", "LOCATION_DISABLED");
    }

    @PluginMethod public void openPermissionSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName())));
                call.resolve();
            } catch (Exception e) { call.reject("No pudimos abrir los permisos.", "SETTINGS_UNAVAILABLE"); }
        });
    }

    @SuppressWarnings("MissingPermission")
    private void locate() {
        if (pending == null) return;
        if (!hasPermission()) { fail("Permite el acceso a ubicación.", "LOCATION_DENIED"); return; }
        resolving = false;
        locating = true;
        main.postDelayed(timeout, 30000);
        Location recent = null;
        int requested = 0;
        for (String provider : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }) {
            try {
                if (!manager.isProviderEnabled(provider)) continue;
                Location last = manager.getLastKnownLocation(provider);
                long age = last == null ? Long.MAX_VALUE : (SystemClock.elapsedRealtimeNanos() - last.getElapsedRealtimeNanos()) / 1000000L;
                if (last != null && age >= 0 && age < 120000 && (recent == null || last.getAccuracy() < recent.getAccuracy())) recent = last;
                manager.requestLocationUpdates(provider, 0L, 0f, this, Looper.getMainLooper());
                requested++;
            } catch (SecurityException | IllegalArgumentException ignored) { /* Approximate location may allow only the network provider. */ }
        }
        if (recent != null) onLocationChanged(recent);
        else if (requested == 0) fail("No hay un proveedor de ubicación disponible.", "LOCATION_UNAVAILABLE");
    }

    @Override public void onLocationChanged(Location location) {
        if (pending == null || resolving) return;
        resolving = true;
        try { manager.removeUpdates(this); } catch (SecurityException ignored) {}
        final PluginCall original = pending;
        geocoding.execute(() -> {
            try {
                if (!Geocoder.isPresent()) { main.post(() -> { if (pending == original) fail("No pudimos identificar tu ciudad.", "NO_CITY"); }); return; }
                List<Address> addresses = new Geocoder(getContext(), new Locale("es", "CO")).getFromLocation(location.getLatitude(), location.getLongitude(), 1);
                if (addresses == null || addresses.isEmpty()) throw new IllegalStateException();
                Address address = addresses.get(0);
                main.post(() -> {
                    if (pending != original) return;
                    if (!"CO".equalsIgnoreCase(address.getCountryCode())) { fail("No encontramos un municipio de Colombia.", "NO_CITY"); return; }
                    JSArray candidates = new JSArray();
                    if (address.getLocality() != null) candidates.put(address.getLocality());
                    if (address.getSubAdminArea() != null) candidates.put(address.getSubAdminArea());
                    JSObject data = new JSObject();
                    data.put("candidates", candidates); data.put("countryCode", address.getCountryCode());
                    data.put("accuracy", location.getAccuracy());
                    cleanup(); original.resolve(data);
                });
            } catch (Exception e) {
                main.post(() -> { if (pending == original) fail("No pudimos convertir la ubicación en una ciudad.", "NO_CITY"); });
            }
        });
    }

    private void fail(String message, String code) {
        PluginCall original = pending;
        cleanup();
        if (original != null) original.reject(message, code);
    }
    private void cleanup() {
        main.removeCallbacks(timeout);
        if (manager != null) try { manager.removeUpdates(this); } catch (SecurityException ignored) {}
        if (dialog != null) { dialog.setOnCancelListener(null); dialog.dismiss(); dialog = null; }
        pending = null; resolving = false; locating = false;
    }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}
    @Override protected void handleOnPause() {
        main.post(() -> { if (locating) fail("La búsqueda se interrumpió.", "LOCATION_CANCELLED"); });
    }
    @Override protected void handleOnDestroy() {
        main.post(() -> fail("La búsqueda se interrumpió.", "LOCATION_CANCELLED"));
        geocoding.shutdownNow();
    }
}
