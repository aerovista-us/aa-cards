import test from 'node:test';import assert from 'node:assert/strict';
import {transitionRecoveredEarthToAfterlife} from '../gateway/recovered-earth-afterlife.mjs';
import {buildRecoveredWorldMap} from '../gateway/recovered-map-builder.mjs';
import worlds from '../gateway/recovered-v4/worlds.json' with {type:'json'};
test('Earth death builds exact canonical Afterlife map and persists unopened cutscene queue',()=>{
 const original={seedString:'billy-death',rngDraws:8,currentWorld:'EARTH_PROLOGUE',turn:2,pos:{x:3,y:2},maxActionPoints:3,actionPoints:0,heat:0,flags:{earthPrologueDead:true},unlockedWorlds:['EARTH_PROLOGUE']};
 const out=transitionRecoveredEarthToAfterlife(original);assert.equal(out.changed,true);
 const next=out.state;assert.equal(next.currentWorld,'AFTERLIFE');assert.equal(next.maxActionPoints,4);
 assert.deepEqual(out.cutscenes,['deathWake','officeIntake','floorTutorial']);
 assert.equal(next.flags.earthPrologueComplete,true);assert.equal(original.flags.earthPrologueComplete,undefined);
 const expected=buildRecoveredWorldMap({...original,flags:{...original.flags,earthPrologueComplete:true},maxActionPoints:4,actionPoints:4,heat:.6,unlockedWorlds:['EARTH_PROLOGUE','AFTERLIFE']},worlds.worlds.find(w=>w.id==='AFTERLIFE'));
 assert.deepEqual(next.worldMap,expected.worldMap);assert.equal(next.rngDraws,expected.rngDraws);
 assert.equal(next.pendingCanonicalTasks.includes('ensureWorldTaskBoard'),true);
});
test('no Earth death means no world rebuild or extra RNG',()=>{
 const original={seedString:'billy',rngDraws:2,currentWorld:'EARTH_PROLOGUE',flags:{earthPrologueDead:false}};
 const out=transitionRecoveredEarthToAfterlife(original);assert.equal(out.changed,false);assert.deepEqual(out.state,original);
});
