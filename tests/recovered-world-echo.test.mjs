import test from 'node:test';import assert from 'node:assert/strict';
import {unlockRecoveredWorlds,resolveRecoveredEcho,advanceRecoveredEchoes,recoveredAftershock} from '../gateway/recovered-world-echo.mjs';
test('world gates match recovered threshold rules without duplicates',()=>{
 const s={flags:{mainIntroQuestComplete:true,billyPath:'memory'},progress:{veil:2},quests:{},arc:{},consequences:{},unlockedWorlds:['EARTH_PROLOGUE']};
 unlockRecoveredWorlds(s);unlockRecoveredWorlds(s);
 assert.deepEqual(s.unlockedWorlds,['EARTH_PROLOGUE','ARCHIVE','BLACK_MARKET']);
});
test('echo resolution, announcement and expiration preserve original turn thresholds',()=>{
 const s={turn:4,storyMemory:{pendingEchoes:[{id:'echo.a',dueTurn:4},{id:'echo.b',dueTurn:8}]}};
 assert.equal(advanceRecoveredEchoes(s),1);
 assert.equal(advanceRecoveredEchoes(s),0);
 assert.equal(resolveRecoveredEcho(s,'echo.a'),true);
 s.turn=10;assert.equal(advanceRecoveredEchoes(s),1);
 assert.equal(s.storyMemory.pendingEchoes.length,1);
});
test('aftershock preserves conditional RNG draw ordering',()=>{
 const rolls=[0.95,0.05,0.20,0.20,0.20];let draws=0;
 const s={heat:0,consequences:{timeline:0},npcs:{jinx:1,caseworker:-1,nyx:-1},inventory:{}};
 const events=recoveredAftershock(s,{next(){return rolls[draws++]}});
 assert.deepEqual(events,['pressure','jinx','caseworker','nyx']);
 assert.equal(draws,5);assert.equal(s.inventory.Clue,1);
});
