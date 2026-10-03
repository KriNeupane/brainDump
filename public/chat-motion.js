// Present only received text, smoothing network bursts without delaying a full reply.
export function createTextReveal(append,{raf=requestAnimationFrame,caf=cancelAnimationFrame,now=()=>performance.now(),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden}={}){
 let queue='',frame=0,last=now(),ending=false,resolve;
 const completed=new Promise(r=>resolve=r);
 function tick(time){frame=0;const elapsed=Math.min(50,Math.max(1,time-last));last=time;
  const count=reduced()?queue.length:Math.max(1,Math.ceil(Math.max(140,queue.length/0.2)*elapsed/1000));
  let end=Math.min(queue.length,count);if(end<queue.length&&/[\uD800-\uDBFF]/.test(queue[end-1]))end++;
  if(end){append(queue.slice(0,end));queue=queue.slice(end)}
  if(queue)frame=raf(tick);else if(ending)resolve();
 }
 function schedule(){if(!frame){last=now();frame=raf(tick)}}
 return {push(text){queue+=text;schedule()},finish(){ending=true;if(reduced()){if(frame)caf(frame);frame=0;if(queue)append(queue);queue='';resolve()}else if(queue)schedule();else resolve();return completed},cancel(){if(frame)caf(frame);queue='';frame=0;resolve()}};
}

export function createChatScroll(box,{raf=requestAnimationFrame,caf=cancelAnimationFrame,now=()=>performance.now(),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 let following=true,frame=0,last=0;
 const bottom=()=>Math.max(0,box.scrollHeight-box.clientHeight);
 function stop(){following=false;if(frame)caf(frame);frame=0}
 function tick(time){frame=0;if(!following)return;const target=bottom(),distance=target-box.scrollTop;
  box.scrollTop=Math.abs(distance)<1||reduced()?target:box.scrollTop+distance*(1-Math.exp(-Math.min(50,time-last)/75));last=time;
  if(Math.abs(bottom()-box.scrollTop)>1)frame=raf(tick);else box.scrollTop=bottom();
 }
 box.addEventListener('wheel',e=>{if(e.deltaY<0)stop()},{passive:true});
 box.addEventListener('touchstart',stop,{passive:true});
 box.addEventListener('pointerdown',e=>{if(e.target===box)stop()},{passive:true});
 box.addEventListener('keydown',e=>{if(['ArrowUp','PageUp','Home'].includes(e.key))stop()});
 box.addEventListener('scroll',()=>{if(!frame)following=bottom()-box.scrollTop<40},{passive:true});
 return {follow(force=false){if(force)following=true;if(!following)return;if(reduced()){box.scrollTop=bottom();return}if(!frame){last=now();frame=raf(tick)}},stop};
}
