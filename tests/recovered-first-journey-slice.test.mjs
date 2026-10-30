import test from 'node:test';import assert from 'node:assert/strict';
import {transitionRecoveredEarthToAfterlife} from '../gateway/recovered-earth-afterlife.mjs';
import {drainRecoveredCutsceneQueue,continueRecoveredCutscene} from '../gateway/recovered-cutscene-sequence.mjs';
import {diffRecoveredGameState} from '../gateway/recovered-full-state-diff.mjs';
// A bounded integration fixture, not a recovered-browser differential.
// Proves that serialized state can resume the transition/cutscene gate without
// consuming additional RNG draws; full action/board/end-turn acceptance remains open.
test('Earth death -> Afterlife -> three acknowledged scenes survives serialized reload at each step',()=>{
 const earth={seedString:'billy-death',rngDraws:8,currentWorld:'EARTH_PROLOGUE',turn:2,
 pos:{x:3,y:2},maxActionPoints:3,actionPoints:0,heat:0,
 flags:{earthPrologueDead:true},unlockedWorlds:['EARTH_PROLOGUE'],storyMemory:{worldTaskBoard:{},pendingEchoes:[]}};
 const result=transitionRecoveredEarthToAfterlife(earth);
 assert.equal(result.changed,true);
 let persisted=JSON.parse(JSON.stringify(result.state));
 const rngAtTransition=persisted.rngDraws;
 const queue=['deathWake','officeIntake','floorTutorial'];
 assert.deepEqual(persisted.pendingCutsceneQueue,queue);
 for(const scene of queue){
  assert.equal(drainRecoveredCutsceneQueue(persisted),scene);
  persisted=JSON.parse(JSON.stringify(persisted));
  assert.equal(persisted.activeCutsceneKey,scene);
  assert.equal(persisted.rngDraws,rngAtTransition);
  assert.equal(diffRecoveredGameState(persisted,JSON.parse(JSON.stringify(persisted))).equal,true);
  assert.throws(()=>continueRecoveredCutscene(persisted,'incorrect-scene'),/invalid_cutscene_continuation/);
  const next=continueRecoveredCutscene(persisted,scene);
  persisted=JSON.parse(JSON.stringify(persisted));
  assert.equal(next,queue[queue.indexOf(scene)+1]||null);
 }
 assert.equal(persisted.activeCutsceneKey,null);
 assert.deepEqual(persisted.pendingCutsceneQueue,[]);
 assert.equal(persisted.rngDraws,rngAtTransition);
 assert.equal(persisted.flags.earthPrologueComplete,true);
 assert.equal(earth.currentWorld,'EARTH_PROLOGUE');
});
