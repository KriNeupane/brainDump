import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../src/worker.js';import {encrypt,decrypt,safeUrl,validScreenshot} from '../src/security.js';
const key=btoa('x'.repeat(32));const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',CONTENT_KEY:key,AI_ENABLED:'true',AI_MODEL:'model'};
const req=(path,body,options={})=>new Request('https://app.test/api/'+path,{method:'POST',headers:{Origin:'https://app.test',Authorization:'Bearer token',...options.headers},body:typeof body==='string'?body:JSON.stringify(body)});
async function mocked(fn,{authOK=true,items=[],history=[],budget={reason:null},budgetOK=true,aiError=false,response='Saved evidence [1]'}={}){
 const original=globalThis.fetch;let aiCalls=0,reservations=0;const calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push({url,opts});if(url.endsWith('/auth/v1/user'))return authOK?Response.json({id:'alice'}):Response.json({}, {status:401});if(url.includes('memories?'))return Response.json(items);if(url.includes('chat_messages?'))return Response.json(history);return Response.json([{id:'new',created_at:'2026-10-03'}]);};
 const configured={...env,AI:{run:async()=>{aiCalls++;if(aiError)throw Error('private provider detail');return {response};}},AI_BUDGET:{idFromName:()=>1,get:()=>({fetch:async()=>{reservations++;return Response.json(budget,{status:budgetOK?200:500});}})}};
 try{await fn(configured,()=>({aiCalls,reservations,calls}));}finally{globalThis.fetch=original;}
}
const source=async()=>[{id:'gpu',created_at:'2026-10-03',payload:await encrypt({title:'GPU',content:'16 GB VRAM',tags:[]},key,'alice')}];
test('expired tokens reject every private endpoint before storage',async()=>{await mocked(async(e,stats)=>{for(const path of ['chat','memories','account','data']){const r=await worker.fetch(req(path,{}),e);assert.equal(r.status,401);}assert.equal(stats().calls.length,4);assert.equal(stats().aiCalls,0);},{authOK:false});});
test('malformed and non-object JSON fail cleanly without writes',async()=>{await mocked(async e=>{for(const body of ['{','null','[]','true','42','"hello"'])assert.equal((await worker.fetch(req('memories',body),e)).status,400);});});
test('blank, oversized and non-string chat questions use no AI',async()=>{await mocked(async(e,stats)=>{for(const message of [' ',{},'What '+ 'x'.repeat(1001)])assert.equal((await worker.fetch(req('chat',{message}),e)).status,400);assert.equal(stats().aiCalls,0);});});
test('untrusted image formats and empty notes are rejected',async()=>{await mocked(async e=>{for(const body of [{type:'video'},{type:'note',content:'   '},{type:'screenshot',image:'data:image/svg+xml;base64,AAAA'},{type:'screenshot',image:'https://evil.test/image.png'},{type:'article',url:'javascript:alert(1)'}])assert.equal((await worker.fetch(req('memories',body),e)).status,400);});});
test('memory cap blocks another insert',async()=>{const rows=await source();await mocked(async e=>{assert.equal((await worker.fetch(req('memories',{type:'note',content:'test'}),e)).status,429);},{items:Array.from({length:200},()=>rows[0])});});
test('quota refusal and broken budget never invoke AI',async()=>{for(const reason of ['global','daily','burst'])await mocked(async(e,stats)=>{assert.equal((await worker.fetch(req('chat',{message:'Summarize saved GPU'}),e)).status,429);assert.equal(stats().aiCalls,0);},{items:await source(),budget:{reason}});await mocked(async(e,stats)=>{assert.equal((await worker.fetch(req('chat',{message:'Summarize saved GPU'}),e)).status,503);assert.equal(stats().aiCalls,0);},{items:await source(),budgetOK:false});});
test('provider errors are sanitized, have no retries, and reserve only once',async()=>{await mocked(async(e,stats)=>{const r=await worker.fetch(req('chat',{message:'Summarize saved GPU'}),e);assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('private provider detail'));assert.equal(stats().aiCalls,1);assert.equal(stats().reservations,1);},{items:await source(),aiError:true});});
test('unfinished model reasoning is not shown to the user',async()=>{await mocked(async e=>{assert.equal((await worker.fetch(req('chat',{message:'Summarize saved GPU'}),e)).status,503);},{items:await source(),response:'<think>private reasoning without closing tag'});});
test('successful chat stores encrypted owner-bound content',async()=>{await mocked(async(e,stats)=>{const r=await worker.fetch(req('chat',{message:'Summarize saved GPU'}),e);assert.equal(r.status,200);const writes=stats().calls.filter(c=>c.url.endsWith('/chat_messages'));assert.equal(writes.length,2);for(const {opts}of writes){const row=JSON.parse(opts.body);assert.equal(row.user_id,'alice');assert(!opts.body.includes('Saved evidence'));await assert.rejects(decrypt(row.payload,key,'bob'));}},{items:await source()});});
test('chat history retrieves recent messages in chronological display order',async()=>{const history=await Promise.all(['new','old'].map(async text=>({payload:await encrypt({role:'user',content:text},key,'alice')})));await mocked(async(e,stats)=>{const r=await worker.fetch(new Request('https://app.test/api/chat',{headers:{Authorization:'Bearer token'}}),e);assert.deepEqual((await r.json()).messages.map(m=>m.content),['old','new']);assert(stats().calls[1].url.includes('order=created_at.desc'));},{history});});
test('tampered ciphertext cannot be decrypted',async()=>{const cipher=await encrypt({content:'secret'},key,'alice');cipher.data='AAAA'+cipher.data.slice(4);await assert.rejects(decrypt(cipher,key,'alice'));});
test('encoded IPs and credential tricks are rejected',()=>{for(const url of ['https://2130706433','https://0x7f000001','https://0177.0.0.1','https://user@news.com','https://news.com@127.0.0.1'])assert.throws(()=>safeUrl(url));});

test('image validation checks byte signatures and base64 integrity',()=>{
 assert.equal(validScreenshot('data:image/png;base64,'+btoa('not a PNG')),false);
 assert.equal(validScreenshot('data:image/png;base64,AAAA==='),false);
 assert.equal(validScreenshot('data:image/png;base64,'+btoa('\x89PNG\r\n\x1a\n'+'bytes')),true);
 assert.equal(validScreenshot('data:image/jpeg;base64,'+btoa('\xff\xd8\xff'+'bytes')),true);
 assert.equal(validScreenshot('data:image/webp;base64,'+btoa('RIFF0000WEBPbytes')),true);
});
test('a pasted note is saved, sent to AI, and returned as a source without duplicating it in chat storage',async()=>{await mocked(async(e,stats)=>{
 const r=await worker.fetch(req('chat',{message:'Remember this: I want a GPU with 16 GB VRAM for rendering and efficient Linux driver support.'}),e);
 assert.equal(r.status,200);const reply=await r.json();assert.equal(reply.savedItem.type,'note');assert.equal(reply.sources[0].id,'new');assert.equal(stats().aiCalls,1);
 const messages=stats().calls.filter(c=>c.url.endsWith('/chat_messages'));const stored=await decrypt(JSON.parse(messages[1].opts.body).payload,key,'alice');assert.equal(stored.savedItem,undefined);
});});
