package dev.webbase
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
/** Minimal Webbase document client. Call from a background thread, never Android's main thread. */
class WebbaseClient(baseUrl: String, private val projectId: String, private val apiKey: String) {
 private val base=baseUrl.trimEnd('/')
 private fun request(method:String,path:String,body:JSONObject?=null):JSONObject {
  val c=URL("$base/api/client/$projectId$path").openConnection() as HttpURLConnection
  c.requestMethod=method; c.connectTimeout=15000; c.readTimeout=15000
  c.setRequestProperty("Accept","application/json"); c.setRequestProperty("x-webbase-key",apiKey)
  if(body!=null){c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}}
  val status=c.responseCode; val stream=if(status in 200..299)c.inputStream else c.errorStream
  val text=stream?.bufferedReader()?.use{it.readText()}?:"{}";c.disconnect()
  val result=JSONObject(text);if(status !in 200..299)throw IllegalStateException(result.optString("error","Webbase HTTP $status"));return result
 }
 fun list(collection:String):JSONArray=request("GET","/collections/\${enc(collection)}/documents").optJSONArray("documents")?:JSONArray()
 fun create(collection:String,data:JSONObject):JSONObject=request("POST","/collections/\${enc(collection)}/documents",JSONObject().put("data",data)).getJSONObject("document")
 fun update(documentId:String,data:JSONObject):JSONObject=request("PUT","/documents/\${enc(documentId)}",JSONObject().put("data",data)).getJSONObject("document")
 fun delete(documentId:String):Boolean=request("DELETE","/documents/\${enc(documentId)}").optBoolean("ok")
 private fun enc(value:String)=URLEncoder.encode(value,"UTF-8").replace("+","%20")
}
