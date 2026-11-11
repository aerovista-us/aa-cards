// Bounded recovered-code proof only; never a live Account or full-game certificate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {State} from '../gateway/recovered-v4/state.js';
import library from '../gateway/recovered-v4/library.json' with {type:'json'};
import {createBoundedRecoveredChoiceExecutor} from '../gateway/recovered-choice-transaction.mjs';
import {createOwnerCutsceneTransaction} from '../gateway/owner-cutscene-transaction.mjs';
if(process.env.ASCENSION_DISPOSABLE_PG!=='1'||process.env.PGHOST!=='127.0.0.1'||process.env.PGDATABASE!=='ascension_world_ci'||process.env.PGUSER!=='ascension_ci'||!process.env.WORLD_PG_MODULE_PATH)throw Error('Explicit disposable loopback PostgreSQL required');
const {Pool}=createRequire(import.meta.url)(process.env.WORLD_PG_MODULE_PATH),pool=new Pool({max:5});
const alice={subject:'recovered-fixture-alice'},bob={subject:'recovered-fixture-bob'},choiceId='recovered-choice-fixture',sceneId='recovered-scene-fixture';
const snapshot=async id=>{const r=await pool.query('SELECT id,revision,state FROM ascension_player_runs WHERE id=$1',[id]);return {...r.rows[0],revision:Number(r.rows[0].revision)};};
if(process.env.RECOVERED_RESUME_WORKER==='1'){
 try{console.log(JSON.stringify({choice:await snapshot(choiceId),scene:await snapshot(sceneId)}));}finally{await pool.end();}
}else test('disposable PostgreSQL: bounded recovered choice and cutscene transactions',async t=>{
 t.after(()=>pool.end());
 await pool.query(await readFile(new URL('../gateway/migrations/001_player_runs.sql',import.meta.url),'utf8'));
 const engine=new State();engine.reset('NEW');const s=engine.snapshot();
 Object.assign(s,{seedString:'recovered-fixture-seed',rngDraws:0,currentWorld:'AFTERLIFE',actionPoints:4,pos:{x:0,y:0},
  flags:{...s.flags,officeOnboardComplete:true,mainIntroQuestComplete:true,mainAwakeningBriefed:true,soulResonanceSolved:true,lifeRecognitionSolved:true},
  worldMap:{width:1,height:1,tiles:[{tags:['rest','office','clerks','veil','hazard','archive'],spawns:[]}]}});
 const scene={seedString:'scene-fixture-seed',rngDraws:4,flags:{cutscenes:{deathWake:true}},activeCutsceneKey:'deathWake',pendingCutsceneQueue:['officeIntake','floorTutorial'],pendingCanonicalTasks:['drainCutsceneQueue']};
 for(const [id,state] of [[choiceId,s],[sceneId,scene]])await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES($1,$2,0,$3::jsonb)',[id,alice.subject,JSON.stringify(state)]);
 let allowed=true;
 const build=p=>createBoundedRecoveredChoiceExecutor({pool:p,library,authorizeChapter:async()=>allowed});
 const choices=build(pool),scenes=createOwnerCutsceneTransaction({pool,authorizeChapter:async()=>allowed});
 const command={storyletId:'observe.afterlife.overhead_announcements',choiceId:'play_along',expectedRevision:0};
 await t.test('same-revision choices commit once and wrong owner is denied for that exact run',async()=>{
  const attempts=await Promise.allSettled([choices.commitChoice(alice,choiceId,command),choices.commitChoice(alice,choiceId,command)]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(attempts.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
  const saved=attempts.find(x=>x.status==='fulfilled').value;
  assert.deepEqual((await choices.loadOwnedRun(alice,choiceId)).state,saved.state);
  assert.equal(await choices.loadOwnedRun(bob,choiceId),null);
  await assert.rejects(choices.commitChoice(bob,choiceId,{...command,expectedRevision:1}),e=>e.status===404);
  assert.equal((await snapshot(choiceId)).revision,1);
 });
 await t.test('denied chapter and failure after SQL update preserve committed choice state',async()=>{
  const before=await snapshot(choiceId);allowed=false;
  await assert.rejects(choices.commitChoice(alice,choiceId,{...command,expectedRevision:1}),e=>e.status===403);allowed=true;
  const failing={...pool,connect:async()=>{
   const c=await pool.connect();return {release:e=>c.release(e),query:async(sql,args)=>{const r=await c.query(sql,args);if(sql.startsWith('UPDATE'))throw Error('injected-after-update');return r;}};
  }};
  // The observation is on cooldown after the first commit. Use an independent
  // eligible fixture so this assertion actually reaches UPDATE.
  const rollbackId='recovered-rollback-fixture';
  await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES($1,$2,0,$3::jsonb)',[rollbackId,alice.subject,JSON.stringify(s)]);
  const rollbackBefore=await snapshot(rollbackId);
  await assert.rejects(build(failing).commitChoice(alice,rollbackId,command),/injected-after-update/);
  assert.deepEqual(await snapshot(rollbackId),rollbackBefore);
  assert.deepEqual(await snapshot(choiceId),before);
 });
 await t.test('cutscenes require finished opening setup, owner, revision and the actual active key',async()=>{
  await pool.query('UPDATE ascension_player_runs SET state=jsonb_set(state,\'{pendingCanonicalTasks}\',\'["ensureWorldTaskBoard"]\') WHERE id=$1',[sceneId]);
  const before=await snapshot(sceneId);
  await assert.rejects(scenes.continueCutscene(alice,sceneId,{expectedRevision:0,cutsceneKey:'deathWake'}),e=>e.status===409&&e.message==='opening_setup_pending');
  assert.deepEqual(await snapshot(sceneId),before);
  await pool.query('UPDATE ascension_player_runs SET state=$1::jsonb WHERE id=$2',[JSON.stringify(scene),sceneId]);
  for(const key of ['deathWake','officeIntake','floorTutorial']){
   const prior=await snapshot(sceneId),input={expectedRevision:prior.revision,cutsceneKey:key};
   await assert.rejects(scenes.continueCutscene(bob,sceneId,input),e=>e.status===404);
   await assert.rejects(scenes.continueCutscene(alice,sceneId,{...input,cutsceneKey:'wrong-scene'}),e=>e.status===409);
   assert.deepEqual(await snapshot(sceneId),prior);
   const next=await scenes.continueCutscene(alice,sceneId,input);assert.equal(next.revision,prior.revision+1);assert.equal(next.state.rngDraws,4);
   await assert.rejects(scenes.continueCutscene(alice,sceneId,input),e=>e.status===409);
  }
  const done=await snapshot(sceneId);assert.equal(done.revision,3);assert.equal(done.state.activeCutsceneKey,null);assert.deepEqual(done.state.pendingCutsceneQueue,[]);
 });
 await t.test('new Node process restores the exact committed choice and cutscene states',async()=>{
  const expected={choice:await snapshot(choiceId),scene:await snapshot(sceneId)},env={...process.env,RECOVERED_RESUME_WORKER:'1'};delete env.NODE_TEST_CONTEXT;
  const worker=await promisify(execFile)(process.execPath,[fileURLToPath(import.meta.url)],{env,timeout:15000,maxBuffer:131072});
  assert.deepEqual(JSON.parse(worker.stdout),expected);
 });
});
