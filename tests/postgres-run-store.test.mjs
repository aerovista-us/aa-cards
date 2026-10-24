import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresRunStore,RUNS_MIGRATION} from '../gateway/postgres-run-store.mjs';

test('migration declares owner/revision isolation and expected index',()=>{
 assert.match(RUNS_MIGRATION,/owner_subject TEXT NOT NULL/);
 assert.match(RUNS_MIGRATION,/revision BIGINT/);
 assert.match(RUNS_MIGRATION,/owner_active_idx/);
});
test('owned reads bind identity, never concatenate SQL',async()=>{
 const calls=[];
 const pool={query:async (...args)=>{calls.push(args);return {rows:[]}},connect:async()=>{throw Error('unused')}};
 const store=createPostgresRunStore(pool);
 assert.equal(await store.readOwned('alice','run-1'),null);
 assert.match(calls[0][0],/owner_subject=\$1 AND id=\$2/);
 assert.deepEqual(calls[0][1],['alice','run-1']);
 await assert.rejects(store.readOwned('alice; DROP TABLE ascension_runs','run-1'),/Invalid/);
});
test('transaction commits through locked owner scope and revision CAS',async()=>{
 const calls=[],client={
  query:async(sql,args)=>{calls.push([sql,args]);if(sql.includes('FOR UPDATE'))return {rows:[{id:'run-1',owner_subject:'alice',revision:'2',active:true,current_storylet_id:'office',chapter_id:'free',state:{turn:2}}]};return {rowCount:1,rows:[]}},
  release:()=>calls.push(['RELEASE'])
 };
 const pool={query:async()=>({rows:[]}),connect:async()=>client};
 const store=createPostgresRunStore(pool);
 await store.transaction(async tx=>{
  const run=await tx.readOwnedForUpdate('alice','run-1');
  assert.equal(run.revision,2);
  await tx.writeOwned('alice',2,{...run,revision:3,currentStoryletId:'next',state:{turn:3}});
 });
 assert.deepEqual(calls.map(x=>x[0]).filter(x=>typeof x==='string').slice(-2),['COMMIT','RELEASE']);
 const write=calls.find(x=>x[0].startsWith('UPDATE ascension_runs'));
 assert.deepEqual(write[1].slice(0,4),['alice','run-1',2,3]);
});
test('exceptions roll back and release the connection',async()=>{
 const calls=[];const pool={query:async()=>({rows:[]}),connect:async()=>({query:async s=>{calls.push(s)},release:()=>calls.push('RELEASE')})};
 const store=createPostgresRunStore(pool);
 await assert.rejects(store.transaction(async()=>{throw Error('failed')}),/failed/);
 assert.deepEqual(calls,['BEGIN','ROLLBACK','RELEASE']);
});
