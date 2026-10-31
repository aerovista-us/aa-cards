// Bounded Earth->Afterlife cutscene persistence with a real disposable PostgreSQL transaction.
// Deliberately NOT a full playable journey or recovered-browser differential.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {transitionRecoveredEarthToAfterlife} from '../gateway/recovered-earth-afterlife.mjs';
import {drainRecoveredCutsceneQueue} from '../gateway/recovered-cutscene-sequence.mjs';
import {createOwnerCutsceneTransaction} from '../gateway/owner-cutscene-transaction.mjs';
const {Pool}=createRequire(import.meta.url)(process.env.PG_MODULE_PATH);
const pool=new Pool({host:'127.0.0.1',port:Number(process.env.TEST_PG_PORT),user:'postgres',password:'disposable-only',database:'ascension_accept',max:4});
const id='m18-cutscenes';
try{
 const initial={seedString:'billy-death',rngDraws:8,currentWorld:'EARTH_PROLOGUE',turn:2,pos:{x:3,y:2},maxActionPoints:3,actionPoints:0,heat:0,flags:{earthPrologueDead:true},unlockedWorlds:['EARTH_PROLOGUE'],storyMemory:{worldTaskBoard:{},pendingEchoes:[]}};
 const transitioned=transitionRecoveredEarthToAfterlife(initial).state;
 const rng=transitioned.rngDraws;
 assert.equal(drainRecoveredCutsceneQueue(transitioned),'deathWake');
 await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES($1,$2,0,$3::jsonb)',[id,'alice',JSON.stringify(transitioned)]);
 const runtime=createOwnerCutsceneTransaction({pool,authorizeChapter:async()=>true});
 let revision=0;
 for(const [scene,next] of [['deathWake','officeIntake'],['officeIntake','floorTutorial'],['floorTutorial',null]]){
  const before=(await pool.query('SELECT state FROM ascension_player_runs WHERE id=$1',[id])).rows[0].state;
  await assert.rejects(runtime.continueCutscene({subject:'bob'},id,{cutsceneKey:scene,expectedRevision:revision}),e=>e.status===404);
  await assert.rejects(runtime.continueCutscene({subject:'alice'},id,{cutsceneKey:'wrongScene',expectedRevision:revision}),e=>e.status===409);
  const check=(await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',[id])).rows[0];
  assert.equal(Number(check.revision),revision);assert.deepEqual(check.state,before);
  const output=await runtime.continueCutscene({subject:'alice'},id,{cutsceneKey:scene,expectedRevision:revision});
  revision++;
  assert.equal(output.revision,revision);assert.equal(output.nextCutscene,next);
  assert.equal(output.state.rngDraws,rng);
 }
 const finish=(await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',[id])).rows[0];
 assert.equal(Number(finish.revision),3);assert.equal(finish.state.currentWorld,'AFTERLIFE');
 assert.equal(finish.state.activeCutsceneKey,null);assert.deepEqual(finish.state.pendingCutsceneQueue,[]);
 assert.equal(finish.state.flags.earthPrologueComplete,true);assert.equal(finish.state.rngDraws,rng);
 console.log('PASS: bounded Earth-to-Afterlife cutscene queue persisted through 3 owner-scoped PostgreSQL transactions; stolen/wrong scenes rolled back, RNG unchanged');
 console.log('LIMIT: story task board, choices, end-turn, recovered-browser parity and AVCC remain unproven');
}finally{await pool.end()}
