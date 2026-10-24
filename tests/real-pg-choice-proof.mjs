// Explicit opt-in isolated PostgreSQL integration; never uses production.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {State} from '../gateway/recovered-v4/state.js';
import {createBoundedRecoveredChoiceExecutor} from '../gateway/recovered-choice-transaction.mjs';
import library from '../gateway/recovered-v4/library.json' with {type:'json'};
const require=createRequire(process.env.PG_REQUIRE_FROM || '/srv/ACOS/AeroVistaCore/core-registry/api/package.json');const {Pool}=require('pg');
if(!process.env.ISOLATED_PG_URL)throw new Error('ISOLATED_PG_URL required: disposable DB only');
const pool=new Pool({connectionString:process.env.ISOLATED_PG_URL});
const runId='proof-'+process.pid;
try {
 const base=new State();base.reset('NEW');const s=base.snapshot();s.seedString='test-ascension';s.rngDraws=0;s.currentWorld='AFTERLIFE';s.actionPoints=4;s.pos={x:0,y:0};s.flags={...s.flags,officeOnboardComplete:true,mainIntroQuestComplete:true,mainAwakeningBriefed:true,soulResonanceSolved:true,lifeRecognitionSolved:true};s.worldMap={width:1,height:1,tiles:[{tags:['rest','office','clerks','veil','hazard','archive'],spawns:[]}]};
 await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES ($1,$2,0,$3::jsonb)',[runId,'alice',JSON.stringify(s)]);
 const store=createBoundedRecoveredChoiceExecutor({pool,library,authorizeChapter:async()=>true});
 const input={storyletId:'observe.afterlife.overhead_announcements',choiceId:'play_along',expectedRevision:0};
 const attempts=await Promise.allSettled([store.commitChoice({subject:'alice'},runId,input),store.commitChoice({subject:'alice'},runId,input)]);
 const ok=attempts.filter(x=>x.status==='fulfilled');const denied=attempts.filter(x=>x.status==='rejected');
 console.log('RESULTS',attempts.map(x=>x.status==='fulfilled'?'ok':{status:x.reason?.status,message:x.reason?.message}));
 assert.equal(ok.length,1);assert.equal(denied.length,1);assert.equal(denied[0].reason.status,409);
 const reloaded=await store.loadOwnedRun({subject:'alice'},runId);
 assert.equal(reloaded.revision,1);assert.deepEqual(reloaded.state,ok[0].value.state);assert.equal(reloaded.state.storyMemory.decisionHistory.at(-1).choiceId,input.choiceId);
 assert.equal(await store.loadOwnedRun({subject:'bob'},'run-1'),null);
 console.log(JSON.stringify({result:'PASS',limitedPath:true,revision:reloaded.revision,exactReload:true,ownerIsolation:true,echoes:reloaded.state.storyMemory.pendingEchoes.length,rngDraws:reloaded.state.rngDraws}));
}finally{await pool.end()}
