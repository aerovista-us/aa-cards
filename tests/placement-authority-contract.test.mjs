import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfficeRun,applyWorldAction,restoreOfficeRun} from '../gateway/world-interaction-engine.mjs';
import {walkState} from './support/office-journey.mjs';

// Guard the current authored scope only. Earned/banked spin economy remains AA #47.
const act=(state,command)=>applyWorldAction(state,command).state;
function assessed(seed){
 let s=createOfficeRun({ownerId:'fixture-player',runId:'fixture-run',seedString:seed});
 s=act(s,{type:'inspect',target:'notice'});
 s=walkState(s,'records');s=act(s,{type:'take',target:'records'});
 s=walkState(s,'caseworker');s=act(s,{type:'talk',target:'caseworker',topic:'introduction'});
 s=walkState(s,'stat');
 const before=s.rng.rngDraws;
 s=act(s,{type:'use',target:'stat'});
 assert.equal(s.rng.rngDraws,before+1);
 return s;
}
test('Stat Generator draws a trait but never grants placement or changes its destination',()=>{
 let s=assessed('authority-seed');
 assert.ok(s.stat.assessment);
 assert.equal(s.placement,null);
 assert.equal(s.placementAuthorized,false);
 assert.throws(()=>act(s,{type:'choose',target:'rolodex',choice:'memory'}));
 s=walkState(s,'caseworker');s=act(s,{type:'talk',target:'caseworker',topic:'placement'});
 assert.equal(s.placementAuthorized,true);
 assert.equal(s.placement,null);
 s=walkState(s,'rolodex');
 s=act(s,{type:'choose',target:'rolodex',choice:'present'});
 assert.equal(s.placement,'present');
 assert.equal(s.rng.rngDraws,1);
 assert.equal(restoreOfficeRun(JSON.stringify(s),{ownerId:'fixture-player'}).placement,'present');
});
test('current one-assessment rule rejects rerolls and preserves RNG and placement',()=>{
 let s=assessed('anti-reroll');
 const before=structuredClone(s);
 assert.throws(()=>act(s,{type:'use',target:'stat'}),/assessment_already_recorded/);
 assert.deepEqual(s,before);
 s=walkState(s,'caseworker');s=act(s,{type:'talk',target:'caseworker',topic:'placement'});
 s=walkState(s,'rolodex');s=act(s,{type:'choose',target:'rolodex',choice:'memory'});
 const picked=structuredClone(s);
 assert.throws(()=>act(s,{type:'choose',target:'rolodex',choice:'present'}),/placement_already_recorded/);
 assert.deepEqual(s,picked);
});
