package com.tumarana.app;
import android.app.*;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
public class AppMessagingService extends FirebaseMessagingService {
 public static final String CHANNEL="tumarana_activity";
 @Override public void onNewToken(String token){sendBroadcast(new Intent(DeviceNotificationsPlugin.TOKEN_CHANGED).setPackage(getPackageName()));}
 @Override public void onMessageReceived(RemoteMessage message){
  android.content.SharedPreferences prefs=getSharedPreferences("push_device",0);
  String recipient=message.getData().get("recipient_id");
  if(!prefs.getBoolean("enabled",false)||recipient==null||!recipient.equals(prefs.getString("user",""))||!NotificationManagerCompat.from(this).areNotificationsEnabled())return;
  if(Build.VERSION.SDK_INT>=26)getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel(CHANNEL,"Actividad de TuMaraña",NotificationManager.IMPORTANCE_HIGH));
  String path=message.getData().get("path");if(path==null||!path.matches("^/(solicitud/[0-9]+/chat|mi-perfil-profesional|mis-solicitudes|admin/profesionales)$"))return;
  Intent intent=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("path",path).putExtra("recipient_id",recipient);
  String event=message.getData().get("event_id");if(event==null)event=message.getMessageId();if(event==null)event=path;
  int id=event.hashCode();PendingIntent pending=PendingIntent.getActivity(this,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  String title=message.getData().get("title"),body=message.getData().get("body");
  NotificationCompat.Builder notification=new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(R.drawable.ic_stat_notification).setContentTitle(title==null?"TuMaraña":title).setContentText(body==null?"Tienes una actualización de tu servicio.":body).setAutoCancel(true).setContentIntent(pending).setPriority(NotificationCompat.PRIORITY_HIGH).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
  try{NotificationManagerCompat.from(this).notify(event,id,notification.build());}catch(SecurityException ignored){}
 }
}
