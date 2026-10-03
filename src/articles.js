import {safeUrl,extractArticle} from './security.js';
export function publicAddress(address){
 if(address.includes(':'))return /^[23][0-9a-f]{0,3}:/i.test(address)&&!/^2001:(?:db8|0:|10:|20:)/i.test(address);
 const octets=address.split('.').map(Number);if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 const [a,b]=octets;return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0);
}
// Fail closed for private DNS, every redirect, oversized bodies, and slow responses.
export async function readArticle(input){
 let url=safeUrl(input);const signal=AbortSignal.timeout(10000);
 for(let hop=0;hop<4;hop++){
  const answers=await Promise.all(['A','AAAA'].map(async type=>{const dns=await fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name:url.hostname,type}),{headers:{Accept:'application/dns-json'},signal});if(!dns.ok)throw Error('Could not verify article address.');const data=await dns.json();if(data.Status!==0&&data.Status!==3)throw Error('Could not verify article address.');return (data.Answer||[]).filter(a=>a.type===1||a.type===28).map(a=>a.data);}));
  const ips=answers.flat();if(!ips.length||ips.some(ip=>!publicAddress(ip)))throw Error('Private network links are not supported.');
  const response=await fetch(url.href,{redirect:'manual',signal,headers:{Accept:'text/html,text/plain','User-Agent':'BrainDump/0.1 article reader'}});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('Location');if(!location)throw Error('Article redirect is invalid.');url=safeUrl(new URL(location,url).href);continue;}
  if(!response.ok)throw Error('This site blocked access. Paste its article text here instead.');
  if(!/text\/(html|plain)/i.test(response.headers.get('Content-Type')||''))throw Error('This link is not a readable article.');
  if(Number(response.headers.get('Content-Length'))>1000000)throw Error('Article is too large.');
  const reader=response.body.getReader();let size=0,html='';const decoder=new TextDecoder();
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1000000)throw Error('Article is too large.');html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel();}
  const article=extractArticle(html);if(article.text.length<40)throw Error('Could not read this article. Paste its text here instead.');
  return {title:article.title,content:article.text,url:url.href};
 }throw Error('Too many article redirects.');
}
