import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldGameClient} from '../game/world-client.mjs';
import {createOfficeRun,applyWorldAction} from '../gateway/world-interaction-engine.mjs';
import {projectWorldGame} from '../gateway/world-game-view.mjs';
const csrf='fixture-csrf-only-not-real-12345';
const active={authenticated:true,identity:{id:'fixture-identity'},csrf};
const response=(status,body)=>({status,body});
const run=createOfficeRun({ownerId:'fixture-identity',runId:'run-1'});
const view=state=>projectWorldGame({subject:'fixture-identity'},{id:state.runId,revision:state.revision,state});
function setup(replies){
 const calls=[],states=[];
 const client=createWorldGameClient({onChange:s=>states.push(s),fetchImpl:async(url,options)=>{
  calls.push({url,options});const next=replies.shift();if(next instanceof Error)throw next;
  if(typeof next==='function')return next();
  return {status:next.status,headers:new Headers({'Content-Type':'application/json'}),json:async()=>next.body};
 }});
 return {client,calls,states};
}
test('main client loads server view and submits only offered command plus expected revision',async()=>{
 const next=applyWorldAction(run,{type:'inspect',target:'notice'}).state;
 const f=setup([response(200,active),response(200,{view:view(run)}),response(200,{view:view(next)})]);
 await f.client.refresh();await f.client.act('inspect-notice');
 assert.equal(f.client.snapshot().view.revision,1);
 const posted=JSON.parse(f.calls[2].options.body);
 assert.deepEqual(posted,{runId:'run-1',expectedRevision:0,command:{type:'inspect',target:'notice'}});
 assert.equal(f.calls[2].options.headers['X-Ascension-CSRF'],csrf);
 assert.ok(f.calls.every(c=>c.options.credentials==='include'&&c.options.redirect==='error'&&c.options.cache==='no-store'));
 assert.equal(JSON.stringify(f.states).includes(csrf),false);
 assert.equal(JSON.stringify(f.states).includes('fixture-identity'),false);
});
test('missing deployment never becomes a local game or enables begin',async()=>{
 const f=setup([response(200,active),response(404,{error:'not_found'})]);
 await f.client.refresh();assert.equal(f.client.snapshot().phase,'unavailable');
 await assert.rejects(f.client.begin(),/game_not_ready/);assert.equal(f.calls.length,2);
});
test('explicit no-run response permits a server-created run, without client-owned state',async()=>{
 const f=setup([response(200,active),response(404,{error:'run_not_found'}),response(201,{view:view(run)})]);
 await f.client.refresh();assert.equal(f.client.snapshot().phase,'new_run');await f.client.begin();
 assert.deepEqual(JSON.parse(f.calls[2].options.body),{});assert.equal(f.client.snapshot().phase,'ready');
});
test('conflict, lost confirmation or inactive session clears the playable view',async()=>{
 for(const reply of [response(409,{error:'stale_revision'}),response(401,{error:'authentication_required'}),response(403,{error:'world_denied'}),new Error('private backend detail'),response(200,{view:view(run)})]){
  const f=setup([response(200,active),response(200,{view:view(run)}),reply]);
  await f.client.refresh();await f.client.act('move-east');
  assert.equal(f.client.snapshot().view,null);
  await assert.rejects(f.client.act('move-east'),/game_not_ready/);
  assert.equal(JSON.stringify(f.states).includes('private backend detail'),false);
 }
});
test('invalid or invented action is never submitted',async()=>{
 const f=setup([response(200,active),response(200,{view:view(run)})]);await f.client.refresh();
 await assert.rejects(f.client.act('open-cabinet'),/action_not_offered/);
 assert.equal(f.calls.length,2);
});
test('overlapping submissions are blocked and clearing invalidates in-flight results',async()=>{
 let finish;
 const f=setup([response(200,active),response(200,{view:view(run)}),()=>new Promise(resolve=>{finish=resolve;})]);
 await f.client.refresh();const pending=f.client.act('move-east');
 await assert.rejects(f.client.act('move-east'),/request_pending/);f.client.clear();
 const moved=applyWorldAction(run,{type:'move',dx:1,dy:0}).state;
 finish({status:200,headers:new Headers({'Content-Type':'application/json'}),json:async()=>({view:view(moved)})});
 await pending;assert.equal(f.client.snapshot().phase,'idle');assert.equal(f.client.snapshot().view,null);
});

test('restoration refresh waits behind an invalidated request and reloads current authorization',async()=>{
 let finish;
 const f=setup([()=>new Promise(resolve=>{finish=resolve;}),response(200,active),response(200,{view:view(run)})]);
 const original=f.client.refresh();f.client.clear();
 const restored=f.client.refresh(),alsoRestored=f.client.refresh();assert.equal(f.calls.length,1);
 finish({status:200,headers:new Headers({'Content-Type':'application/json'}),json:async()=>active});
 await Promise.all([original,restored,alsoRestored]);
 assert.equal(f.client.snapshot().phase,'ready');assert.equal(f.calls.length,3);
 assert.equal(f.calls.filter(c=>c.url.endsWith('/api/session')).length,2);
 assert.equal(f.client.snapshot().view.runId,'run-1');
});
test('clearing again cancels a queued restoration without new background requests',async()=>{
 let finish;
 const f=setup([()=>new Promise(resolve=>{finish=resolve;})]);
 const original=f.client.refresh();f.client.clear();const queued=f.client.refresh();f.client.clear();
 assert.equal((await queued).phase,'idle');
 finish({status:200,headers:new Headers({'Content-Type':'application/json'}),json:async()=>active});
 await original;assert.equal(f.client.snapshot().phase,'idle');assert.equal(f.calls.length,1);
});
test('restoring behind an invalidated mutation discards its response before reading the saved revision',async()=>{
 let finish;
 const moved=applyWorldAction(run,{type:'move',dx:1,dy:0}).state;
 const f=setup([response(200,active),response(200,{view:view(run)}),()=>new Promise(resolve=>{finish=resolve;}),response(200,active),response(200,{view:view(moved)})]);
 await f.client.refresh();const mutation=f.client.act('move-east');f.client.clear();const restored=f.client.refresh();
 finish({status:200,headers:new Headers({'Content-Type':'application/json'}),json:async()=>({view:view(moved)})});
 await Promise.all([mutation,restored]);assert.equal(f.client.snapshot().phase,'ready');assert.equal(f.client.snapshot().view.revision,1);
 assert.equal(f.calls.length,5);
});
