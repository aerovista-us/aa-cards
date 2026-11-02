import test from 'node:test';import assert from 'node:assert/strict';
import {isRecoveredOpeningHour,startRecoveredTurn,completeRecoveredEarthPrologue} from '../gateway/recovered-opening-turn.mjs';
test('opening-hour predicate matches recovered time and world gates',()=>{
 const s={turn:12,currentWorld:'AFTERLIFE',flags:{officeOnboardComplete:false}};
 assert.equal(isRecoveredOpeningHour(s),true);s.turn=13;assert.equal(isRecoveredOpeningHour(s),false);
 s.turn=1;s.flags.mainIntroQuestComplete=true;assert.equal(isRecoveredOpeningHour(s),false);
});
test('start-turn restores four opening AP and marks completed intro memory',()=>{
 const s={turn:0,currentWorld:'AFTERLIFE',flags:{},maxActionPoints:3,actionPoints:0,storyMemory:{}};
 startRecoveredTurn(s);assert.equal(s.maxActionPoints,4);assert.equal(s.actionPoints,4);
 s.flags.mainIntroQuestComplete=true;startRecoveredTurn(s);assert.equal(s.storyMemory.introQuestComplete,true);
});
test('earth-death transition preserves state but requires canonical map and cutscenes',()=>{
 const s={currentWorld:'EARTH_PROLOGUE',flags:{earthPrologueDead:true},unlockedWorlds:['EARTH_PROLOGUE'],maxActionPoints:3,actionPoints:0,heat:0};
 const request=completeRecoveredEarthPrologue(s);
 assert.equal(s.flags.earthPrologueComplete,true);assert.equal(s.heat,.6);
 assert.equal(s.actionPoints,4);assert.deepEqual(s.unlockedWorlds,['EARTH_PROLOGUE','AFTERLIFE']);
 assert.equal(request.requiresCanonicalMapRebuild,true);
 assert.deepEqual(request.cutscenes,['deathWake','officeIntake','floorTutorial']);
});
test('ordinary Earth choice cannot trigger death transition',()=>{
 const s={currentWorld:'EARTH_PROLOGUE',flags:{earthPrologueDead:false}};
 assert.equal(completeRecoveredEarthPrologue(s),false);
});
