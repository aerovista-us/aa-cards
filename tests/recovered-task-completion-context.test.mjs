import test from 'node:test';import assert from 'node:assert/strict';
import {resolveRecoveredTaskCompletionContext as resolve} from '../gateway/recovered-task-completion-context.mjs';
import {completeRecoveredCellTask} from '../gateway/recovered-cell-task-complete.mjs';
const state=()=>({turn:2,currentWorld:'AFTERLIFE',pos:{x:2,y:3},flags:{},storyMemory:{worldTaskBoard:{AFTERLIFE:{tasks:[{id:'first',x:2,y:3,order:0,planned:true,required:true,completed:false},{id:'second',x:2,y:3,order:1,planned:true,required:true,completed:false}]}}}});
const opts={library:[{id:'first',label:'First'},{id:'second',label:'Second'}],syncTaskMarkers:s=>{s.synced=true},rewardOpeningProgress:(s)=>{s.rewarded=true},currentCellKey:()=> 'afterlife:2,3'};
test('context offers first planned desk, blocks later prerequisite, then advances',()=>{const s=state();let x=resolve(s,opts);assert.deepEqual(x.lock.offeredIds,['first']);assert.deepEqual(x.lock.requiredIds,['first']);completeRecoveredCellTask({...x,storyletId:'first'});assert.equal(s.storyMemory.worldTaskBoard.AFTERLIFE.tasks[0].completed,true);x=resolve(s,opts);assert.deepEqual(x.lock.offeredIds,['second']);});
test('missing canonical reward handler is rejected',()=>{const x={...opts};delete x.rewardOpeningProgress;assert.throws(()=>resolve(state(),x),/Canonical marker/);});
