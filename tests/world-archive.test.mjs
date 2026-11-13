import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHIVE_WORLD,createOfficeRun,applyWorldAction,restoreOfficeRun} from '../gateway/world-interaction-engine.mjs';
import {normalizeWorldCommand,normalizeWorldView} from '../game/world-contract.mjs';
import {walkState,completeState,enterHallwayState,completeHallwayState,stateView} from './support/office-journey.mjs';
const run=()=>createOfficeRun({ownerId:'archive-owner',runId:'archive-run',seedString:'archive-stable-seed'});
const act=(state,command)=>applyWorldAction(state,command).state;
const ready=(options={})=>completeHallwayState(enterHallwayState(completeState(run(),options)));
const enter=state=>act(walkState(state,'destination'),{type:'travel',target:'destination'});
function finish(state,choice){
 state=act(walkState(state,'archivist'),{type:'talk',target:'archivist',topic:'introduction'});
 state=act(walkState(state,'ledger'),{type:'inspect',target:'ledger'});
 state=act(walkState(state,'echo'),{type:'inspect',target:'echo'});
 state=act(state,{type:'choose',target:'echo',choice});
 return act(walkState(state,'seal'),{type:'use',target:'seal'});
}
test('Memory route opens a 7x7 Archive after Hallway checkpoint, without resetting existing facts',()=>{
 const hallway=ready(),at=walkState(hallway,'destination'),view=stateView(at);
 assert.equal(ARCHIVE_WORLD.width,7);assert.equal(ARCHIVE_WORLD.height,7);
 assert.ok(view.actions.some(a=>a.id==='enter-archive'));
 const entered=enter(hallway);
 assert.equal(entered.location,ARCHIVE_WORLD.id);assert.equal(entered.schemaVersion,4);
 assert.deepEqual(entered.player,{x:3,y:5,name:'Billy'});
 assert.deepEqual(entered.inventory,hallway.inventory);
 assert.deepEqual(entered.rng,hallway.rng);
 assert.deepEqual(entered.stat,hallway.stat);
 assert.equal(entered.archive.mode,'assistance');
 assert.equal(entered.archive.resolution,null);
 assert.equal(stateView(entered).world.id,ARCHIVE_WORLD.id);
 assert.deepEqual(restoreOfficeRun(JSON.stringify(entered),{ownerId:entered.ownerId}),entered);
 assert.equal(JSON.stringify(stateView(entered)).includes(entered.ownerId),false);
 assert.equal(JSON.stringify(stateView(entered)).includes(entered.rng.seedString),false);
});
test('unconfirmed Hallway and Veilway route refuse Archive entry, no placement mutation',()=>{
 const early=enterHallwayState(completeState(run()));
 assert.throws(()=>act(walkState(early,'destination'),{type:'travel',target:'destination'}),/route_not_confirmed/);
 assert.equal(stateView(early).actions.some(a=>a.id==='enter-archive'),false);
 const present=ready({placement:'present',resolution:'conceal'});
 assert.equal(stateView(walkState(present,'destination')).actions.some(a=>a.id==='enter-archive'),false);
 assert.throws(()=>enter(present),/unsupported_destination/);
 assert.throws(()=>normalizeWorldCommand({type:'travel',target:'destination',placement:'memory'}),/invalid_command/);
 assert.equal(normalizeWorldCommand({type:'travel',target:'destination'}).target,'destination');
});
test('Archive quest survives preservation or release, both report and conceal Glitch paths',()=>{
 for(const [resolution,choice]of [['report','preserve'],['conceal','release']]){
  const h=ready({placement:'memory',resolution});
  let s=enter(h);
  assert.equal(s.archive.mode,resolution==='report'?'assistance':'scrutiny');
  const premature=walkState(s,'echo');
  assert.throws(()=>act(premature,{type:'choose',target:'echo',choice}),/archive_prerequisites/);
  assert.equal(stateView(premature).actions.some(a=>a.id==='choose-'+choice),false);
  s=finish(s,choice);
  assert.equal(s.archive.resolution,choice);assert.equal(s.archive.sealIssued,true);
  assert.equal(stateView(s).mission.complete,true);
  assert.equal(s.consequences.hallway,h.consequences.hallway);
  assert.equal(s.heat,h.heat);
  assert.deepEqual(s.rng,h.rng);
  assert.deepEqual(s.inventory,h.inventory);
  assert.equal(s.placement,'memory');
  assert.equal(stateView(s).archive.resolution,choice);
  const saved=restoreOfficeRun(JSON.stringify(s),{ownerId:s.ownerId});
  assert.deepEqual(saved,s);
  assert.throws(()=>act(walkState(s,'echo'),{type:'choose',target:'echo',choice:choice==='preserve'?'release':'preserve'}),/archive_choice_already_recorded/);
  assert.throws(()=>act(walkState(s,'seal'),{type:'use',target:'seal'}),/archive_seal_already_recorded/);
 }
});
test('Archive return and re-entry preserve decisions, no duplicate assessment or rewards',()=>{
 const completed=finish(enter(ready()),'preserve');
 const hallway=act(walkState(completed,'return'),{type:'travel',target:'return'});
 assert.equal(hallway.location,'afterlife-hallway');
 assert.equal(hallway.schemaVersion,4);
 const back=stateView(hallway);
 assert.equal(back.world.id,'afterlife-hallway');
 assert.equal(Object.hasOwn(back,'archive'),false);
 const again=enter(hallway);
 assert.deepEqual(again.archive,completed.archive);
 assert.deepEqual(again.inventory,completed.inventory);
 assert.deepEqual(again.stat,completed.stat);
 assert.equal(again.rng.rngDraws,1);
 assert.equal(stateView(again).mission.complete,true);
});
test('invalid Archive save, forged choice, early seal and unsanctioned route fail closed',()=>{
 const s=enter(ready()),ownerId=s.ownerId;
 for(const fields of [
  {archive:null},{archive:{...s.archive,mode:'scrutiny'}},
  {archive:{...s.archive,resolution:'preserve'}},
  {archive:{...s.archive,sealIssued:true}},
  {archive:{...s.archive,unknown:'secret'}},
  {archive:{...s.archive,archivistMet:1}},
  {placement:'present'},
  {schemaVersion:3},
  {hallway:{...s.hallway,destinationRead:false}},
  {player:{...s.player,x:0,y:0}}
 ])assert.throws(()=>restoreOfficeRun(JSON.stringify({...s,...fields}),{ownerId}),/invalid_save/);
 const v=stateView(s);
 assert.throws(()=>normalizeWorldView({...v,archive:{...v.archive,sealIssued:true}}),/invalid_view/);
 assert.throws(()=>normalizeWorldView({...v,archive:{...v.archive,ownerId:'fake'}}),/invalid_view/);
 const noArchive=ready();
 assert.equal(noArchive.schemaVersion,3);
 assert.equal(restoreOfficeRun(JSON.stringify(noArchive),{ownerId:noArchive.ownerId}).schemaVersion,3);
});
