package kr.com.taekwonkumdo.classsender;

import android.content.Context;import android.content.SharedPreferences;import android.net.Uri;import org.json.JSONObject;

public final class AuthStore {
    private static final String PREF="kmt_sender_secure"; private final SharedPreferences p;
    public AuthStore(Context c){p=c.getSharedPreferences(PREF,Context.MODE_PRIVATE);}
    public boolean capture(Uri uri){if(uri==null||uri.getFragment()==null)return false;String access=null,refresh=null;long expires=3600;for(String pair:uri.getFragment().split("&")){String[]kv=pair.split("=",2);if(kv.length<2)continue;String v=Uri.decode(kv[1]);if(kv[0].equals("access_token"))access=v;if(kv[0].equals("refresh_token"))refresh=v;if(kv[0].equals("expires_in"))try{expires=Long.parseLong(v);}catch(Exception ignored){}}if(access==null)return false;p.edit().putString("access",access).putString("refresh",refresh).putLong("expires",System.currentTimeMillis()+expires*1000).apply();return true;}
    public synchronized String token() throws Exception{String a=p.getString("access",null);if(a==null)return null;if(System.currentTimeMillis()<p.getLong("expires",0)-120000)return a;String r=p.getString("refresh",null);if(r==null)return null;JSONObject body=new JSONObject().put("refresh_token",r);JSONObject out=ApiClient.rawPost("/auth/v1/token?grant_type=refresh_token",body,null);a=out.getString("access_token");p.edit().putString("access",a).putString("refresh",out.optString("refresh_token",r)).putLong("expires",System.currentTimeMillis()+out.optLong("expires_in",3600)*1000).apply();return a;}
    public void clear(){p.edit().clear().apply();} public boolean hasSession(){return p.getString("access",null)!=null;}
}
