import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerWorldInteractionStore} from '../gateway/owner-world-interaction-store.mjs';
// Memory PostgreSQL-shaped fake for structural tests only; real PG acceptance remains separate.
function fakePool(){
 let row=null;const calls=[];
 const client={async query(sql,args=[]){
  calls.push(sql);
  if(sql==='BEGIN ISOLATION LEVEL READ COMMITTED'||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[]};
  if(sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};
  if(sql.includes('LIMIT 2'))return {rows:row&&row.owner_subject===args[0]?[structuredClone(row)]:[]};
  if(sql.startsWith('INSERT')){if(row)return {rows:[]};row={id:args[0],owner_subject:args[1],revision:0,state:JSON.parse(args[2])};return {rows:[row]};}
  if(sql.startsWith('SELECT'))return {rows:row&&row.id===args[0]&&(!sql.includes('owner_subject=$2')||row.owner_subject===args[1])?[structuredClone(row)]:[]};
  if(sql.startsWith('UPDATE')){if(!row||row.id!==args[1]||row.owner_subject!==args[2]||row.revision!==args[3])return {rows:[]};row.state=JSON.parse(args[0]);row.revision++;return {rows:[structuredClone(row)]};}
  throw Error('unexpected SQL '+sql);
 },release(){}};
 return {pool:{connect:async()=>client},calls};
}
const alice={subject:'alice'},bob={subject:'bob'};
test('create → move → load preserves owner state and revision',async()=>{
 const {pool}=fakePool(),s=createOwnerWorldInteractionStore({pool,authorizeWorld:async()=>true});
 await s.createRun(alice,'office-1');
 const moved=await s.commitAction(alice,'office-1',{expectedRevision:0,command:{type:'move',dx:1,dy:0}});
 assert.equal(moved.revision,1);assert.equal(moved.state.player.x,5);
 const resumed=await s.loadRun(alice,'office-1');assert.deepEqual(resumed.state,moved.state);
});
test('rejects unauthenticated, stale, cross-owner and unauthorized actions',async()=>{
 const {pool}=fakePool(),s=createOwnerWorldInteractionStore({pool,authorizeWorld:async()=>true});
 await assert.rejects(s.createRun(null,'office-1'),e=>e.status===401);
 await s.createRun(alice,'office-1');
 await assert.rejects(s.loadRun(bob,'office-1'),e=>e.status===404);
 await assert.rejects(s.commitAction(bob,'office-1',{expectedRevision:0,command:{type:'move',dx:1,dy:0}}),e=>e.status===404);
 await s.commitAction(alice,'office-1',{expectedRevision:0,command:{type:'move',dx:1,dy:0}});
 await assert.rejects(s.commitAction(alice,'office-1',{expectedRevision:0,command:{type:'move',dx:1,dy:0}}),e=>e.status===409);
});
test('world authorization denies action and no state is updated',async()=>{
 const {pool}=fakePool();const s=createOwnerWorldInteractionStore({pool,authorizeWorld:async(_id,ctx)=>ctx.type!=='action'});
 await s.createRun(alice,'office-1');
 await assert.rejects(s.commitAction(alice,'office-1',{expectedRevision:0,command:{type:'move',dx:1,dy:0}}),e=>e.status===403);
 assert.equal((await s.loadRun(alice,'office-1')).revision,0);
});
test('failed rollback discards the connection and preserves the original failure',async()=>{
 const {pool}=fakePool(),client=await pool.connect();let discarded;
 const query=client.query.bind(client);
 client.query=async(sql,args)=>{if(sql==='ROLLBACK')throw Error('fixture-cleanup-failure');return query(sql,args);};
 client.release=error=>{discarded=error;};
 const store=createOwnerWorldInteractionStore({pool,authorizeWorld:async()=>false});
 await assert.rejects(store.createRun(alice,'office-1'),e=>e.status===403&&e.message==='world_denied');
 assert.equal(discarded.message,'fixture-cleanup-failure');
});


test('a repeated create refuses a second current run and preserves progress',async()=>{
 const {pool,calls}=fakePool(),s=createOwnerWorldInteractionStore({pool,authorizeWorld:async()=>true});
 await s.createRun(alice,'office-1');
 const progressed=await s.commitAction(alice,'office-1',{expectedRevision:0,command:{type:'inspect',target:'notice'}});
 await assert.rejects(s.createRun(alice,'office-retry'),e=>e.status===409&&e.message==='run_exists');
 assert.deepEqual(await s.loadCurrentRun(alice),{id:progressed.id,revision:progressed.revision,state:progressed.state});
 assert.equal(calls.filter(sql=>sql.startsWith('INSERT')).length,1);
 assert.equal(calls.filter(sql=>sql.startsWith('SELECT pg_advisory_xact_lock')).length,2);
});
