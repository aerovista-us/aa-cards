import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createNpcHttpHandler} from '../gateway/npc-http.mjs';
async function call(handler,payload,headers={},raw){
 const req=Readable.from([raw??JSON.stringify(payload)]);req.url='/api/game/npc';req.method='POST';req.headers={host:'ascension-auth.aerovista.us',origin:'https://ascension.aerovista.us','content-type':'application/json',...headers};
 const res={setHeader(name,value){this.cors??={};this.cors[name]=value;},writeHead(status,h){this.status=status;this.headers=h;},end(s){this.value=s?JSON.parse(s):null;}};await handler(req,res);return res;
}
const base={verifyCsrf:async()=>true,resolveSession:async()=>({subject:'alice'}),loadOwnedRun:async()=>({id:'run1',state:{ownerId:'alice'}}),
 visibleNpcContext:async()=>({npcId:'caseworker',sceneId:'office',facts:['Known placement'],memory:[]}),authorizeDialogue:async()=>true,
 dialogue:{talk:async input=>({text:input.npcId+' has a neutral reply.',provider:'groq'})},origin:'https://ascension.aerovista.us',appOrigin:'https://ascension-auth.aerovista.us'};
test('uses server identity/context and returns only bounded display text',async()=>{
 const result=await call(createNpcHttpHandler(base),{utterance:'Hello'});assert.equal(result.status,200);assert.equal(result.value.text,'caseworker has a neutral reply.');assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.cors['Access-Control-Allow-Origin'],base.origin);
});
test('rejects browser-owned identity/context fields without contacting a provider',async()=>{
 let calls=0;const handler=createNpcHttpHandler({...base,dialogue:{talk:async()=>{calls++;}}});
 for(const extra of [{playerId:'admin'},{npcId:'mitch'},{facts:['private']},{sessionAuthorized:true},{command:{type:'travel'}}])assert.equal((await call(handler,{utterance:'Hello',...extra})).status,422);
 assert.equal(calls,0);
});
test('requires native identity, exact origins/Host, CSRF, owner match, NPC context and action authorization',async()=>{
 assert.equal((await call(createNpcHttpHandler({...base,resolveSession:async()=>null}),{utterance:'Hi'})).status,401);
 for(const headers of [{origin:'https://evil.test'},{host:'evil.test'},{'content-type':'application/json-not-really'}])assert.ok([403,415].includes((await call(createNpcHttpHandler(base),{utterance:'Hi'},headers)).status));
 for(const [override,error] of [[{verifyCsrf:async()=>false},403],[{loadOwnedRun:async()=>({id:'stolen',state:{ownerId:'bob'}})},404],[{visibleNpcContext:async()=>null},403],[{authorizeDialogue:async()=>false},403]])assert.equal((await call(createNpcHttpHandler({...base,...override}),{utterance:'Hi'})).status,error);
});
test('malformed, oversized and invalid requests fail bounded; dependency errors never escape',async()=>{
 const handler=createNpcHttpHandler(base);
 assert.equal((await call(handler,null,{},'{')).status,400);
 assert.equal((await call(handler,{utterance:'x'.repeat(751)})).status,422);
 assert.equal((await call(handler,null,{},'x'.repeat(3000))).status,413);
 const failed=await call(createNpcHttpHandler({...base,resolveSession:async()=>{throw Error('private resolver detail');}}),{utterance:'Hi'});
 assert.equal(failed.status,503);assert.equal(JSON.stringify(failed.value).includes('private'),false);
 assert.throws(()=>createNpcHttpHandler({...base,authorizeDialogue:null}),/authority/);
});
test('a stalled request body times out without reading a game state or calling providers',async()=>{
 let reads=0;const handler=createNpcHttpHandler({...base,bodyTimeoutMs:250,loadOwnedRun:async()=>{reads++;return null;}});
 const req=new Readable({read(){}});req.url='/api/game/npc';req.method='POST';req.headers={host:'ascension-auth.aerovista.us',origin:base.origin,'content-type':'application/json'};
 const res={setHeader(name,value){this.cors??={};this.cors[name]=value;},writeHead(status){this.status=status;},end(s){this.value=s?JSON.parse(s):null;}};await handler(req,res);req.destroy();assert.equal(res.status,408);assert.equal(reads,0);
});
