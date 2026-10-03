export function visibleAnswer(raw){return raw.replace(/<think>[\s\S]*?(?:<\/think>|$)/g,'').replace(/<[^>]*$/,'').trimStart().slice(0,2400);}
export function streamAnswer(source,meta,persist){
 const encoder=new TextEncoder();
 return new Response(new ReadableStream({async start(controller){
  const emit=data=>controller.enqueue(encoder.encode('data: '+JSON.stringify(data)+'\n\n'));
  let raw='',visible='',pending='';const reader=source.getReader();const decoder=new TextDecoder();
  try{
   emit({type:'start',...meta});
   const line=value=>{if(!value.startsWith('data:'))return;const payload=value.slice(5).trim();if(!payload||payload==='[DONE]')return;let event;try{event=JSON.parse(payload);}catch{return;}
    raw+=event.choices?.[0]?.delta?.content||event.response||'';const next=visibleAnswer(raw);if(next.length>visible.length){emit({type:'delta',text:next.slice(visible.length)});visible=next;}
   };
   for(;;){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});const lines=pending.split('\n');pending=lines.pop();for(const value of lines)line(value);}
   pending+=decoder.decode();if(pending)line(pending);
   if(!visible.trim())throw Error('empty');
   await persist(visible);emit({type:'done'});
  }catch{emit({type:'error',message:visible?'The reply was interrupted or could not be saved. Please try again.':'AI is unavailable right now. Please try again later.'});}
  finally{await reader.cancel().catch(()=>{});controller.close();}
 }}),{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
}
