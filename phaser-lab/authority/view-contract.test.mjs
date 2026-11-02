import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMapView,createProjectionPlayback} from './view-contract.mjs';
import {SAMPLE_SNAPSHOTS} from './sample-snapshots.mjs';
test('synthetic snapshots conform to the exact sanitized view contract',()=>{
 const frames=SAMPLE_SNAPSHOTS.map(validateMapView);
 assert.equal(frames.length,6);
 assert.equal(frames[0].revision,0);
 assert.equal(frames.at(-1).revision,5);
 assert.equal(frames[0].map.width,9);
 assert.equal(frames[0].map.height,7);
 assert.ok(frames[0].map.cells.every(c=>c.visible===true||Object.keys(c).length===1));
 assert.ok(frames[0].map.cells.every(c=>c.visible===true||c.walkable===undefined));
});
test('read-only snapshots are whitelisted and immutable',()=>{
 const example=structuredClone(SAMPLE_SNAPSHOTS[0]);
 example.seedString='private-seed';example.storyMemory={secret:'nope'};
 example.map.cells[0].secret='hidden';
 const accepted=validateMapView(example);
 assert.equal(JSON.stringify(accepted).includes('private-seed'),false);
 assert.equal(JSON.stringify(accepted).includes('storyMemory'),false);
 assert.equal(JSON.stringify(accepted).includes('secret'),false);
 assert.equal(Object.isFrozen(accepted),true);
 assert.equal(Object.isFrozen(accepted.map.cells),true);
 assert.equal(Object.isFrozen(accepted.player),true);
});
test('malformed or leaked hidden walkability fails closed',()=>{
 const a=structuredClone(SAMPLE_SNAPSHOTS[0]);a.map.cells[0]={visible:false,walkable:false};
 assert.throws(()=>validateMapView(a),/Hidden tile/);
 const b=structuredClone(SAMPLE_SNAPSHOTS[0]);b.player={x:8,y:6};
 assert.throws(()=>validateMapView(b),/player/);
 const c=structuredClone(SAMPLE_SNAPSHOTS[0]);c.markers=[{id:'secret',kind:'npc',label:'Locked NPC',x:8,y:6}];
 assert.throws(()=>validateMapView(c),/marker/);
});
test('revision playback is monotonic, replay-only, no game action API',()=>{
 const timeline=createProjectionPlayback(SAMPLE_SNAPSHOTS);
 assert.equal(timeline.current().revision,0);
 assert.equal(timeline.next().revision,1);
 assert.equal(timeline.next().revision,2);
 assert.equal(timeline.reset().revision,0);
 assert.throws(()=>createProjectionPlayback([SAMPLE_SNAPSHOTS[2],SAMPLE_SNAPSHOTS[1]]),/continuity/);
 const mix=structuredClone(SAMPLE_SNAPSHOTS.slice(0,2));mix[1].sessionId='another-account';
 assert.throws(()=>createProjectionPlayback(mix),/continuity/);
});
