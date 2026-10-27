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
 @Override public void onMessageReceived(RemoteMessage message){
  if(!NotificationManagerCompat.from(this).areNotificationsEnabled())return;
  if(Build.VERSION.SDK_INT>=26)getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel(CHANNEL,"Actividad de TuMaraña",NotificationManager.IMPORTANCE_HIGH));
  String path=message.getData().get("path");if(path==null || !path.matches("^/(solicitud/[0-9]+/chat|mi-perfil-profesional|mis-solicitudes|admin/profesionales)$"))return;
  Intent intent=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("path",path);
  int id=message.getMessageId()==null?path.hashCode():message.getMessageId().hashCode();
  PendingIntent pending=PendingIntent.getActivity(this,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  RemoteMessage.Notification content=message.getNotification();
  NotificationCompat.Builder notification=new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(R.drawable.ic_stat_notification).setContentTitle(content==null?"TuMaraña":content.getTitle()).setContentText(content==null?"Tienes una actualización de tu servicio.":content.getBody()).setAutoCancel(true).setContentIntent(pending).setPriority(NotificationCompat.PRIORITY_HIGH).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
  try{NotificationManagerCompat.from(this).notify(id,notification.build());}catch(SecurityException ignored){}
 }
}
