import {cookieTokens,sessionEndpoint} from './session.js';
import { streamAnswer, citedSources } from './stream.js';
import { readArticle } from './articles.js';
import { guidanceReply } from '../public/guidance.js';
import { selectContext, modelInput } from './ai-policy.js';
export { AiBudget } from './ai-policy.js';
import { safeUrl, encrypt, decrypt, extractArticle, retrieve, validScreenshot } from './security.js';
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function db(env,token,path,options={}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'return=representation',...options.headers}});
  if(!res.ok) throw new Error('Storage request failed.');
  return res.status===204?null:res.json();
}
async function readItems(env,token,owner) {
  const rows=await db(env,token,'memories?select=id,created_at,payload&order=created_at.desc&limit=201');
  return Promise.all(rows.map(async row=>({...await decrypt(row.payload,env.CONTENT_KEY,owner),id:row.id,createdAt:row.created_at})));
}
async function dumpAck(env,user,type){
 if(env.AI_ENABLED!=='true'||!env.AI||!env.AI_BUDGET)return 'Saved.';
 try{const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.id))),b=>b.toString(16).padStart(2,'0')).join('');const budget=env.AI_BUDGET.get(env.AI_BUDGET.idFromName('shared-ai-budget'));const response=await budget.fetch('https://budget/reserve',{method:'POST',body:JSON.stringify({user:hash})});if(!response.ok||(await response.json()).reason)return 'Saved.';
 const result=await env.AI.run(env.AI_MODEL,{messages:[{role:'system',content:'A memory was successfully saved. Respond only with a friendly acknowledgment of 2–6 words. No summary, questions, suggestions, citations or offers. Do not mention anything about the content. /no_think'},{role:'user',content:'Saved a '+type}],max_tokens:24,temperature:0.7});const text=String(result.response||'').replace(/<think>[\s\S]*?(?:<\/think>|$)/g,'').trim();return text&&/^(?:saved|noted|got it|all set|added|done|it.s saved)/i.test(text)&&! /\b(?:would|help|want|can|let)\b/i.test(text)&&text.length<=60&&!/[?\n\[\]]/.test(text)&&text.split(/\s+/).length<=8?text:'Saved.';
 }catch{return 'Saved.'}
}
async function handle(request,env) {
 const url=new URL(request.url);
 const ready=!!(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&env.CONTENT_KEY);
 if(url.pathname==='/api/config') return json({ready,supabaseUrl:env.SUPABASE_URL||'',anonKey:env.SUPABASE_PUBLISHABLE_KEY||'',aiEnabled:env.AI_ENABLED==='true'});
 if(!ready) return json({error:'Cloud services are not configured yet. Use the sample preview.'},503);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin) return json({error:'Invalid request origin.'},403);
 if(url.pathname==='/api/session')return sessionEndpoint(request,env);
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')||cookieTokens(request).access;
 if(!token) return json({error:'Sign in to continue.'},401);
 const auth=await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`}});
 if(!auth.ok) return json({error:'Your session expired. Sign in again.'},401);
 const user=await auth.json();
 if(request.method==='DELETE'&&url.pathname==='/api/account') {
  await db(env,token,'rpc/delete_my_account',{method:'POST',body:'{}'});
  return json({ok:true});
 }
 if(request.method==='GET'&&url.pathname==='/api/memories') return json({items:await readItems(env,token,user.id)});
 if(request.method==='DELETE'&&/^\/api\/memories\/[a-f0-9-]{36}$/.test(url.pathname)) {
   await db(env,token,`memories?id=eq.${url.pathname.split('/').pop()}`,{method:'DELETE'});return json({ok:true});
 }
 if(request.method==='DELETE'&&url.pathname==='/api/data') {await db(env,token,`memories?user_id=eq.${user.id}`,{method:'DELETE'});await db(env,token,`chat_messages?user_id=eq.${user.id}`,{method:'DELETE'});return json({ok:true});}
 if(request.method==='GET'&&url.pathname==='/api/chat') {
 const rows=await db(env,token,'chat_messages?select=payload&order=created_at.desc&limit=200');return json({messages:await Promise.all(rows.reverse().map(r=>decrypt(r.payload,env.CONTENT_KEY,user.id)))});
 }
 if(Number(request.headers.get('Content-Length'))>4500000) return json({error:'Upload must be smaller than 3 MB.'},413);
 const raw=await request.text();if(raw.length>4500000)return json({error:'Upload too large.'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid request.'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Send a JSON object.'},400);
 if(request.method==='PATCH'&&/^\/api\/memories\/[a-f0-9-]{36}$/.test(url.pathname)) {
  if(typeof body.content!=='string'||!body.content.trim()||body.content.length>40000)return json({error:'Paste article text, up to 40,000 characters.'},400);
  const item=(await readItems(env,token,user.id)).find(item=>item.id===url.pathname.split('/').pop());if(!item)return json({error:'Memory not found.'},404);
  if(item.type!=='article')return json({error:'Choose an article memory.'},400);
  const {id,createdAt,...data}=item;data.content=body.content.trim();data.status='saved';delete data.captureIssue;
  await db(env,token,`memories?user_id=eq.${user.id}&id=eq.${id}`,{method:'PATCH',body:JSON.stringify({payload:await encrypt(data,env.CONTENT_KEY,user.id)})});return json({item:{...data,id,createdAt}});
 }
 if(request.method==='DELETE'&&url.pathname==='/api/memories') {
  if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>200||body.ids.some(id=>typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)))return json({error:'Select between 1 and 200 valid memories.'},400);
  const ids=[...new Set(body.ids)];
  await db(env,token,`memories?user_id=eq.${user.id}&id=in.(${ids.join(',')})`,{method:'DELETE'});return json({ok:true});
 }
 if(request.method==='POST'&&url.pathname==='/api/memories') {
  if(!['article','screenshot','note'].includes(body.type))return json({error:'Choose a supported format.'},400);
  const items=await readItems(env,token,user.id);if(items.length>=200)return json({error:'Beta limit reached: 200 memories. Export or delete some items.'},429);
  let item={type:body.type,title:String(body.title||'Untitled memory').slice(0,200),content:String(body.content||'').slice(0,40000),tags:Array.isArray(body.tags)?body.tags.slice(0,8).map(t=>String(t).slice(0,40)):[],url:'',status:'saved'};
  if(item.type==='article') {
   let link;try{link=safeUrl(body.url)}catch(e){return json({error:e.message},400)}item.url=link.href;
   item.status=item.content?'saved':'needs-content';
   if(!body.title)item.title=link.hostname;
   const existing=items.find(saved=>saved.url===link.href);if(body.dump&&existing)return json({item:existing,acknowledgment:await dumpAck(env,user,'link')});
   if(body.dump){try{const article=await readArticle(link.href);item={...item,...article,status:'saved'};}catch(e){if(e.message==='This site blocked access. Paste its article text here instead.'){item.captureIssue='blocked';}else return json({error:e.message},422);}}
  }
  if(item.type==='screenshot') {
   if(!validScreenshot(body.image))return json({error:'Use a PNG, JPEG, or WebP smaller than 3 MB.'},400);
   item.image=body.image;item.status=item.content?'saved':'needs-content';
  }
  if(item.type==='note'&&!item.content.trim())return json({error:'Write something to remember.'},400);
  const rows=await db(env,token,'memories',{method:'POST',body:JSON.stringify({user_id:user.id,payload:await encrypt(item,env.CONTENT_KEY,user.id)})});
  return json({item:{...item,id:rows[0].id,createdAt:rows[0].created_at},...(body.dump?{acknowledgment:await dumpAck(env,user,item.type)}:{})},201);
 }
 if(request.method==='POST'&&url.pathname==='/api/chat') {
  const message=typeof body.message==='string'?body.message.trim():'';
  if(!message)return json({error:'Write a question first.'},400);
  if(message.length>1000)return json({error:'Keep your question under 1,000 characters.'},400);
  const items=await readItems(env,token,user.id);
  const savedItem=null;
  const history=await db(env,token,'chat_messages?select=payload&order=created_at.desc&limit=2');
  const previous=await Promise.all(history.map(r=>decrypt(r.payload,env.CONTENT_KEY,user.id)));
  const context=savedItem?{reason:null,sources:[savedItem]}:selectContext(items,message,previous.find(m=>m.role==='assistant')?.sources||[]);
  const sources=context.sources;
  let answer;
  const guidance=guidanceReply(message,items.length>0);
  if(env.AI_ENABLED!=='true'&&guidance)answer=guidance;
  else if(env.AI_ENABLED!=='true'&&context.reason==='scope')answer='Let’s connect that to your memories. Use + to save a relevant source, or ask “What did I save about…” followed by its topic. I can then help you understand or compare what you saved.';
  else if(env.AI_ENABLED!=='true'&&context.reason==='missing')answer='I couldn’t find a relevant saved memory. Save a source or mention its topic or title.';
  else if(env.AI_ENABLED!=='true')answer=`I found ${sources.length} matching memories. Open the sources below to read your saved content.`;
  else {
   if(!env.AI_BUDGET||!env.AI)return json({error:'AI is temporarily unavailable. Your memories are safe.'},503);
   const userHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.id))),b=>b.toString(16).padStart(2,'0')).join('');
   const budget=env.AI_BUDGET.get(env.AI_BUDGET.idFromName('shared-ai-budget'));
   const reservation=await budget.fetch('https://budget/reserve',{method:'POST',body:JSON.stringify({user:userHash})});
   if(!reservation.ok)return json({error:'AI is temporarily unavailable.'},503);
   const {reason}=await reservation.json();
   if(reason)return json({...(savedItem?{savedItem}:{}),error:reason==='global'?'The shared daily AI allowance is used up. Try again tomorrow.':reason==='burst'?'Please wait a minute before asking another AI question.':'Daily AI limit reached (20 questions). Try again tomorrow.'},429);
   try {
    const input=modelInput(savedItem?(savedItem.status==='needs-content'?'The link is saved, but the publisher blocked article access. Explain this briefly and invite the user to use Add article text. You have not read the article: do not summarize it, infer facts from its URL, or cite it as evidence.':'The user just shared this source. Confirm it is saved, briefly explain its useful details, and ask one natural follow-up if needed.'):message,sources);
    input.messages.splice(1,0,...previous.slice().reverse().map(m=>({role:m.role,content:m.content.slice(0,800)})));
    const result=await env.AI.run(env.AI_MODEL,{...input,stream:body.stream===true});
    if(body.stream===true){
     if(!result?.getReader)throw Error('Invalid stream');
     return streamAnswer(result,{...(savedItem?{savedItem}:{}),sources:sources.map(s=>({id:s.id,title:s.title,...(s.status==='needs-content'?{needsContent:true}:{})}))},async content=>{
      for(const msg of [{role:'user',content:message,createdAt:new Date().toISOString()},{role:'assistant',content,sources:citedSources(content,sources.map(s=>({id:s.id,title:s.title,...(s.status==='needs-content'?{needsContent:true}:{})}))),createdAt:new Date().toISOString()}])await db(env,token,'chat_messages',{method:'POST',body:JSON.stringify({user_id:user.id,payload:await encrypt(msg,env.CONTENT_KEY,user.id)})});
     });
    }
    answer=String(result.response||'').replace(/<think>[\s\S]*?(?:<\/think>|$)/g,'').trim().slice(0,2400);
    if(!answer)throw Error('Empty response');
   }catch{return json({...(savedItem?{savedItem}:{}),error:'AI is unavailable right now. Open your saved sources or try again later.'},503);}
  }
  const reply={...(savedItem?{savedItem}:{}),role:'assistant',content:(savedItem?'Saved to your memories.\n\n':'')+answer,sources:citedSources(answer,sources.map(s=>({id:s.id,title:s.title,...(s.status==='needs-content'?{needsContent:true}:{})}))),createdAt:new Date().toISOString()};
  const {savedItem:captured,...storedReply}=reply;
  for(const msg of [{role:'user',content:message,createdAt:new Date().toISOString()},storedReply])await db(env,token,'chat_messages',{method:'POST',body:JSON.stringify({user_id:user.id,payload:await encrypt(msg,env.CONTENT_KEY,user.id)})});
  return json(reply);
 }
 return json({error:'Not found.'},404);
}
export default {async fetch(request,env) {
 let response;try{response=new URL(request.url).pathname.startsWith('/api/')?await handle(request,env):await env.ASSETS.fetch(request)}catch{response=json({error:'Something went wrong. Please try again.'},500)}
 const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('X-Frame-Options','DENY');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");return new Response(response.body,{status:response.status,headers});
}};
