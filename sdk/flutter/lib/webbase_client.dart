import 'dart:convert';
import 'package:http/http.dart' as http;
/// Minimal Webbase JSON document client. Add package:http to your Flutter app.
class WebbaseClient {
 WebbaseClient({required String url,required this.projectId,required this.apiKey,http.Client? client})
  :baseUrl=url.replaceFirst(RegExp(r'/+$'),''),_client=client??http.Client();
 final String baseUrl,projectId,apiKey; final http.Client _client;
 Map<String,String> get _headers=>{'Accept':'application/json','Content-Type':'application/json','x-webbase-key':apiKey};
 Uri _uri(String path)=>Uri.parse('$baseUrl/api/client/$projectId$path');
 Future<Map<String,dynamic>> _request(String method,String path,[Object? body]) async {
  final uri=_uri(path);late http.Response response;
  switch(method){
   case 'GET':response=await _client.get(uri,headers:_headers);break;
   case 'POST':response=await _client.post(uri,headers:_headers,body:jsonEncode(body));break;
   case 'PUT':response=await _client.put(uri,headers:_headers,body:jsonEncode(body));break;
   case 'DELETE':response=await _client.delete(uri,headers:_headers);break;
   default:throw ArgumentError('Unsupported HTTP method: $method');
  }
  final decoded=jsonDecode(response.body);
  if(response.statusCode<200||response.statusCode>=300){
   final message=decoded is Map?decoded['error']?.toString():null;
   throw WebbaseException(message??'Webbase HTTP \${response.statusCode}',response.statusCode);
  }
  return Map<String,dynamic>.from(decoded as Map);
 }
 Future<List<dynamic>> list(String collection) async=>(await _request('GET','/collections/\${Uri.encodeComponent(collection)}/documents'))['documents'] as List<dynamic>;
 Future<Map<String,dynamic>> create(String collection,Map<String,dynamic> data) async=>(await _request('POST','/collections/\${Uri.encodeComponent(collection)}/documents',{'data':data}))['document'] as Map<String,dynamic>;
 Future<Map<String,dynamic>> update(String id,Map<String,dynamic> data) async=>(await _request('PUT','/documents/\${Uri.encodeComponent(id)}',{'data':data}))['document'] as Map<String,dynamic>;
 Future<bool> delete(String id) async=>(await _request('DELETE','/documents/\${Uri.encodeComponent(id)}'))['ok']==true;
 void close()=>_client.close();
}
class WebbaseException implements Exception{
 WebbaseException(this.message,this.statusCode);final String message;final int statusCode;
 @override String toString()=>'WebbaseException($statusCode): $message';
}
