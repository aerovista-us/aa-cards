// Opt-in genuine disposable PostgreSQL integration for recovered opening.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createRecoveredPrologueStore} from '../gateway/recovered-prologue-store.mjs';
const require=createRequire(process.env.PG_REQUIRE_FROM||'/srv/ACOS/AeroVistaCore/core-registry/api/package.json');
const {Pool}=require('pg');
if(!process.env.ISOLATED_PG_URL)throw new Error('ISOLATED_PG_URL required: disposable PostgreSQL ONLY');
const pool=new Pool({connectionString:process.env.ISOLATED_PG_URL});
const id='prologue-proof-'+process.pid;
const world={id:'AFTERLIFE',map:{shape:'office',w:12,h:10},tags:['clerks','rest','archive']};
const save={seedString:'Billy-integration-proof',rngDraws:4,currentWorld:'EARTH_PROLOGUE',pos:{x:1,y:1},
 flags:{earthPrologueDead:true},unlockedWorlds:['EARTH_PROLOGUE'],maxActionPoints:3,
 actionPoints:0,heat:0,storyMemory:{npcMemory:{caseworkerSuspicion:2},pendingEchoes:[]}};
try{
 await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES ($1,$2,0,$3::jsonb)',
  [id,'alice',JSON.stringify(save)]);
 const store=createRecoveredPrologueStore({pool,afterlifeWorld:world,authorizeRun:async()=>true});
 const submissions=await Promise.allSettled([
  store.commitEarthDeath({subject:'alice'},id,0),
  store.commitEarthDeath({subject:'alice'},id,0)
 ]);
 assert.equal(submissions.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(submissions.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
 let current=submissions.find(x=>x.status==='fulfilled').value;
 assert.equal(current.revision,1);
 assert.equal(current.state.currentWorld,'AFTERLIFE');
 assert.deepEqual(current.state.pendingCutsceneQueue,['deathWake','officeIntake','floorTutorial']);
 await assert.rejects(store.claimCutscene({subject:'bob'},id,1),e=>e.status===404);
 let priorDraws=current.state.rngDraws;
 for(const key of ['deathWake','officeIntake','floorTutorial']){
  current=await store.claimCutscene({subject:'alice'},id,current.revision);
  assert.equal(current.state.activeCutsceneKey,key);
  assert.equal(current.state.flags.cutscenes[key],true);
  assert.equal(current.state.rngDraws,priorDraws);
  const replay=await store.claimCutscene({subject:'alice'},id,current.revision);
  assert.equal(replay.state.activeCutsceneKey,key);
  current=await store.acknowledgeCutscene({subject:'alice'},id,replay.revision,key);
  assert.equal(current.state.activeCutsceneKey,null);
 }
 const persisted=await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',[id]);
 assert.deepEqual(persisted.rows[0].state,current.state);
 assert.equal(persisted.rows[0].state.storyMemory.npcMemory.caseworkerSuspicion,2);
 assert.equal(persisted.rows[0].state.pendingCutsceneQueue.length,0);
 assert.equal(current.revision,10); // 1 transition + 3*(claim + replay + acknowledge)
 console.log(JSON.stringify({result:'PASS',ownerIsolation:true,conflict409:true,
   exactReload:true,orderedCutscenes:3,revision:current.revision,rngDraws:current.state.rngDraws}));
}finally{await pool.end()}
