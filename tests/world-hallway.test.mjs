import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfficeRun,applyWorldAction,restoreOfficeRun,serializeOfficeRun} from '../gateway/world-interaction-engine.mjs';
import {normalizeWorldCommand,normalizeWorldView} from '../game/world-contract.mjs';
import {walkState,completeState,stateView,enterHallwayState,completeHallwayState} from './support/office-journey.mjs';
const run=()=>createOfficeRun({ownerId:'hallway-player',runId:'hallway-run',seedString:'fixed-hallway-seed'});
const act=(s,command)=>applyWorldAction(s,command).state;
const talk=s=>act(walkState(s,'attendant'),{type:'talk',target:'attendant',topic:'introduction'});
test('Hallway entry requires completed intake and proximity; clients cannot inject a consequence',()=>{
 let s=walkState(run(),'exit');assert.throws(()=>act(s,{type:'travel',target:'exit'}),/intake_incomplete/);
 assert.equal(stateView(s).actions.some(a=>a.id==='enter-hallway'),false);
 s=completeState(run());assert.throws(()=>act(s,{type:'travel',target:'exit'}),/target_not_in_reach/);
 assert.throws(()=>normalizeWorldCommand({type:'travel',target:'exit',mode:'assistance'}),/invalid_command/);
 assert.throws(()=>normalizeWorldCommand({type:'travel',target:'archive'}),/invalid_command/);
 const h=enterHallwayState(s);assert.equal(h.location,'afterlife-hallway');assert.deepEqual(h.player,{x:4,y:5,name:'Billy'});
 assert.equal(stateView(h).mission.complete,false);assert.equal(stateView(h).caseFile.departureReady,true);
 assert.throws(()=>act(h,{type:'use',target:'stat'}),/unsupported_action/);
});
test('reported Glitch earns assistance without inspection, reward duplication or another RNG draw',()=>{
 const office=completeState(run()),h=enterHallwayState(office),met=talk(h);
 assert.equal(met.hallway.mode,'assistance');assert.equal(met.hallway.routeRevealed,true);assert.equal(met.hallway.inspectionComplete,false);
 assert.throws(()=>act(walkState(met,'inspection'),{type:'use',target:'inspection'}),/inspection_not_required/);
 const done=completeHallwayState(h);assert.equal(stateView(done).mission.complete,true);
 assert.match(stateView(done).journal.at(-1).text,/Archive of Echoes/);
 assert.deepEqual(done.inventory,office.inventory);assert.deepEqual(done.rng,office.rng);assert.equal(done.heat,0);
});
test('concealed Glitch requires inspection and a second attendant visit; the watch note and heat persist',()=>{
 const office=completeState(run(),{resolution:'conceal',placement:'present'});let h=enterHallwayState(office);
 const premature=act(walkState(h,'destination'),{type:'inspect',target:'destination'});assert.equal(premature.hallway.destinationRead,false);
 assert.throws(()=>act(walkState(h,'inspection'),{type:'use',target:'inspection'}),/inspection_not_required/);
 h=talk(h);assert.equal(h.hallway.routeRevealed,false);
 h=act(walkState(h,'inspection'),{type:'use',target:'inspection'});assert.equal(h.hallway.inspectionComplete,true);assert.equal(h.hallway.routeRevealed,false);
 assert.throws(()=>act(h,{type:'use',target:'inspection'}),/inspection_already_recorded/);
 h=talk(h);assert.equal(h.hallway.routeRevealed,true);
 h=act(walkState(h,'destination'),{type:'inspect',target:'destination'});assert.match(stateView(h).journal.at(-1).text,/Veilway/);
 assert.equal(h.heat,office.heat);assert.equal(h.npcMemory.caseworker.suspicion,1);assert.deepEqual(h.rng,office.rng);
});
test('return and re-entry preserve encounter, owner, assessment, inventory and route across reload',()=>{
 for(const resolution of ['report','conceal']){
  const h=completeHallwayState(enterHallwayState(completeState(run(),{resolution})));
  const restored=restoreOfficeRun(serializeOfficeRun(h),{ownerId:h.ownerId});assert.deepEqual(restored,h);
  const back=act(walkState(restored,'return'),{type:'travel',target:'return'});assert.equal(back.location,'afterlife-placement-office');
  assert.equal(stateView(back).mission.complete,true);
  const again=enterHallwayState(back);assert.deepEqual(again.hallway,h.hallway);assert.deepEqual(again.inventory,h.inventory);assert.deepEqual(again.stat,h.stat);
  const view=stateView(again);assert.deepEqual(normalizeWorldView({...view,secret:'private'}),view);
  assert.equal(JSON.stringify(view).includes(h.ownerId),false);assert.equal(JSON.stringify(view).includes('fixed-hallway-seed'),false);
  assert.throws(()=>restoreOfficeRun(serializeOfficeRun(h),{ownerId:'other-player'}),/owner_mismatch/);
 }
});
test('schema-2 Office upgrade is additive and preserves completed intake without a new run or RNG draw',()=>{
 const original=completeState(run(),{resolution:'conceal'}),legacy=structuredClone(original);legacy.schemaVersion=2;delete legacy.hallway;
 const upgraded=restoreOfficeRun(JSON.stringify(legacy),{ownerId:legacy.ownerId});assert.deepEqual(upgraded,original);
 const oldInitial=run();oldInitial.schemaVersion=2;delete oldInitial.hallway;
 const initial=restoreOfficeRun(JSON.stringify(oldInitial),{ownerId:oldInitial.ownerId});assert.equal(initial.revision,0);assert.equal(initial.rng.rngDraws,0);
 assert.throws(()=>restoreOfficeRun(JSON.stringify({...legacy,schemaVersion:1}),{ownerId:legacy.ownerId}),/unsupported_save_version/);
 assert.throws(()=>restoreOfficeRun(JSON.stringify({...legacy,inventory:{}}),{ownerId:legacy.ownerId}),/invalid_save/);
});
test('malformed or forged Hallway checkpoints fail restoration and walls stay authoritative',()=>{
 const h=enterHallwayState(completeState(run(),{resolution:'conceal'}));
 for(const fields of [{hallway:null},{hallway:{...h.hallway,mode:'assistance'}},{hallway:{...h.hallway,routeRevealed:true}},
  {hallway:{...h.hallway,destinationRead:true}},{player:{...h.player,x:0,y:0}}])
  assert.throws(()=>restoreOfficeRun(JSON.stringify({...h,...fields}),{ownerId:h.ownerId}),/invalid_save/);
 assert.throws(()=>act(h,{type:'move',dx:1,dy:0}),/blocked/);
 assert.throws(()=>act(walkState(h,'destination'),{type:'travel',target:'return'}),/target_not_in_reach/);
});
