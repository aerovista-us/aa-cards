import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfficeRun,applyWorldAction,serializeOfficeRun,restoreOfficeRun} from '../gateway/world-interaction-engine.mjs';
const run=()=>createOfficeRun({ownerId:'player-a',runId:'run-1'});
const act=(s,type,rest={})=>applyWorldAction(s,{type,...rest}).state;
test('starts Billy in the Placement Office with durable owner identity',()=>{
 const s=run();assert.equal(s.location,'afterlife-placement-office');
 assert.deepEqual(s.player,{x:0,y:0,name:'Billy'});assert.equal(s.ownerId,'player-a');
});
test('legal movement works, walls and diagonal jumps are rejected without mutation',()=>{
 const s=run();const advanced=act(s,'move',{dx:1,dy:0});
 assert.equal(advanced.player.x,1);assert.equal(s.player.x,0);
 assert.throws(()=>act(advanced,'move',{dx:0,dy:1}),/blocked/);
 assert.throws(()=>act(s,'move',{dx:1,dy:1}),/invalid_move/);
 assert.throws(()=>act(s,'move',{dx:-1,dy:0}),/blocked/);
});
test('objects can be observed and opened only at range',()=>{
 let s=run();s=act(s,'inspect',{target:'notice'});assert.equal(s.objectState.notice.read,true);
 assert.throws(()=>act(s,'open',{target:'cabinet'}),/target_not_in_reach/);
 s=act(s,'move',{dx:1,dy:0});s=act(s,'move',{dx:1,dy:0});
 s=act(s,'move',{dx:1,dy:0});s=act(s,'open',{target:'cabinet'});
 assert.equal(s.objectState.cabinet.open,true);
 assert.throws(()=>act(s,'open',{target:'cabinet'}),/already_open/);
});
test('case worker dialogue reflects committed environment and remembers topics',()=>{
 let s=run();s=act(s,'move',{dx:1,dy:0});s=act(s,'move',{dx:1,dy:0});
 s=act(s,'move',{dx:1,dy:0});s=act(s,'open',{target:'cabinet'});
 s=act(s,'move',{dx:1,dy:0});
 const r=applyWorldAction(s,{type:'talk',target:'caseworker',topic:'cabinet'});
 assert.match(r.event.text,/opened that/);assert.deepEqual(r.state.npcMemory.caseworker.topics,['cabinet']);
 assert.equal(r.state.npcMemory.caseworker.met,true);
});
test('exit and reload preserves world change, NPC memory, revision and event history',()=>{
 let s=run();for(let i=0;i<3;i++)s=act(s,'move',{dx:1,dy:0});
 s=act(s,'open',{target:'cabinet'});s=act(s,'move',{dx:1,dy:0});
 s=act(s,'talk',{target:'caseworker',topic:'cabinet'});
 const reloaded=restoreOfficeRun(serializeOfficeRun(s),{ownerId:'player-a'});
 assert.deepEqual(reloaded,s);
 assert.equal(reloaded.objectState.cabinet.open,true);
 assert.throws(()=>restoreOfficeRun(serializeOfficeRun(s),{ownerId:'player-b'}),/owner_mismatch/);
});
