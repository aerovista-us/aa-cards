import test from 'node:test';import assert from 'node:assert/strict';
import {advanceRecoveredNpcMemory} from '../gateway/recovered-npc-memory.mjs';
test('Jinx trust and NPC thread update from recovered choices',()=>{
 const s={turn:3,flags:{},storyMemory:{npcMemory:{jinxTrust:2},npcThreads:{}}};
 advanceRecoveredNpcMemory(s,{id:'npc.jinx_broken_compass',tags:['jinx']},{id:'follow'},{resultEvent:'joined'});
 assert.equal(s.storyMemory.npcMemory.jinxTrust,3);assert.equal(s.flags.jinxEntryChoice,'follow');
 assert.deepEqual(s.storyMemory.npcThreads.jinx,{lastTurn:3,lastStoryletId:'npc.jinx_broken_compass',lastChoiceId:'follow',lastOutcomeKey:'joined'});
});
test('Nyx parley sets approach and pressure, persisting callback',()=>{
 const s={turn:1,flags:{},storyMemory:{npcMemory:{},npcThreads:{}}};
 advanceRecoveredNpcMemory(s,{id:'npc.nyx.shadow_parley',tags:['nyx']},{id:'answer_back'},{});
 assert.equal(s.flags.nyxOpenApproach,true);assert.equal(s.flags.nyxParleyChoice,'answer_back');
 assert.equal(s.storyMemory.npcMemory.nyxPressure,-1);
});
test('Case Worker and extended trust rules preserved',()=>{
 const s={turn:0,flags:{},storyMemory:{npcMemory:{},npcThreads:{}}};
 advanceRecoveredNpcMemory(s,{id:'npc.caseworker_audit',tags:['caseworker']},{id:'secure_records'},{});
 advanceRecoveredNpcMemory(s,{id:'npc.gatekeeper',tags:['gatekeeper']},{id:'trust'},{});
 assert.equal(s.storyMemory.npcMemory.caseworkerSuspicion,-1);
 assert.equal(s.storyMemory.npcMemory.gatekeeperTrust,1);
});
test('unknown NPC tags do not fabricate memory thread',()=>{
 const s={flags:{},storyMemory:{npcMemory:{},npcThreads:{}}};
 advanceRecoveredNpcMemory(s,{id:'office.info',tags:['office']},{id:'ask'},{});
 assert.deepEqual(s.storyMemory.npcThreads,{});
});
