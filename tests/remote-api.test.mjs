import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const source=readFileSync(new URL('../js/game-frame/remote-api.js',import.meta.url),'utf8');
const {validateApiOrigin,submitGameChoice,requestGameState}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));

test('rejects insecure and malformed remote origins',()=>{
  for (const v of ['http://example.com/','https://user:secret@example.com/','https://example.com/path','https://example.com/?token=secret']) {
    assert.throws(()=>validateApiOrigin(v,'https://aerovista-us.github.io'));
  }
  assert.equal(validateApiOrigin('https://game-api.example.com/','https://aerovista-us.github.io'),'https://game-api.example.com');
});
test('requires revision and server-owned choice identifiers',async()=>{
  await assert.rejects(submitGameChoice('https://game-api.example.com',{sessionId:'abc',storyletId:'one',choiceId:'pick',revision:-1}),/Invalid choice request/);
});
test('validates session response and uses cookie credentials',async()=>{
 const original=globalThis.fetch;
 try {
  let called;
  globalThis.fetch=async(...args)=>{called=args;return {ok:true,json:async()=>({sessionId:'s1',state:{storylet:null},revision:0})}};
  assert.equal((await requestGameState('https://game-api.example.com')).sessionId,'s1');
  assert.equal(called[1].credentials,'include');
  assert.equal(called[1].cache,'no-store');
 } finally {globalThis.fetch=original}
});
