package com.tumarana.app;
import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.UUID;
@CapacitorPlugin(name="DeviceNotifications", permissions={@Permission(alias="notifications", strings={Manifest.permission.POST_NOTIFICATIONS})})
public class DeviceNotificationsPlugin extends Plugin {
 private boolean configured(){return !FirebaseApp.getApps(getContext()).isEmpty();}
 private String installation(){android.content.SharedPreferences p=getContext().getSharedPreferences("push_device",0);String id=p.getString("installation",null);if(id==null){id=UUID.randomUUID().toString();p.edit().putString("installation",id).apply();}return id;}
 @Override public void load(){if(Build.VERSION.SDK_INT>=26)getContext().getSystemService(android.app.NotificationManager.class).createNotificationChannel(new android.app.NotificationChannel(AppMessagingService.CHANNEL,"Actividad de TuMaraña",android.app.NotificationManager.IMPORTANCE_HIGH));}
 @PluginMethod public void unregister(PluginCall call){if(!configured()){call.resolve();return;}FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task->{if(task.isSuccessful())call.resolve();else call.reject("No pudimos desregistrar el dispositivo.");});}
 @PluginMethod public void status(PluginCall call){JSObject out=new JSObject();out.put("configured",configured());out.put("enabled",NotificationManagerCompat.from(getContext()).areNotificationsEnabled());call.resolve(out);}
 @PluginMethod public void register(PluginCall call){
  if(!configured()){call.reject("Firebase no estÃ¡ configurado en esta APK.","PUSH_NOT_CONFIGURED");return;}
  if(Build.VERSION.SDK_INT>=33 && getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"permissionResult");return;}
  token(call);
 }
 @PermissionCallback private void permissionResult(PluginCall call){if(getPermissionState("notifications")!=PermissionState.GRANTED){call.reject("Activa las notificaciones en los ajustes del mÃ³vil.","PUSH_DENIED");return;}token(call);}
 private void token(PluginCall call){
  if(!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()){call.reject("Las notificaciones estÃ¡n desactivadas.","PUSH_DENIED");return;}
  FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->{if(!task.isSuccessful()){call.reject("No pudimos registrar este mÃ³vil. Revisa tu conexiÃ³n.","PUSH_TOKEN_FAILED");return;}JSObject out=new JSObject();out.put("token",task.getResult());out.put("installationId",installation());call.resolve(out);});
 }
 @PluginMethod public void openSettings(PluginCall call){Intent intent=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName());getActivity().startActivity(intent);call.resolve();}
 @PluginMethod public void consumeLaunch(PluginCall call){Intent intent=getActivity().getIntent();String path=intent.getStringExtra("path");intent.removeExtra("path");JSObject out=new JSObject();if(path!=null && path.matches("^/(solicitud/[0-9]+/chat|mi-perfil-profesional|mis-solicitudes|admin/profesionales)$"))out.put("path",path);call.resolve(out);}
}
