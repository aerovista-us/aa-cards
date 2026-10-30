import test from 'node:test';import assert from 'node:assert/strict';
import {diffRecoveredGameState as diff,assertRecoveredGameStateParity as assertParity} from '../gateway/recovered-full-state-diff.mjs';
const state=()=>({turn:4,rngDraws:21,actionPoints:2,storyMemory:{pendingEchoes:[],worldTaskBoard:{AFTERLIFE:{tasks:[{id:'desk',completed:false,x:2,y:1}]}}},worldMap:{tiles:[{spawns:[{charges:1}]}]},flags:{officeOnboardComplete:false}});
test('identical deep state is equal',()=>{const s=state();assert.equal(diff(s,structuredClone(s)).equal,true);assert.equal(assertParity(s,structuredClone(s)),true);});
test('reveals RNG, world tile and task mismatches with exact paths',()=>{
 const a=state(),b=state();b.rngDraws++;b.worldMap.tiles[0].spawns[0].charges=0;b.storyMemory.worldTaskBoard.AFTERLIFE.tasks[0].completed=true;
 const paths=diff(a,b).differences.map(x=>x.path);
 assert.deepEqual(paths,['rngDraws','storyMemory.worldTaskBoard.AFTERLIFE.tasks[0].completed','worldMap.tiles[0].spawns[0].charges']);
 assert.throws(()=>assertParity(a,b),e=>e.message==='recovered_full_state_parity_failed'&&e.differences.length===3);
});
test('detects missing keys rather than treating absence as null',()=>{const a=state(),b=state();delete b.flags;assert.equal(diff(a,b).equal,false);});
test('detects mismatched ordered arrays even when elements match',()=>{assert.equal(diff({q:[1,2]},{q:[2,1]}).equal,false);});
test('refuses incomplete comparison arguments',()=>assert.throws(()=>diff({},null),/complete state/));
