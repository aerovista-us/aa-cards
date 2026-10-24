import test from 'node:test';import assert from 'node:assert/strict';
import {recordRecoveredDecisionMemory,snapshotRecoveredMap,requirePersistedWorld} from '../gateway/recovered-memory-map.mjs';
test('decision history, thread counts and world drift mirror recovered book-keeping',()=>{
 const state={turn:3,currentWorld:'AFTERLIFE',storyMemory:{decisionHistory:[],threadCounts:{office:1},worldStates:{AFTERLIFE:2}}};
 recordRecoveredDecisionMemory(state,{id:'office.intake_briefing',tags:['office','main']},{id:'acknowledge'},{resultEvent:'file_saved'},
 {council:0,exiles:1,timeline:0},{council:2,exiles:1,timeline:1});
 assert.equal(state.storyMemory.decisionHistory[0].summary,'Council +2, Timeline +1');
 assert.equal(state.storyMemory.threadCounts.office,2);
 assert.equal(state.storyMemory.worldStates.AFTERLIFE,5);
});
test('map roundtrip preserves spawn charges and cooldown without shared mutation',()=>{
 const world={width:1,height:1,tiles:[{tags:['rest'],spawns:[{id:'loot-1',type:'loot',charges:0,cooldown:8,respawn:8}]}]};
 const saved=snapshotRecoveredMap(world);world.tiles[0].spawns[0].cooldown=0;
 assert.equal(saved.tiles[0].spawns[0].cooldown,8);
 assert.deepEqual(snapshotRecoveredMap(JSON.parse(JSON.stringify(saved))),saved);
 assert.equal(requirePersistedWorld({worldMap:saved}).worldMap.width,1);
});
test('missing map or invalid spawns fail closed',()=>{
 assert.throws(()=>requirePersistedWorld({}),/Missing authoritative world map/);
 assert.throws(()=>snapshotRecoveredMap({width:1,height:1,tiles:[{spawns:[{charges:1,cooldown:0}]}]}),/Invalid spawn persistence/);
});
