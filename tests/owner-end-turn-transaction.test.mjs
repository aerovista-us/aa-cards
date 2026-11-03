import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerEndTurnTransaction} from '../gateway/owner-end-turn-transaction.mjs';
const state=()=>({seedString:'m18-owner-turn',rngDraws:0,currentWorld:'AFTERLIFE',turn:2,maxActionPoints:4,actionPoints:0,heat:2,cooldowns:{a:2},npcs:{},consequences:{timeline:0},storyMemory:{pendingEchoes:[],worldTaskBoard:{AFTERLIFE:{key:'k',tasks:[{id:'x',x:0,y:0,mobility:'static'}]}}},worldMap:{width:1,height:1,tiles:[{spawns:[]}]}});
function db(){
 let saved={id:'run',owner_subject:'alice',revision:0,state:state()},tx=null,writes=0;
 return {get:()=>structuredClone(saved),writes:()=>writes,pool:{async connect(){return {
  async query(sql,args){
   if(sql==='BEGIN'){tx=structuredClone(saved);return {rows:[]}}
   if(sql==='ROLLBACK'){tx=null;return {rows:[]}}
   if(sql==='COMMIT'){saved=tx;tx=null;return {rows:[]}}
   if(sql.startsWith('SELECT'))return {rows:[structuredClone(tx)]};
   if(sql.startsWith('UPDATE')){tx.state=JSON.parse(args[0]);tx.revision++;writes++;return {rows:[structuredClone(tx)]}}
   throw Error(sql);
  },release(){}
 }}}};
}
const context=()=>({authoritative:true,inBounds:()=>true,syncTaskMarkers:()=>{},noteTurn:()=>{},ui:{}});
const runtime=(d,auth=async()=>true,resolver=context)=>createOwnerEndTurnTransaction({pool:d.pool,authorizeChapter:auth,resolveCanonicalTurnContext:resolver});
test('owner turn saves complete cloned state and RNG in one CAS revision',async()=>{
 const d=db(),before=d.get(),r=await runtime(d).endTurn({subject:'alice'},'run',{expectedRevision:0});
 assert.equal(r.revision,1);assert.equal(r.state.turn,3);assert.equal(r.state.actionPoints,4);
 assert.equal(r.state.cooldowns.a,1);assert.ok(r.state.rngDraws>0);assert.equal(d.get().state.turn,3);
 assert.equal(before.state.turn,2);assert.equal(d.writes(),1);
});
test('foreign owner, stale revision, denied chapter and untrusted client override fail closed',async()=>{
 const d=db(),before=d.get();
 await assert.rejects(runtime(d).endTurn({subject:'bob'},'run',{expectedRevision:0}),e=>e.status===404);
 await assert.rejects(runtime(d).endTurn({subject:'alice'},'run',{expectedRevision:1}),e=>e.status===409);
 await assert.rejects(runtime(d,async()=>false).endTurn({subject:'alice'},'run',{expectedRevision:0}),e=>e.status===403);
 await assert.rejects(runtime(d).endTurn({subject:'alice'},'run',{expectedRevision:0,ui:{}}),e=>e.status===422);
 await assert.rejects(runtime(d,async()=>true,()=>({})).endTurn({subject:'alice'},'run',{expectedRevision:0}),e=>e.status===422);
 assert.deepEqual(d.get(),before);assert.equal(d.writes(),0);
});
test('cutscene and pending board sequences cannot advance persisted turn',async()=>{
 for(const patch of [{pendingCanonicalTasks:['syncTaskMarkers']},{pendingCutsceneQueue:['scene']},{activeCutsceneKey:'intro'}]){
  const d=db(),snap=d.get();snap.state={...snap.state,...patch};
  const r=createOwnerEndTurnTransaction({pool:{async connect(){return {async query(sql){if(sql==='BEGIN'||sql==='ROLLBACK')return {rows:[]};if(sql.startsWith('SELECT'))return {rows:[snap]};throw Error('unexpected write')},release(){}}}},authorizeChapter:async()=>true,resolveCanonicalTurnContext:context});
  await assert.rejects(r.endTurn({subject:'alice'},'run',{expectedRevision:0}),e=>e.status===409);
 }
});
