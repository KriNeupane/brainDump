import { guidanceReply } from './guidance.js';
// Guest recall never sends memory contents to a server or inference provider.
export function guestReply(question,items){
 const guidance=guidanceReply(question,items.length>0);if(guidance)return {role:'assistant',content:guidance,sources:[]};
 const stop=new Set(['what','did','save','saved','about','read','that','this','with','have','from','sent','article','remember','tell','something','can','you','the','was','for','and','hey','please','recall','past']);
 const terms=[...new Set((question.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(t=>!stop.has(t)))];
 const listAll=/\b(list|recent|latest|everything|all)\b/i.test(question);
 const ranked=items.map(item=>({item,score:terms.reduce((score,t)=>score+(item.title.toLowerCase().includes(t)?3:0)+((item.content+' '+(item.url||'')+' '+item.tags.join(' ')).toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0||listAll).sort((a,b)=>b.score-a.score||new Date(b.item.createdAt)-new Date(a.item.createdAt));
 const sources=ranked.slice(0,3).map(x=>x.item);
 const content=sources.length?'Here are matching memories:\n\n'+sources.map((s,i)=>`[${i+1}] ${s.title} — saved ${new Date(s.createdAt).toLocaleString()}.\n${s.content||'Link saved. Add its article text to recall the contents.'}`).join('\n\n')+'\n\nGuest recall shows saved text; an AI model is not connected.':items.length?'I couldn’t find a matching memory. Try a word from its title or text, or ask “List my recent memories”.':'Your guest library is empty. Use + to save a link, screenshot, or thought, then ask about it. Paste article text or add a screenshot description so I can find its contents.';
 return {role:'assistant',content,sources:sources.map(s=>({id:s.id,title:s.title}))};
}
