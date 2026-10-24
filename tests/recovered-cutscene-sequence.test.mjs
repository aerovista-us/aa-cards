import test from 'node:test';import assert from 'node:assert/strict';
import {queueRecoveredOpeningCutscenes,drainRecoveredCutsceneQueue,continueRecoveredCutscene} from '../gateway/recovered-cutscene-sequence.mjs';
test('recovered prologue queues one visible scene at a time, flags on display',()=>{
 const s={flags:{},pendingCutsceneQueue:[]};
 assert.equal(queueRecoveredOpeningCutscenes(s,['deathWake','officeIntake','floorTutorial']),'deathWake');
 assert.equal(s.flags.cutscenes.deathWake,true);assert.equal(s.flags.cutscenes.officeIntake,undefined);
 assert.deepEqual(s.pendingCutsceneQueue,['officeIntake','floorTutorial']);
 const saved=JSON.parse(JSON.stringify(s));
 assert.equal(continueRecoveredCutscene(saved,'deathWake'),'officeIntake');
 assert.equal(continueRecoveredCutscene(saved,'officeIntake'),'floorTutorial');
 assert.equal(continueRecoveredCutscene(saved,'floorTutorial'),null);
 assert.deepEqual(saved.pendingCutsceneQueue,[]);
});
test('wrong continuation denied and queue remains unchanged',()=>{
 const s={flags:{},pendingCutsceneQueue:[]};queueRecoveredOpeningCutscenes(s,['deathWake','officeIntake']);
 assert.throws(()=>continueRecoveredCutscene(s,'officeIntake'),e=>e.status===409);
 assert.equal(s.activeCutsceneKey,'deathWake');assert.deepEqual(s.pendingCutsceneQueue,['officeIntake']);
});
test('already displayed scene is skipped, consistent with recovered flags',()=>{
 const s={flags:{cutscenes:{deathWake:true}}};
 assert.equal(queueRecoveredOpeningCutscenes(s,['deathWake','officeIntake']),'officeIntake');
 assert.equal(drainRecoveredCutsceneQueue(s),'officeIntake');
});
