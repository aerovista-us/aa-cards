import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerRunStore} from '../gateway/owner-run-store.mjs';
function harness() {
 const db={id:'run-1',owner_subject:'alice',revision:0,state:{turn:0}};
 let updates=0, rollbacks=0;
 const client={async query(sql,args) {
   if (sql==='BEGIN'||sql==='COMMIT') return {rows:[]};
   if (sql==='ROLLBACK') {rollbacks++;return {rows:[]}};
   if (sql.includes('FOR UPDATE')) return {rows:[{...db}]};
   if (sql.startsWith('UPDATE')) {
     updates++; db.state=JSON.parse(args[0]);db.revision++;return {rows:[{id:db.id,revision:db.revision,state:db.state}]};
   }
   throw new Error('unknown SQL '+sql);
 },release(){}};
 const store=createOwnerRunStore({
  pool:{connect:async()=>client,query:async(_sql,args)=>({rows:args[0]==='alice'?[{id:db.id,revision:db.revision,state:db.state}]:[]})},
  executeCanonicalChoice:async(state,input)=>({...state,turn:state.turn+1,choice:input.choiceId}),
  authorizeChapter:async identity=>identity.subject==='alice'
 });
 return {store,db,get updates(){return updates},get rollbacks(){return rollbacks}};
}
const input={storyletId:'hallway',choiceId:'left',expectedRevision:0};
test('canonical execution persists and owner sees same revision on reload',async()=>{
 const h=harness();let saved=await h.store.commitChoice({subject:'alice'},'run-1',input);
 assert.equal(saved.revision,1);assert.equal(saved.state.turn,1);
 assert.deepEqual(await h.store.loadOwnedRun({subject:'alice'},'run-1'),saved);
});
test('cross-user ownership denied before mutation',async()=>{
 const h=harness();await assert.rejects(h.store.commitChoice({subject:'bob'},'run-1',input),{status:404});
 assert.equal(h.updates,0);assert.equal(h.rollbacks,1);
 assert.equal(await h.store.loadOwnedRun({subject:'bob'},'run-1'),null);
});
test('stale replay fails before canonical executor and write',async()=>{
 const h=harness();await h.store.commitChoice({subject:'alice'},'run-1',input);
 await assert.rejects(h.store.commitChoice({subject:'alice'},'run-1',input),{status:409});
 assert.equal(h.updates,1);
});
test('requires real executor and chapter authorization',()=>{
 assert.throws(()=>createOwnerRunStore({pool:{connect(){}}}),/Required server authorities/);
});

test('accepts canonical dotted storylet IDs and PostgreSQL bigint string revisions',async()=>{
 const h=harness();
 h.db.revision='0';
 const saved=await h.store.commitChoice({subject:'alice'},'run-1',{
   storyletId:'earth.construction.clock_in',
   choiceId:'check_safety_board',expectedRevision:0
 });
 assert.equal(saved.revision,1);
 assert.equal((await h.store.loadOwnedRun({subject:'alice'},'run-1')).revision,1);
});
