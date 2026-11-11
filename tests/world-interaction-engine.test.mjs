import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICE_WORLD,createOfficeRun,applyWorldAction,serializeOfficeRun,restoreOfficeRun} from '../gateway/world-interaction-engine.mjs';
import {createPersistentRng} from '../gateway/persistent-rng.mjs';
import {walkState,completeState,stateView} from './support/office-journey.mjs';
const run=seedString=>createOfficeRun({ownerId:'player-a',runId:'run-1',...(seedString?{seedString}:{})});
const act=(s,type,rest={})=>applyWorldAction(s,{type,...rest}).state;
test('main Office is 9×7 and Billy starts at the approved intake position',()=>{
 const s=run();assert.equal(s.schemaVersion,3);assert.equal(OFFICE_WORLD.width,9);assert.equal(OFFICE_WORLD.height,7);
 assert.deepEqual(s.player,{x:4,y:4,name:'Billy'});assert.equal(s.ownerId,'player-a');
 for(const id of ['records','stat','rolodex','exit'])assert.ok(OFFICE_WORLD.objects[id]);
});
test('movement is cardinal, immutable and bounded by the actual Office geometry',()=>{
 const s=run(),moved=act(s,'move',{dx:1,dy:0});assert.equal(moved.player.x,5);assert.equal(s.player.x,4);
 assert.throws(()=>act(s,'move',{dx:1,dy:1}),/invalid_move/);
 const atExit=walkState(s,'exit');assert.throws(()=>act(atExit,'move',{dx:0,dy:-1}),/blocked/);
});
test('Records Desk collection is in range, persistent and cannot duplicate items',()=>{
 const s=run(),taken=act(s,'take',{target:'records'});
 assert.deepEqual(taken.inventory,{'case-file':1,'queue-ticket':1});assert.equal(s.objectState.records.taken,false);
 assert.throws(()=>act(taken,'take',{target:'records'}),/already_taken/);
 const distant=walkState(s,'stat');assert.throws(()=>act(distant,'take',{target:'records'}),/target_not_in_reach/);
});
test('Stat Generator requires intake and records exactly one private RNG draw',()=>{
 let s=walkState(run('fixture-stat-seed'),'stat');assert.throws(()=>act(s,'use',{target:'stat'}),/intake_prerequisites/);
 s=act(walkState(s,'records'),'take',{target:'records'});
 s=act(walkState(s,'caseworker'),'talk',{target:'caseworker',topic:'introduction'});
 s=walkState(s,'stat');const before=serializeOfficeRun(s),assessed=act(s,'use',{target:'stat'});
 assert.equal(assessed.rng.rngDraws,1);assert.ok(assessed.stat.assessment.resonance>=1&&assessed.stat.assessment.resonance<=20);
 assert.equal(assessed.placement,null);assert.equal(assessed.placementAuthorized,false);
 const replay=act(restoreOfficeRun(before,{ownerId:'player-a'}),'use',{target:'stat'});
 assert.deepEqual(replay.stat,assessed.stat);
 assert.throws(()=>act(restoreOfficeRun(serializeOfficeRun(assessed),{ownerId:'player-a'}),'use',{target:'stat'}),/assessment_already_recorded/);
});
test('only Case Worker approval unlocks Rolodex choices; a score never selects a destination',()=>{
 let s=walkState(run(),'rolodex');assert.throws(()=>act(s,'choose',{target:'rolodex',choice:'memory'}),/placement_not_authorized/);
 s=act(walkState(s,'caseworker'),'talk',{target:'caseworker',topic:'placement'});assert.equal(s.placementAuthorized,false);
 const completed=completeState(run(),{placement:'present'});assert.equal(completed.placement,'present');
 assert.equal(completed.glitch.observed,true);assert.equal(completed.consequences.hallway,'assistance');
 assert.throws(()=>act(completed,'choose',{target:'rolodex',choice:'memory'}),/placement_already_recorded/);
});
test('report/conceal Glitch decisions persist distinct consequences and NPC reactions',()=>{
 const reported=completeState(run('shared-fixture-seed'),{resolution:'report'});
 const hidden=completeState(run('shared-fixture-seed'),{resolution:'conceal'});
 assert.equal(reported.heat,0);assert.equal(reported.npcMemory.caseworker.suspicion,0);
 assert.equal(hidden.heat,2-hidden.stat.assessment.glitchInsight);assert.equal(hidden.npcMemory.caseworker.suspicion,1);
 assert.equal(hidden.consequences.hallway,'scrutiny');assert.equal(hidden.inventory['placement-pass'],1);
 const talk=s=>applyWorldAction(walkState(s,'caseworker'),{type:'talk',target:'caseworker',topic:'glitch'}).event.text;
 assert.notEqual(talk(reported),talk(hidden));
 assert.throws(()=>act(hidden,'choose',{target:'glitch',choice:'report'}),/glitch_already_resolved/);
});
test('Echo Attuned assessment applies its concealment modifier, not a destination effect',()=>{
 let seed;
 for(let i=0;i<100;i++){const key='fixture-attuned-'+i;if(createPersistentRng({seedString:key,rngDraws:0}).next()>=.7){seed=key;break;}}
 assert.ok(seed);const s=completeState(run(seed),{placement:'memory',resolution:'conceal'});
 assert.equal(s.stat.assessment.trait,'Echo Attuned');assert.equal(s.heat,1);assert.equal(s.placement,'memory');
});
test('full intake and public case file survive save/reload; hidden state never projects',()=>{
 const s=completeState(run('private-fixture-seed'));
 const restored=restoreOfficeRun(serializeOfficeRun(s),{ownerId:'player-a'});assert.deepEqual(restored,s);
 const v=stateView(restored);assert.equal(v.mission.complete,true);assert.equal(v.caseFile.departureReady,true);
 const encoded=JSON.stringify(v);for(const value of ['private-fixture-seed','rngDraws','npcMemory','consequences','player-a'])assert.equal(encoded.includes(value),false);
 assert.throws(()=>restoreOfficeRun(serializeOfficeRun(s),{ownerId:'player-b'}),/owner_mismatch/);
 assert.throws(()=>restoreOfficeRun(JSON.stringify({...s,schemaVersion:1}),{ownerId:'player-a'}),/unsupported_save_version/);
});
test('bounded history preserves mission and one-time assessment facts',()=>{
 let s=completeState(run());s=walkState(s,{x:4,y:4});
 for(let i=0;i<160;i++)s=act(s,'move',{dx:i%2===0?1:-1,dy:0});
 const restored=restoreOfficeRun(serializeOfficeRun(s),{ownerId:'player-a'});
 assert.equal(restored.events.length,128);assert.equal(restored.rng.rngDraws,1);assert.equal(stateView(restored).mission.complete,true);
});

