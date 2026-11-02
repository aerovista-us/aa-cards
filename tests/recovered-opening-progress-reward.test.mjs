import test from 'node:test';import assert from 'node:assert/strict';
import {rewardRecoveredOpeningProgress as reward} from '../gateway/recovered-opening-progress-reward.mjs';
const opts={logEvent:(s,x)=>s.events.push(x),noteTurn:(s,...x)=>s.notes.push(x)};
const s=()=>({turn:2,currentWorld:'AFTERLIFE',flags:{officeOnboardComplete:false},maxActionPoints:4,actionPoints:2,events:[],notes:[]});
test('recovered opening progress adds one AP and records canonical text',()=>{const x=s();assert.equal(reward(x,'Desk cleared',opts).awarded,1);assert.equal(x.actionPoints,3);assert.match(x.events[0],/Desk cleared earned \+1 AP/);assert.deepEqual(x.notes[0],['visible','Progress reward: +1 AP (3/4).']);});
test('never exceeds opening hour cap',()=>{const x=s();x.actionPoints=4;assert.equal(reward(x,'Desk',opts).awarded,0);assert.equal(x.events.length,0);});
test('non-opening gameplay receives no momentum',()=>{const x=s();x.turn=20;x.flags.mainIntroQuestComplete=true;x.flags.officeOnboardComplete=true;assert.equal(reward(x,'Desk',opts).awarded,0);});
test('event handler authority required',()=>assert.throws(()=>reward(s(),'Desk',{}),/Canonical event handlers/));
