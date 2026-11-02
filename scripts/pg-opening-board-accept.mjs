// Disposable PostgreSQL acceptance for the bounded owner-locked opening board.
// It uses fixture-provided board authorities, NOT an original-browser parity proof.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createOwnerOpeningBoardTransaction} from '../gateway/owner-opening-board-transaction.mjs';
const {Pool}=createRequire(import.meta.url)(process.env.PG_MODULE_PATH);
const pool=new Pool({host:'127.0.0.1',port:Number(process.env.TEST_PG_PORT),user:'postgres',password:'disposable-only',database:'ascension_accept',max:4});
const runId='m18-opening-board-accept';
const state={seedString:'board',rngDraws:6,currentWorld:'AFTERLIFE',turn:2,flags:{},storyMemory:{worldTaskBoard:{}},worldMap:{width:2,height:1,worldProfile:{shape:'office'},tiles:[{spawns:[]},{spawns:[]}]},pendingCanonicalTasks:['ensureWorldTaskBoard','syncTaskMarkers','drainCutsceneQueue']};
const options=()=>({candidates:[{id:'office.intake_briefing',planned:true,tags:['onboarding']}],cells:[{x:0,y:0},{x:1,y:0}],fixedStation:()=>null,characterForStorylet:()=>({characterKey:'caseworker'}),isOfficeIntakeWorld:true,fixtureForCell:()=>null,tileTagsAt:()=>[],inBounds:()=>true,blockedTasks:()=>[]});
const service=createOwnerOpeningBoardTransaction({pool,authorizeChapter:async()=>true,resolveCanonicalBoardContext:options});
const read=async()=>(await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',[runId])).rows[0];
try {
 await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES($1,$2,0,$3::jsonb)',[runId,'alice',JSON.stringify(state)]);
 const calls=await Promise.allSettled([service.initializeBoard({subject:'alice'},runId,{expectedRevision:0}),service.initializeBoard({subject:'alice'},runId,{expectedRevision:0})]);
 assert.equal(calls.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(calls.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
 const committed=calls.find(x=>x.status==='fulfilled').value;
 assert.equal(committed.revision,1);assert.equal(committed.taskCount,1);
 assert.equal(committed.state.rngDraws,7);
 assert.deepEqual(committed.state.pendingCanonicalTasks,['drainCutsceneQueue']);
 assert.equal(committed.state.worldMap.taskMarkers.length,1);
 const snapshot=await read();assert.equal(Number(snapshot.revision),1);assert.deepEqual(snapshot.state,committed.state);
 await assert.rejects(service.initializeBoard({subject:'bob'},runId,{expectedRevision:1}),e=>e.status===404);
 await assert.rejects(service.initializeBoard({subject:'alice'},runId,{expectedRevision:1}),/opening_setup_not_pending/);
 const rejected=await read();assert.deepEqual(rejected,snapshot);
 console.log('PASS disposable PG opening board: concurrency, owner isolation, replay rejection, full committed JSON, RNG checkpoint');
} finally { await pool.end(); }
