export function safeUrl(input) {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Only public HTTPS links are supported.');
  if (!host.includes('.') || /[\[\]:]/.test(host) || /^\d+\./.test(host) || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)) throw new Error('Private network links are not supported.');
  return url;
}
export async function encrypt(value, keyText, owner) {
  const raw = Uint8Array.from(atob(keyText), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(owner)},key,new TextEncoder().encode(JSON.stringify(value)));
  return {iv:btoa(String.fromCharCode(...iv)),data:btoa(Array.from(new Uint8Array(cipher), c=>String.fromCharCode(c)).join(''))};
}
export async function decrypt(value, keyText, owner) {
  const key = await crypto.subtle.importKey('raw',Uint8Array.from(atob(keyText),c=>c.charCodeAt(0)),'AES-GCM',false,['decrypt']);
  const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(value.iv),c=>c.charCodeAt(0)),additionalData:new TextEncoder().encode(owner)},key,Uint8Array.from(atob(value.data),c=>c.charCodeAt(0)));
  return JSON.parse(new TextDecoder().decode(plain));
}
export function extractArticle(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'Saved article';
  const body = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  const text = body.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
  return {title:title.replace(/<[^>]+>/g,'').trim().slice(0,200),text:text.slice(0,40000)};
}
export function retrieve(items, query) {
  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g)||[])].filter(t=>!['what','that','this','with','about','have','from','sent','read','article','remember','tell','something'].includes(t));
  return items.map(item=>({item,score:terms.reduce((n,t)=>n+((item.title+' '+item.content+' '+item.tags.join(' ')).toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.item);
}
