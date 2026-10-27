package com.tumarana.app;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="DeviceInputMode")
public class DeviceInputModePlugin extends Plugin {
 @PluginMethod public void setMode(PluginCall call) {
  final String mode=call.getString("mode", "resize");
  getActivity().runOnUiThread(() -> {
   getActivity().getWindow().setSoftInputMode(("pan".equals(mode) ? WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN : WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE) | WindowManager.LayoutParams.SOFT_INPUT_STATE_UNCHANGED);
   call.resolve();
  });
 }
}
