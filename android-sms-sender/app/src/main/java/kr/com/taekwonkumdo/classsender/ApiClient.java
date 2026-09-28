package kr.com.taekwonkumdo.classsender;

import android.content.Context;import org.json.JSONArray;import org.json.JSONObject;import java.io.*;import java.net.HttpURLConnection;import java.net.URL;import java.nio.charset.StandardCharsets;

public final class ApiClient {
    private final AuthStore auth; public ApiClient(Context c){auth=new AuthStore(c);}
    public JSONObject heartbeat(String id,String name,boolean enabled)throws Exception{return rpc("kmt_sms_heartbeat",new JSONObject().put("p_device_id",id).put("p_device_name",name).put("p_app_version",AppConfig.VERSION).put("p_enabled",enabled));}
    public JSONObject claim(String id)throws Exception{Object o=rpcAny("kmt_sms_claim_next",new JSONObject().put("p_device_id",id));if(o instanceof JSONArray){JSONArray a=(JSONArray)o;return a.length()==0?null:a.getJSONObject(0);}return null;}
    public JSONObject finish(String outbox,String id,boolean ok,String error)throws Exception{return rpc("kmt_sms_finish",new JSONObject().put("p_outbox_id",outbox).put("p_device_id",id).put("p_success",ok).put("p_error",error==null?JSONObject.NULL:error));}
    public String userEmail()throws Exception{JSONObject u=request("GET","/auth/v1/user",null,auth.token());return u.optString("email","");}
    private JSONObject rpc(String fn,JSONObject body)throws Exception{Object o=rpcAny(fn,body);if(o instanceof JSONObject)return(JSONObject)o;if(o instanceof JSONArray&&((JSONArray)o).length()>0)return((JSONArray)o).getJSONObject(0);return new JSONObject();}
    private Object rpcAny(String fn,JSONObject body)throws Exception{String raw=requestRaw("POST","/rest/v1/rpc/"+fn,body,auth.token());String t=raw.trim();return t.startsWith("[")?new JSONArray(t):new JSONObject(t);}
    static JSONObject rawPost(String path,JSONObject body,String token)throws Exception{return new JSONObject(requestRaw("POST",path,body,token));}
    private static JSONObject request(String method,String path,JSONObject body,String token)throws Exception{return new JSONObject(requestRaw(method,path,body,token));}
    private static String requestRaw(String method,String path,JSONObject body,String token)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(AppConfig.SUPABASE_URL+path).openConnection();c.setRequestMethod(method);c.setConnectTimeout(12000);c.setReadTimeout(15000);c.setRequestProperty("apikey",AppConfig.PUBLISHABLE_KEY);c.setRequestProperty("Content-Type","application/json");if(token!=null)c.setRequestProperty("Authorization","Bearer "+token);if(body!=null){c.setDoOutput(true);try(OutputStream o=c.getOutputStream()){o.write(body.toString().getBytes(StandardCharsets.UTF_8));}}int code=c.getResponseCode();InputStream in=code>=200&&code<300?c.getInputStream():c.getErrorStream();StringBuilder b=new StringBuilder();if(in!=null)try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){String line;while((line=r.readLine())!=null)b.append(line);}if(code<200||code>=300)throw new IOException("서버 "+code+": "+b);return b.toString();}
}
