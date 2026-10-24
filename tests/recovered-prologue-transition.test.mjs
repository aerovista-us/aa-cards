import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRecoveredPrologueTransition,claimNextRecoveredCutscene,acknowledgeRecoveredCutscene} from '../gateway/recovered-prologue-transition.mjs';
import {buildRecoveredWorldMap} from '../gateway/recovered-map-builder.mjs';
const world={id:'AFTERLIFE',map:{shape:'office',w:12,h:10},tags:['clerks','rest','archive']};
const original=()=>({seedString:'Billy-death-replay',rngDraws:12,currentWorld:'EARTH_PROLOGUE',flags:{earthPrologueDead:true},unlockedWorlds:['EARTH_PROLOGUE'],pos:{x:1,y:1},maxActionPoints:3,actionPoints:0,heat:0.2,storyMemory:{pendingEchoes:[],npcMemory:{caseworkerSuspicion:2}}});
test('atomic Earth transition builds real recovered map with exact deterministic RNG cursor',()=>{
 const before=original(),result=buildRecoveredPrologueTransition(before,world);
 assert.equal(before.flags.earthPrologueComplete,undefined);
 assert.equal(result.currentWorld,'AFTERLIFE');
 assert.equal(result.rngDraws,buildRecoveredWorldMap({...before,flags:{...before.flags,earthPrologueComplete:true},unlockedWorlds:['EARTH_PROLOGUE','AFTERLIFE'],maxActionPoints:4,actionPoints:4,heat:.6},world).rngDraws);
 assert.equal(result.worldMap.tiles.length,result.worldMap.width*result.worldMap.height);
 assert.equal(result.storyMemory.npcMemory.caseworkerSuspicion,2);
 assert.deepEqual(result.pendingCutsceneQueue,['deathWake','officeIntake','floorTutorial']);
 assert.deepEqual(buildRecoveredPrologueTransition(original(),world),result);
});
test('cutscene queue survives JSON restart and presents once in recovered order',()=>{
 let s=JSON.parse(JSON.stringify(buildRecoveredPrologueTransition(original(),world)));
 const seen=[];
 for(let i=0;i<3;i++){
   const current=claimNextRecoveredCutscene(s);
   seen.push(current.key);
   const repeat=claimNextRecoveredCutscene(current.state);
   assert.equal(repeat.key,current.key);assert.equal(repeat.replayed,true);
   s=JSON.parse(JSON.stringify(acknowledgeRecoveredCutscene(repeat.state,current.key)));
 }
 assert.deepEqual(seen,['deathWake','officeIntake','floorTutorial']);
 assert.equal(claimNextRecoveredCutscene(s).key,null);
 assert.equal(Object.keys(s.flags.cutscenes).length,3);
});
test('invalid transition does not mutate source, completed transitions cannot be replayed',()=>{
 const prior=original();prior.flags.earthPrologueDead=false;
 const snapshot=structuredClone(prior);
 assert.throws(()=>buildRecoveredPrologueTransition(prior,world),/not available/);
 assert.deepEqual(prior,snapshot);
 const done=buildRecoveredPrologueTransition(original(),world);
 assert.throws(()=>buildRecoveredPrologueTransition(done,world),/not available|already completed/);
 assert.throws(()=>acknowledgeRecoveredCutscene(done,'officeIntake'),/No matching/);
});
