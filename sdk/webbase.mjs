const normalize = value => String(value || '').replace(/\/+$/, '');
export class WebbaseError extends Error {
 constructor(message,status,payload){super(message);this.name='WebbaseError';this.status=status;this.payload=payload;}
}
export function createWebbaseClient({url,projectId,apiKey,fetchImpl=fetch}){
 const base=normalize(url),project=encodeURIComponent(projectId);
 if(!base||!projectId||!apiKey)throw new TypeError('url, projectId and apiKey are required');
 async function request(method,path,body){
  const response=await fetchImpl(base+'/api/client/'+project+path,{method,headers:{'Content-Type':'application/json','x-webbase-key':apiKey},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const payload=await response.json().catch(()=>({error:'Invalid server response'}));
  if(!response.ok)throw new WebbaseError(payload.error||'Webbase request failed',response.status,payload);
  return payload;
 }
 return Object.freeze({collection(name){
  const path='/collections/'+encodeURIComponent(name)+'/documents';
  return Object.freeze({list:()=>request('GET',path),create:data=>request('POST',path,{data}),update:(id,data)=>request('PUT','/documents/'+encodeURIComponent(id),{data}),delete:id=>request('DELETE','/documents/'+encodeURIComponent(id))});
 }});
}
