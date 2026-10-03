import test from 'node:test';import assert from 'node:assert/strict';
import {createTextReveal,createChatScroll} from '../public/chat-motion.js';
function clock(reduced=false){let time=0,id=0;const frames=new Map();return {raf(fn){frames.set(++id,fn);return id},caf(id){frames.delete(id)},now:()=>time,reduced:()=>reduced,step(){time+=16;const current=[...frames.values()];frames.clear();current.forEach(fn=>fn(time))},drain(){for(let n=0;frames.size&&n<500;n++)this.step();assert.equal(frames.size,0)}}}
test('bursty text reveals progressively without losing text or splitting emoji',async()=>{
 const c=clock(),parts=[],r=createTextReveal(s=>parts.push(s),c),text='Saved your source. '+ 'Application deadlines and details. '.repeat(20)+'😀';
 r.push(text);c.step();assert(parts.join('').length<text.length);r.push(' Done.');const done=r.finish();c.drain();await done;assert.equal(parts.join(''),text+' Done.');assert(parts.every(s=>!/[\uD800-\uDBFF]$/.test(s)));
});
test('reduced motion finishes immediately; cancelling discards pending presentation',async()=>{
 const c=clock(true),parts=[],r=createTextReveal(s=>parts.push(s),c);r.push('One complete reply');await r.finish();assert.equal(parts.join(''),'One complete reply');c.drain();
 const stopped=createTextReveal(s=>parts.push(s),clock());stopped.push('must not appear');stopped.cancel();await stopped.finish();assert.equal(parts.join(''),'One complete reply');
});
test('scroll eases toward new content and stops when the reader scrolls upward',()=>{
 const c=clock(),box=new EventTarget();Object.assign(box,{scrollTop:0,scrollHeight:2000,clientHeight:500});const motion=createChatScroll(box,c);
 motion.follow(true);c.step();assert(box.scrollTop>0&&box.scrollTop<1500);c.drain();assert.equal(box.scrollTop,1500);
 const wheel=new Event('wheel');Object.defineProperty(wheel,'deltaY',{value:-100});box.dispatchEvent(wheel);box.scrollTop=800;box.scrollHeight=2400;motion.follow();c.drain();assert.equal(box.scrollTop,800);
 motion.follow(true);c.drain();assert.equal(box.scrollTop,1900);
});
