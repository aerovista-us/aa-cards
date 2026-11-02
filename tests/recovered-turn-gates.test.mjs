import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveredEndTurnGate,recoveredActionGate} from '../gateway/recovered-turn-gates.mjs';
test('end-turn blocks each original presentation state',()=>{
 for(const key of ['mainMenuOpen','endingKey','cutsceneOpen','resultOverlayOpen','turnRecapOverlayOpen'])
  assert.deepEqual(recoveredEndTurnGate({[key]:true}),{allowed:false,reason:'presentation_gate'});
});
test('active storylet blocks end-turn',()=>assert.equal(recoveredEndTurnGate({activeStorylet:{id:'x'}}).reason,'unresolved_decision'));
test('end-turn accepts clear presentation state',()=>assert.deepEqual(recoveredEndTurnGate({}),{allowed:true,reason:null}));
test('action gate also blocks pending continuation',()=>assert.equal(recoveredActionGate({pendingTurnContinuation:true},4,1).allowed,false));
test('action gate permits resolving current decision, rejects other action',()=>{
 assert.equal(recoveredActionGate({activeStorylet:{}},2,1,'Decision').allowed,true);
 assert.equal(recoveredActionGate({activeStorylet:{}},2,1,'Movement').allowed,false);
});
test('action gate enforces source AP threshold',()=>{
 assert.equal(recoveredActionGate({},0,1).reason,'insufficient_action_points');
 assert.equal(recoveredActionGate({},1,1).allowed,true);
});
