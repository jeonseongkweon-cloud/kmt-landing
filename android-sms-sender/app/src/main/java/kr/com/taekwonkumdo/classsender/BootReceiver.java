package kr.com.taekwonkumdo.classsender;
import android.content.*;import android.os.Build;
public class BootReceiver extends BroadcastReceiver{public void onReceive(Context c,Intent i){if(Intent.ACTION_BOOT_COMPLETED.equals(i.getAction())&&c.getSharedPreferences("kmt_sender",Context.MODE_PRIVATE).getBoolean("enabled",false)){Intent s=new Intent(c,SenderService.class);if(Build.VERSION.SDK_INT>=26)c.startForegroundService(s);else c.startService(s);}}}
