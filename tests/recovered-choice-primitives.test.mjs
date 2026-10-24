import test from 'node:test';
import assert from 'node:assert/strict';
import {outcomeWeight,rollRecoveredOutcome,grantRecoveredXp,spendRecoveredAp,createRecoveredChoicePrimitives} from '../gateway/recovered-choice-primitives.mjs';
test('weighted canonical outcome uses persisted RNG cursor and can resume',()=>{
 const state={seedString:'Billy',rngDraws:0,flags:{},storyMemory:{introQuestComplete:false}};
 const storylet={id:'earth.construction.clock_in',tags:['main']};
 const choice={outcomes:[{weight:2,effects:{'heat':'+1'},resultText:'A'},{weight:1,effects:{'heat':'-1'},resultText:'B'}]};
 const original=createRecoveredChoicePrimitives(state);
 const first=original.roll(choice,storylet);
 assert.equal(original.checkpoint().rngDraws,1);
 const resumed=createRecoveredChoicePrimitives({...state,...original.checkpoint()});
 const second=resumed.roll(choice,storylet);
 const continuous=original.roll(choice,storylet);
 assert.deepEqual(second,continuous);
 assert.ok(['A','B'].includes(first.resultText));
});
test('story memory influences weighted outcomes as original rules specify',()=>{
 const state={flags:{mainIntroQuestComplete:true},storyletCounts:{s:2},consequences:{council:3,exiles:0},heat:0};
 const w=outcomeWeight({weight:1,effects:{'consequences.council':'+1'}},{effects:{}},{id:'s',tags:[]},state);
 assert.ok(Math.abs(w-0.84)<1e-10); // recovered effectDelta reads nested paths; a dotted effect key does not bias weights
});
test('recovered XP awards shard and AP increase on level up',()=>{
 const state={xp:3,level:1,maxActionPoints:3,inventory:{}};
 grantRecoveredXp(state,2);
 assert.equal(state.level,2);assert.equal(state.xp,1);assert.equal(state.maxActionPoints,4);assert.equal(state.inventory['Ascension Shard'],1);
});
test('action points reject overspending, and signal turn transition',()=>{
 const state={actionPoints:1};
 assert.deepEqual(spendRecoveredAp(state,{actionCost:1}),{cost:1,turnRequired:true});
 assert.equal(state.actionPoints,0);
 assert.throws(()=>spendRecoveredAp(state,{}),{status:422});
});
