import test from 'node:test';import assert from 'node:assert/strict';import worker from '../src/worker.js';
const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public',CONTENT_KEY:'configured'};
test('configuration exposes only public settings',async()=>{const res=await worker.fetch(new Request('https://app.test/api/config'),env);const body=await res.json();assert.equal(body.ready,true);assert.equal(body.CONTENT_KEY,undefined);assert.equal(res.headers.get('Cache-Control'),'no-store');assert.equal(res.headers.get('X-Frame-Options'),'DENY')});
test('API rejects unauthenticated access before touching storage',async()=>{const res=await worker.fetch(new Request('https://app.test/api/memories'),env);assert.equal(res.status,401)});
test('cross-origin mutations are rejected',async()=>{const res=await worker.fetch(new Request('https://app.test/api/memories',{method:'POST',headers:{Origin:'https://attacker.test'},body:'{}'}),env);assert.equal(res.status,403)});
test('unconfigured cloud cannot accept private data',async()=>{const res=await worker.fetch(new Request('https://app.test/api/memories',{method:'POST',body:'{}'}),{});assert.equal(res.status,503)});
