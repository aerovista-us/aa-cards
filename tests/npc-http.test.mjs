import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createNpcHttpHandler} from '../gateway/npc-http.mjs';
async function call(handler,payload,headers={}){
 const req=Readable.from([JSON.stringify(payload)]);
 req.method='POST';req.headers={origin:'https://ascension.aerovista.us','content-type':'application/json',...headers};
 const res={status:0,headers:null,writeHead(code,h){this.status=code;this.headers=h},end(s){this.value=JSON.parse(s)}};
 await handler(req,res);return res;
}
const base={verifyCsrf:async()=>true,resolveSession:async()=>({subject:'alice'}),loadOwnedRun:async()=>({id:'run1'}),
 visibleNpcContext:async()=>({npcId:'caseworker',sceneId:'office',facts:['Known placement'],memory:[]}),
 dialogue:{talk:async input=>({text:input.playerId+' '+input.npcId,provider:'groq'})},
 origin:'https://ascension.aerovista.us'};
test('authenticates and never accepts browser-owned context',async()=>{
 const x=await call(createNpcHttpHandler(base),{utterance:'Hello',playerId:'admin',npcId:'mitch',facts:['secret']});
 assert.equal(x.status,200);assert.equal(x.value.text,'alice caseworker');
 assert.equal(x.headers['Cache-Control'],'no-store');
});
test('rejects anonymous, cross-origin and missing scene',async()=>{
 assert.equal((await call(createNpcHttpHandler({...base,resolveSession:async()=>null}),{utterance:'Hi'})).status,401);
 assert.equal((await call(createNpcHttpHandler(base),{utterance:'Hi'},{origin:'https://evil.test'})).status,403);
 assert.equal((await call(createNpcHttpHandler({...base,visibleNpcContext:async()=>null}),{utterance:'Hi'})).status,403);
});
test('rejects oversized user utterance before calling provider',async()=>{
 assert.equal((await call(createNpcHttpHandler(base),{utterance:'x'.repeat(751)})).status,422);
});

test('rejects missing CSRF authorization before game state access',async()=>{
 const x=await call(createNpcHttpHandler({...base,verifyCsrf:async()=>false}),{utterance:'Hi'});
 assert.equal(x.status,403);assert.equal(x.value.error,'invalid_csrf');
});
