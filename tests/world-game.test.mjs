import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {once} from 'node:events';
import {createWorldGameHandler} from '../gateway/world-game-handler.mjs';
import {projectWorldGame} from '../gateway/world-game-view.mjs';
import {normalizeWorldCommand,normalizeWorldView} from '../game/world-contract.mjs';
import {createOfficeRun,applyWorldAction,restoreOfficeRun} from '../gateway/world-interaction-engine.mjs';
const csrf='fixture-only-csrf-value-123456789';
export function memoryStore(){
 const rows=new Map();let writes=0,allowed=true;
 const deny=(m,s)=>Object.assign(Error(m),{status:s});
 return {rows,get writes(){return writes;},set allowed(v){allowed=v;},
  async loadCurrentRun(who){if(!allowed)throw deny('world_denied',403);return [...rows.values()].find(r=>r.state.ownerId===who.subject)||null;},
  async createRun(who,id){if(!allowed)throw deny('world_denied',403);const state=createOfficeRun({ownerId:who.subject,runId:id});const row={id,revision:0,state};rows.set(id,row);writes++;return row;},
  async commitAction(who,id,input){
   const row=rows.get(id);if(!row||row.state.ownerId!==who.subject)throw deny('not_found',404);
   if(row.revision!==input.expectedRevision)throw deny('stale_revision',409);
   if(!allowed)throw deny('world_denied',403);
   let next;try{next=applyWorldAction(row.state,input.command);}catch(e){throw deny(e.message,422);}
   const updated={id,revision:next.state.revision,state:next.state};rows.set(id,updated);writes++;return updated;
  }
 };
}
async function fixture(t){
 let active=true,mismatch=false,handler,id=0;
 const adapter={auth:{resolveSession:async token=>({ok:true,authenticated:active&&['fixture-a','fixture-b'].includes(token),identityId:token==='fixture-b'?'player-b':'player-a'})},
  identity:{describe:async token=>({ok:true,authenticated:active,identity:{identityId:mismatch?'different':token==='fixture-b'?'player-b':'player-a',status:'active'}})}};
 const store=memoryStore();
 const server=createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'not_found'}));}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 handler=createWorldGameHandler({adapter,store,appOrigin:origin,uiOrigin:origin,newRunId:()=> 'fixture-run-'+(++id)});
 t.after(()=>{server.closeAllConnections();server.close();});
 const send=async(path,{method='GET',value,headers={},token='fixture-a',raw}={})=>{
  if(headers.Host)return new Promise((resolve,reject)=>{
   const request=httpRequest(origin+path,{method,headers:{Origin:origin,Cookie:'ascension_avcc_session='+token+';ascension_csrf='+csrf,
    'Content-Type':'application/json','X-Ascension-CSRF':csrf,...headers}},response=>{
     let data='';response.on('data',c=>{data+=c;});response.on('end',()=>resolve({status:response.statusCode,body:JSON.parse(data),headers:new Headers(response.headers)}));
    });request.on('error',reject);request.end(value===undefined?undefined:JSON.stringify(value));
  });
  const response=await fetch(origin+path,{method,headers:{Origin:origin,Cookie:'ascension_avcc_session='+token+'; ascension_csrf='+csrf,
   ...(method==='POST'?{'Content-Type':'application/json','X-Ascension-CSRF':csrf}:{}),...headers},
   ...(raw!==undefined?{body:raw}:value!==undefined?{body:JSON.stringify(value)}:{})});
  return {status:response.status,body:response.status===204?null:await response.json(),headers:response.headers};
 };
 return {send,store,revoke:()=>{active=false;},mismatch:()=>{mismatch=true;}};
}
test('main-game HTTP create → action → resume returns committed facts without internal saves',async t=>{
 const f=await fixture(t);
 assert.equal((await f.send('/api/game/world')).body.error,'run_not_found');
 const created=await f.send('/api/game/world/runs',{method:'POST',value:{}});
 assert.equal(created.status,201);assert.equal(created.body.view.revision,0);
 const moved=await f.send('/api/game/world/actions',{method:'POST',value:{runId:created.body.view.runId,expectedRevision:0,command:{type:'inspect',target:'notice'}}});
 assert.equal(moved.status,200);assert.equal(moved.body.view.mission.steps[0].complete,true);
 assert.deepEqual((await f.send('/api/game/world')).body.view,moved.body.view);
 const encoded=JSON.stringify(moved.body);
 for(const hidden of ['ownerId','objectState','npcMemory','player-a',csrf,'fixture-a'])assert.equal(encoded.includes(hidden),false);
 assert.equal(moved.headers.get('cache-control'),'no-store');
});
test('malformed request target returns a bounded denial rather than rejecting the router',async()=>{
 const handler=createWorldGameHandler({adapter:{auth:{resolveSession:async()=>null},identity:{describe:async()=>null}},
  store:memoryStore(),appOrigin:'https://ascension-auth.aerovista.us',uiOrigin:'https://ascension.aerovista.us'});
 let status,body;
 const handled=await handler({url:'http://[',headers:{}},{writeHead:s=>{status=s;},end:b=>{body=JSON.parse(b);}});
 assert.equal(handled,true);assert.equal(status,400);assert.deepEqual(body,{error:'invalid_url'});
});
test('untyped backend errors cannot masquerade as request parser statuses',async t=>{
 const f=await fixture(t);
 f.store.loadCurrentRun=async()=>{throw Error('invalid_json');};
 const result=await f.send('/api/game/world');
 assert.equal(result.status,503);assert.deepEqual(result.body,{error:'world_unavailable'});
});
test('cross-owner, permission, revoked and mismatching identity contexts fail closed',async t=>{
 const f=await fixture(t),created=await f.send('/api/game/world/runs',{method:'POST',value:{}});
 const value={runId:created.body.view.runId,expectedRevision:0,command:{type:'move',dx:1,dy:0}};
 assert.equal((await f.send('/api/game/world/actions',{method:'POST',value,token:'fixture-b'})).status,404);
 assert.equal(f.store.writes,1);
 f.store.allowed=false;assert.equal((await f.send('/api/game/world')).status,403);
 f.store.allowed=true;f.mismatch();assert.equal((await f.send('/api/game/world')).status,401);
 f.revoke();assert.equal((await f.send('/api/game/world/actions',{method:'POST',value})).status,401);
 assert.equal(f.store.writes,1);
});
test('origin, host, CSRF, duplicate cookies and body authority injection never reach writes',async t=>{
 const f=await fixture(t);
 for(const headers of [{Origin:'https://foreign.invalid'},{Host:'wrong.invalid'},{'X-Ascension-CSRF':''},{'X-Ascension-CSRF':'incorrect'},{'X-Ascension-CSRF':'é'.repeat(csrf.length)},
  {Cookie:'ascension_avcc_session=fixture-a;ascension_csrf='+csrf+';ascension_csrf='+csrf}]){
  assert.equal((await f.send('/api/game/world/runs',{method:'POST',value:{},headers})).status,403);
 }
 assert.equal((await f.send('/api/game/world/runs',{method:'POST',value:{ownerId:'player-b'}})).status,422);
 assert.equal((await f.send('/api/game/world?owner=player-b')).status,400);
 assert.equal(f.store.writes,0);
 const preflight=await f.send('/api/game/world/runs',{method:'OPTIONS'});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-credentials'),'true');
});
test('stale revision cannot repeat a committed action; oversized/malformed bodies are bounded',async t=>{
 const f=await fixture(t),created=await f.send('/api/game/world/runs',{method:'POST',value:{}});
 const value={runId:created.body.view.runId,expectedRevision:0,command:{type:'move',dx:1,dy:0}};
 assert.equal((await f.send('/api/game/world/actions',{method:'POST',value})).status,200);
 assert.equal((await f.send('/api/game/world/actions',{method:'POST',value})).status,409);
 assert.equal((await f.send('/api/game/world/actions',{method:'POST',value:{...value,ownerId:'other'}})).status,422);
 assert.equal((await f.send('/api/game/world/actions',{method:'POST',value:{...value,command:{type:'move',dx:1,dy:0,state:{}}}})).status,422);
 assert.equal((await f.send('/api/game/world/runs',{method:'POST',raw:'{'})).status,400);
 assert.equal((await f.send('/api/game/world/runs',{method:'POST',raw:'x'.repeat(5000)})).status,413);
 assert.equal(f.store.writes,2);
});
test('opening mission and NPC reactions survive serialized server resume; view strips private extras',()=>{
 let state=createOfficeRun({ownerId:'player-a',runId:'run-1'});
 const commands=[{type:'inspect',target:'notice'},...Array.from({length:3},()=>({type:'move',dx:1,dy:0})),
  {type:'open',target:'cabinet'},{type:'move',dx:1,dy:0},{type:'talk',target:'caseworker',topic:'placement'}];
 for(const command of commands)state=applyWorldAction(state,command).state;
 state=restoreOfficeRun(JSON.stringify(state),{ownerId:'player-a'});
 const view=projectWorldGame({subject:'player-a'},{id:state.runId,revision:state.revision,state:{...state,seedString:'private-seed'}});
 assert.equal(view.mission.complete,true);assert.equal(view.mission.steps.every(x=>x.complete),true);
 assert.equal(JSON.stringify(view).includes('private-seed'),false);
 assert.equal(JSON.stringify(view).includes('npcMemory'),false);
 assert.throws(()=>projectWorldGame({subject:'player-b'},{id:state.runId,revision:state.revision,state}),e=>e.status===404);
 assert.deepEqual(normalizeWorldView({...view,token:'private'}),view);
 assert.throws(()=>normalizeWorldCommand({type:'move',dx:1,dy:0,ownerId:'other'}));
 assert.throws(()=>normalizeWorldView({...view,revision:-1}));
});
