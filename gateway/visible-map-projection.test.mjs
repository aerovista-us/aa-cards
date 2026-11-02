import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOwnedVisibleMap} from './visible-map-projection.mjs';
import {cellEnabled} from '../phaser-lab/office-model.mjs';
function run(){
  const width=9,height=7;
  const tiles=Array.from({length:width*height},(_,n)=>{
    const x=n%width,y=Math.floor(n/width);
    return {tags:[cellEnabled(x,y)?'clerks':'void'],discovered:(x===4&&y===4)||(x===4&&y===3),spawns:[],hiddenNPCMemory:'leak',sealedChoice:'secret'};
  });
  return {id:'test-run',owner_subject:'subjectA',revision:4,state:{
    currentWorld:'AFTERLIFE',turn:2,pos:{x:4,y:4},
    worldMap:{width,height,tiles,tagPool:['secret-pool'],worldProfile:{shape:'office'}},
    rngDraws:992,seedString:'private-seed',storyMemory:{decisionHistory:['secret']},
    pendingCutsceneQueue:['future'],hiddenFlags:{secret:1}
  }};
}
test('projector sends discovered cells only; hides RNG, hidden memory and spawns',()=>{
 const r=run();
 const view=projectOwnedVisibleMap({identity:{subject:'subjectA'},run:r,
  visibleMarkers:[{id:'caseworker',kind:'npc',label:'Case Worker',x:4,y:3},{id:'hidden',kind:'npc',label:'Hidden Clerk',x:7,y:6}]});
 assert.equal(view.revision,4);
 assert.equal(view.map.cells.length,63);
 assert.deepEqual(view.map.cells[4+4*9],{visible:true,walkable:true});
 assert.deepEqual(view.map.cells[0],{visible:false});
 assert.deepEqual(view.markers,[{id:'caseworker',kind:'npc',label:'Case Worker',x:4,y:3}]);
 const output=JSON.stringify(view);
 for(const secret of ['secret-pool','leak','secret','private-seed','storyMemory','spawns','rngDraws','owner_subject','hiddenFlags'])
  assert.equal(output.includes(secret),false,secret+' leaked');
 assert.equal(r.state.worldMap.tiles[0].discovered,false,'must not alter recovered state');
});
test('denies ownership mismatch or absent identity',()=>{
 assert.throws(()=>projectOwnedVisibleMap({identity:{subject:'other'},run:run()}),e=>e.status===403);
 assert.throws(()=>projectOwnedVisibleMap({identity:null,run:run()}),e=>e.status===401);
 const r=run();delete r.owner_subject;
 assert.throws(()=>projectOwnedVisibleMap({identity:{subject:'subjectA'},run:r}),e=>e.status===403);
});
test('rejects corrupt positions, dimensions, discovery and markers',()=>{
 const r=run();r.state.pos={x:99,y:99};
 assert.throws(()=>projectOwnedVisibleMap({identity:{subject:'subjectA'},run:r}),/position/);
 const z=run();z.state.worldMap.tiles[4+4*9].discovered=false;
 assert.throws(()=>projectOwnedVisibleMap({identity:{subject:'subjectA'},run:z}),/discovered/);
 const y=run();y.state.worldMap.width=100;
 assert.throws(()=>projectOwnedVisibleMap({identity:{subject:'subjectA'},run:y}),/Canonical map/);
 assert.throws(()=>projectOwnedVisibleMap({identity:{subject:'subjectA'},run:run(),
 visibleMarkers:[{id:'n',kind:'npc',label:'<script>',x:4,y:3}]}),/marker/);
});
test('revision and original state retained and not changed by display projection',()=>{
 const r=run(),before=structuredClone(r);
 const v=projectOwnedVisibleMap({identity:{subject:'subjectA'},run:r});
 assert.deepEqual(r,before);
 assert.equal(v.sessionId,'test-run');assert.equal(v.turn,2);
});
