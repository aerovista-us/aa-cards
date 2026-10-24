import test from 'node:test';import assert from 'node:assert/strict';
import {consumeRecoveredSpawn,grantRecoveredSpawnReward,resolveRecoveredTurn} from '../gateway/recovered-spawn-turn.mjs';
test('spawn consumes one charge and applies original respawn cooldown',()=>{
 const tile={spawns:[{type:'loot',charges:1,cooldown:0,respawn:8}]};
 assert.equal(consumeRecoveredSpawn(tile,'loot'),true);
 assert.equal(tile.spawns[0].cooldown,8);assert.equal(consumeRecoveredSpawn(tile,'loot'),false);
});
test('reward consumes exactly two RNG draws and awards loot and XP',()=>{
 let draws=0;
 const state={currentWorld:'AFTERLIFE',inventory:{},xp:0,level:1,maxActionPoints:3};
 const reward=grantRecoveredSpawnReward(state,'loot',{id:'office.demo'},{next(){draws++;return 0.1}});
 assert.equal(draws,2);assert.equal(reward.item,'Scrap');
 assert.equal(state.inventory.Scrap,1);assert.equal(state.xp,2);
});
test('turn resolves conditional NPC draws, cooldowns, spawn ticks and echoes',()=>{
 const values=[0.8,0.9,0.9,0.9,0.9];let draws=0;
 const s={turn:2,maxActionPoints:3,actionPoints:0,heat:1,npcs:{jinx:1,edgar:1,caseworker:-1,nyx:-1},
  inventory:{},consequences:{timeline:0,council:0,humanity:0},cooldowns:{intro:2},storyMemory:{pendingEchoes:[{id:'echo.x',dueTurn:3}]}};
 const tiles=[{spawns:[{cooldown:1,charges:0,respawn:7}]}];
 assert.deepEqual(resolveRecoveredTurn(s,{next(){return values[draws++]}},tiles),['timeline','jinx','edgar','caseworker','nyx']);
 assert.equal(draws,5);assert.equal(s.turn,3);assert.equal(s.actionPoints,3);
 assert.equal(s.cooldowns.intro,1);assert.equal(tiles[0].spawns[0].charges,1);
 assert.equal(s.storyMemory.pendingEchoes[0].announced,true);
});
