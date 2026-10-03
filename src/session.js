export function cookieTokens(request){const values=Object.fromEntries((request.headers.get('Cookie')||'').split(';').map(s=>s.trim().split('=')));return {access:values.__Host_bd_access,refresh:values.__Host_bd_refresh};}
function cookies(response,tokens){const headers=new Headers(response.headers);for(const [name,value,age] of [['access',tokens?.access_token,tokens?.expires_in||3600],['refresh',tokens?.refresh_token,2592000]])headers.append('Set-Cookie',`__Host_bd_${name}=${value||''}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${value?age:0}`);return new Response(response.body,{status:response.status,headers});}
export async function sessionEndpoint(request,env){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});const origin=new URL(request.url).origin;
 if(request.method!=='GET'&&request.headers.get('Origin')!==origin)return json({error:'Invalid request origin.'},403);
 const tokens=cookieTokens(request);const headers={apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
 if(request.method==='DELETE'){
  if(tokens.access){try{const result=await fetch(env.SUPABASE_URL+'/auth/v1/logout?scope=local',{method:'POST',headers:{...headers,Authorization:'Bearer '+tokens.access}});if(!result.ok&&result.status!==401)return json({error:'Could not log out. Please try again.'},503);}catch{return json({error:'Could not log out. Please try again.'},503);}}
  return cookies(json({session:null}),null);
 }
 if(request.method==='POST'){
  let body;try{body=await request.json();}catch{return json({error:'Invalid sign-in request.'},400)}
  if(!body||typeof body.auth_code!=='string'||typeof body.code_verifier!=='string'||body.auth_code.length>2048||body.code_verifier.length>128)return json({error:'Invalid sign-in request.'},400);
  const response=await fetch(env.SUPABASE_URL+'/auth/v1/token?grant_type=pkce',{method:'POST',headers,body:JSON.stringify(body)});
  if(!response.ok)return json({error:'Sign-in failed. Please try again.'},401);
  const result=await response.json();return cookies(json({session:{user:result.user}}),result);
 }
 if(request.method!=='GET')return json({error:'Not found.'},404);
 if(tokens.access){const response=await fetch(env.SUPABASE_URL+'/auth/v1/user',{headers:{...headers,Authorization:'Bearer '+tokens.access}});if(response.ok)return json({session:{user:await response.json()}});if(response.status!==401&&response.status!==403)return json({error:'Session check unavailable. Please retry.'},503);}
 if(tokens.refresh){const response=await fetch(env.SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers,body:JSON.stringify({refresh_token:tokens.refresh})});if(response.ok){const result=await response.json();return cookies(json({session:{user:result.user}}),result);}if(response.status>=500)return json({error:'Session check unavailable. Please retry.'},503);}
 return cookies(json({session:null}),null);
}
