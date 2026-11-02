import test from 'node:test';import assert from 'node:assert/strict';
import {recoveredCellRequirementStatus as status,canLeaveRecoveredCell as canLeave} from '../gateway/recovered-cell-requirements.mjs';
test('required task prevents movement with canonical labels',()=>{
 const lock={requiredIds:['A','B'],completedIds:['A']};
 const r=canLeave(lock,[{id:'A',label:'Intake'},{id:'B',label:'Witness Desk'}]);
 assert.equal(r.allowed,false);assert.deepEqual(r.status.pendingIds,['B']);assert.deepEqual(r.status.pendingLabels,['Witness Desk']);
});
test('completed requirements permit departure',()=>assert.equal(canLeave({requiredIds:['A'],completedIds:['A']}).allowed,true));
test('missing picks use ID fallback',()=>assert.deepEqual(status({requiredIds:['X'],completedIds:[]}).pendingLabels,['X']));
test('missing reconciled lock fails closed',()=>assert.throws(()=>canLeave({}),/Authoritative reconciled/));
