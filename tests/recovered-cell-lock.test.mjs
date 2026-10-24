import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRecoveredCellLock,completeRecoveredCellRequirement} from '../gateway/recovered-cell-lock.mjs';
const state=()=>({storyMemory:{cellActionLock:{key:'AFTERLIFE:2,3:0',offeredIds:['desk','form'],requiredIds:['desk','form'],completedIds:[],lastUpdatedTurn:0}}});
test('fail closed without authoritative current-cell lock',()=>{
 assert.equal(inspectRecoveredCellLock({},{expectedKey:'AFTERLIFE:2,3:0'}).allowed,false);
 assert.equal(inspectRecoveredCellLock(state(),{expectedKey:'AFTERLIFE:1,2:0'}).reason,'unverified_cell_lock');
});
test('required interactions survive resume and cannot be bypassed by one completion',()=>{
 const first=completeRecoveredCellRequirement(state(),{expectedKey:'AFTERLIFE:2,3:0',storyletId:'desk'});
 assert.deepEqual(first.lock.pendingIds,['form']);
 const reloaded=JSON.parse(JSON.stringify(first.state));
 const second=completeRecoveredCellRequirement(reloaded,{expectedKey:'AFTERLIFE:2,3:0',storyletId:'form'});
 assert.equal(second.lock.allowed,true);
 assert.deepEqual(state().storyMemory.cellActionLock.completedIds,[]);
});
test('unexpected completions and inconsistent locks reject',()=>{
 assert.throws(()=>completeRecoveredCellRequirement(state(),{expectedKey:'AFTERLIFE:2,3:0',storyletId:'evil'}));
 const bad=state();bad.storyMemory.cellActionLock.requiredIds=['hidden'];
 assert.equal(inspectRecoveredCellLock(bad,{expectedKey:'AFTERLIFE:2,3:0'}).reason,'inconsistent_cell_lock');
});
