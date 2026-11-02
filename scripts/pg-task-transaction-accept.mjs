// Disposable PostgreSQL acceptance for bounded task completion. No production access.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createOwnerTaskCompletionTransaction} from '../gateway/owner-task-completion-transaction.mjs';
import {resolveRecoveredTaskCompletionContext} from '../gateway/recovered-task-completion-context.mjs';
import {syncRecoveredTaskMarkers} from '../gateway/recovered-task-marker-sync.mjs';
import {rewardRecoveredOpeningProgress} from '../gateway/recovered-opening-progress-reward.mjs';
const req=createRequire(import.meta.url);
const {Pool}=req(process.env.PG_MODULE_PATH);
const pool=new Pool({host:'127.0.0.1',port:Number(process.env.TEST_PG_PORT),user:'postgres',password:'disposable-only',database:'ascension_accept',max:4});
const runId='m18-accept';
const initial={seedString:'pg-accept',rngDraws:17,turn:2,currentWorld:'AFTERLIFE',pos:{x:0,y:0},flags:{officeOnboardComplete:false},actionPoints:2,maxActionPoints:4,storyMemory:{worldTaskBoard:{AFTERLIFE:{tasks:[{id:'desk',x:0,y:0,order:0,planned:true,required:true,completed:false}]}}},worldMap:{width:1,height:1,tiles:[{spawns:[]}]}};
const library=[{id:'desk',label:'Intake',tags:['onboarding']}];
const context=s=>resolveRecoveredTaskCompletionContext(s,{library,currentCellKey:()=> 'AFTERLIFE:0:0',syncTaskMarkers:s=>syncRecoveredTaskMarkers(s,{resolveStorylet:id=>library.find(x=>x.id===id),characterForStorylet:()=>({characterKey:'caseworker'}),getPrerequisiteDeskTarget:()=>({x:0,y:0})}),rewardOpeningProgress:(s,label)=>rewardRecoveredOpeningProgress(s,label,{logEvent:()=>{},noteTurn:()=>{}})});
const store=createOwnerTaskCompletionTransaction({pool,authorizeChapter:async()=>true,resolveCanonicalTaskContext:context});
const action={storyletId:'desk',expectedRevision:0};
try{
 await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES($1,$2,0,$3::jsonb)',[runId,'alice',JSON.stringify(initial)]);
 const failures=await Promise.allSettled([store.completeTask({subject:'alice'},runId,action),store.completeTask({subject:'alice'},runId,action)]);
 assert.equal(failures.filter(x=>x.status==='fulfilled').length,1,'exactly one concurrent CAS write succeeds');
 assert.equal(failures.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1,'second concurrent write gets stale revision');
 const current=(await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',[runId])).rows[0];
 assert.equal(Number(current.revision),1);assert.equal(current.state.rngDraws,17);assert.equal(current.state.actionPoints,3);
 assert.equal(current.state.storyMemory.worldTaskBoard.AFTERLIFE.tasks[0].completed,true);
 assert.equal(current.state.worldMap.taskMarkers[0].completed,true);
 const persisted=structuredClone(current.state);
 await assert.rejects(store.completeTask({subject:'bob'},runId,{...action,expectedRevision:1}),e=>e.status===404);
 await assert.rejects(store.completeTask({subject:'alice'},runId,{...action,expectedRevision:1}),e=>e.status===422||e.status===409);
 const read=(await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',[runId])).rows[0];
 assert.equal(Number(read.revision),1);assert.deepEqual(read.state,persisted);
 console.log('PASS actual JS gateway + disposable PG: concurrent CAS, owner isolation, rollback, saved JSON, marker/AP/RNG');
 console.log('LIMIT full opening parity, process restart and AVCC browser not yet tested');
}finally{await pool.end()}
