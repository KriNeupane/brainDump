import test from 'node:test';
import assert from 'node:assert/strict';
import {guestReply} from '../public/guest.js';
const items=[{id:'gpu',title:'GPU roadmap',content:'More video memory for rendering.',tags:['hardware'],createdAt:'2026-10-03T12:00:00Z'},{id:'recipe',title:'Soup recipe',content:'Carrots and lentils.',tags:['food'],createdAt:'2026-10-02T12:00:00Z'}];
test('guest recall cites matching saved content and excludes unrelated memories',()=>{const reply=guestReply('hey what was that gpu article I read?',items);assert.deepEqual(reply.sources,[{id:'gpu',title:'GPU roadmap'}]);assert.match(reply.content,/More video memory/);assert.doesNotMatch(reply.content,/Carrots/)});
test('guest recall distinguishes empty library and no matches',()=>{assert.match(guestReply('What did I save about GPUs?',[]).content,/library is empty/);assert.deepEqual(guestReply('quantum physics',items).sources,[]);assert.match(guestReply('quantum physics',items).content,/couldn’t find/)});
test('guest can request recent memories without a topic',()=>{assert.deepEqual(guestReply('List my recent memories',items).sources.map(s=>s.id),['gpu','recipe'])});
