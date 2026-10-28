package com.tumarana.app;
import android.Manifest;
import android.content.*;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.UUID;
@CapacitorPlugin(name="DeviceNotifications", permissions={@Permission(alias="notifications", strings={Manifest.permission.POST_NOTIFICATIONS})})
public class DeviceNotificationsPlugin extends Plugin {
 public static final String TOKEN_CHANGED="com.tumarana.app.PUSH_TOKEN_CHANGED";
 private BroadcastReceiver receiver;
 private android.content.SharedPreferences prefs(){return getContext().getSharedPreferences("push_device",0);}
 private boolean configured(){return !FirebaseApp.getApps(getContext()).isEmpty();}
 private String installation(){String id=prefs().getString("installation",null);if(id==null){id=UUID.randomUUID().toString();prefs().edit().putString("installation",id).apply();}return id;}
 @Override public void load(){
  if(Build.VERSION.SDK_INT>=26)getContext().getSystemService(android.app.NotificationManager.class).createNotificationChannel(new android.app.NotificationChannel(AppMessagingService.CHANNEL,"Actividad de TuMaraña",android.app.NotificationManager.IMPORTANCE_HIGH));
  receiver=new BroadcastReceiver(){@Override public void onReceive(Context context,Intent intent){notifyListeners("tokenChanged",new JSObject(),true);}};
  ContextCompat.registerReceiver(getContext(),receiver,new IntentFilter(TOKEN_CHANGED),ContextCompat.RECEIVER_NOT_EXPORTED);
 }
 @Override protected void handleOnDestroy(){if(receiver!=null){getContext().unregisterReceiver(receiver);receiver=null;}}
 @PluginMethod public void bindUser(PluginCall call){String user=call.getString("userId","");if(!user.isEmpty()&&!user.matches("[0-9a-fA-F-]{36}")){call.reject("Cuenta inválida.");return;}prefs().edit().putString("user",user).putBoolean("enabled",!user.isEmpty()).apply();if(user.isEmpty())NotificationManagerCompat.from(getContext()).cancelAll();call.resolve();}
 @PluginMethod public void unregister(PluginCall call){prefs().edit().remove("user").putBoolean("enabled",false).apply();NotificationManagerCompat.from(getContext()).cancelAll();if(!configured()){call.resolve();return;}FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task->{if(task.isSuccessful())call.resolve();else call.reject("No pudimos desregistrar el dispositivo.");});}
 @PluginMethod public void status(PluginCall call){JSObject out=new JSObject();boolean enabled=NotificationManagerCompat.from(getContext()).areNotificationsEnabled();out.put("configured",configured());out.put("enabled",enabled);out.put("denied",prefs().getBoolean("asked",false)&&!enabled);call.resolve(out);}
 @PluginMethod public void register(PluginCall call){
  if(!configured()){call.reject("Los avisos no están configurados.","PUSH_NOT_CONFIGURED");return;}
  if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){prefs().edit().putBoolean("asked",true).apply();requestPermissionForAlias("notifications",call,"permissionResult");return;}
  token(call);
 }
 @PermissionCallback private void permissionResult(PluginCall call){if(getPermissionState("notifications")!=PermissionState.GRANTED){call.reject("Activa las notificaciones en los ajustes del móvil.","PUSH_DENIED");return;}token(call);}
 private void token(PluginCall call){
  if(!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()){call.reject("Las notificaciones están desactivadas.","PUSH_DENIED");return;}
  FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->{if(!task.isSuccessful()){call.reject("No pudimos registrar este móvil. Revisa tu conexión.","PUSH_TOKEN_FAILED");return;}JSObject out=new JSObject();out.put("token",task.getResult());out.put("installationId",installation());call.resolve(out);});
 }
 @PluginMethod public void openSettings(PluginCall call){Intent intent=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName());getActivity().startActivity(intent);call.resolve();}
 @PluginMethod public void consumeLaunch(PluginCall call){Intent intent=getActivity().getIntent();String path=intent.getStringExtra("path"),recipient=intent.getStringExtra("recipient_id"),user=call.getString("userId","");JSObject out=new JSObject();if(user.isEmpty()){call.resolve(out);return;}intent.removeExtra("path");intent.removeExtra("recipient_id");if(user.equals(recipient)&&path!=null&&path.matches("^/(solicitud/[0-9]+/chat|mi-perfil-profesional|mis-solicitudes|admin/profesionales)$"))out.put("path",path);call.resolve(out);}
}
