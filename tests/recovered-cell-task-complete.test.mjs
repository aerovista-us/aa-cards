import test from 'node:test';import assert from 'node:assert/strict';
import {completeRecoveredCellTask as complete} from '../gateway/recovered-cell-task-complete.mjs';
import {canLeaveRecoveredCell} from '../gateway/recovered-cell-requirements.mjs';
const ctx=()=>{const effects=[];return {effects,board:{tasks:[{id:'desk',completed:false}]},lock:{offeredIds:['desk'],requiredIds:['desk'],completedIds:[]},picks:[{id:'desk',label:'Intake'}],storyletId:'desk',resolveStorylet:()=>({id:'desk',label:'Intake',progressor:true}),syncTaskMarkers:()=>effects.push('sync'),rewardOpeningProgress:x=>effects.push(x),currentWorld:'AFTERLIFE'};};
test('completing required desk updates board and unlocks cell',()=>{const c=ctx();assert.equal(canLeaveRecoveredCell(c.lock,c.picks).allowed,false);assert.deepEqual(complete(c),{completed:true,remaining:0,total:1});assert.equal(c.board.tasks[0].completed,true);assert.equal(canLeaveRecoveredCell(c.lock,c.picks).allowed,true);assert.deepEqual(c.effects,['sync','Intake']);});
test('duplicate completion rejects before additional effects',()=>{const c=ctx();complete(c);assert.throws(()=>complete(c),/inactive_or_completed_task/);assert.equal(c.effects.length,2);});
test('unoffered task rejects without board mutation',()=>{const c=ctx();c.lock.offeredIds=[];assert.throws(()=>complete(c),/task_not_offered/);assert.equal(c.board.tasks[0].completed,false);});
test('missing authoritative markers reject before mutation',()=>{const c=ctx();delete c.syncTaskMarkers;assert.throws(()=>complete(c),/Canonical syncTaskMarkers/);});
