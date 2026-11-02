import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRecoveredWorldMap} from './recovered-map-builder.mjs';
import {MapSystem} from './recovered-v4/map.js';
import {projectOwnedVisibleMap} from './visible-map-projection.mjs';
import {validateMapView} from '../phaser-lab/authority/view-contract.mjs';

const definitions=JSON.parse(readFileSync(new URL('./recovered-v4/worlds.json',import.meta.url),'utf8')).worlds;
const identity={subject:'test-subject'};
function owned(state,revision=0){return {id:'canonical-fixture',owner_subject:'test-subject',revision,state};}
function generated(world){
 return buildRecoveredWorldMap({
  seedString:'map-parity-'+world.id,rngDraws:0,turn:0,currentWorld:'NONE',
  pos:{x:0,y:0},storyMemory:{},pendingCutsceneQueue:[],hiddenFlags:{secret:true}
 },world);
}
function mapSystem(saved){
 const ref={state:saved};
 const map=new MapSystem(ref,{getContext:()=>({})});
 map.setWorldProfile(saved.worldMap.worldProfile);
 map.setTagPool(saved.worldMap.tagPool);
 map.grid=saved.worldMap.tiles; // canonical run's actual persisted tiles
 return map;
}
for(const world of definitions){
 test('real recovered map generation projects correct geometry and discovery: '+world.id,()=>{
  const state=generated(world),ref=structuredClone(state);
  const m=mapSystem(ref);
  assert.equal(state.worldMap.width,world.map.w);
  assert.equal(state.worldMap.height,world.map.h);
  assert.equal(state.worldMap.tiles.length,world.map.w*world.map.h);
  assert.equal(m.isCellEnabled(state.pos.x,state.pos.y),true,'spawn is on authorized tile');
  assert.equal(state.worldMap.tiles[state.pos.y*world.map.w+state.pos.x].discovered,true);

  const frame=validateMapView(projectOwnedVisibleMap({identity,run:owned(state)}));
  const discovered=state.worldMap.tiles.filter(x=>x.discovered).length;
  assert.equal(frame.map.cells.filter(x=>x.visible).length,discovered);
  assert.deepEqual(frame.player,state.pos);
  assert.equal(frame.world,world.id);
  // Compare the recovered engine's world geometry with the derived map
  // projection for every cell. Do not change the original stored state.
  const explored=structuredClone(state);
  for(const tile of explored.worldMap.tiles)tile.discovered=true;
  const visible=validateMapView(projectOwnedVisibleMap({identity,run:owned(explored)}));
  for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
   const projected=visible.map.cells[y*m.w+x];
   assert.equal(projected.walkable,m.isCellEnabled(x,y),
    'walkable geometry mismatch at '+world.id+'/'+x+','+y);
  }
  assert.deepEqual(state,generated(world),'seed/replay must produce deterministic map state');
 });
}
test('canonical movement discoveries are reflected in read-only revision frames',()=>{
 const world=definitions.find(x=>x.id==='AFTERLIFE');
 const game=generated(world);
 const m=mapSystem(game);
 const path=[[0,-1],[1,0],[0,1],[-1,0]];
 const first=projectOwnedVisibleMap({identity,run:owned(game,0)});
 let moved=false;
 for(const [dx,dy] of path){
  if(!m.canMove(game.pos.x,game.pos.y,dx,dy))continue;
  assert.equal(m.move(dx,dy),true);
  moved=true;break;
 }
 assert.equal(moved,true,'recovered game must allow a valid step');
 const after=projectOwnedVisibleMap({identity,run:owned(game,1)});
 assert.equal(after.revision,1);
 assert.notDeepEqual(after.player,first.player);
 assert.equal(after.map.cells[after.player.y*after.map.width+after.player.x].visible,true);
 assert.ok(after.map.cells.filter(c=>c.visible).length>=first.map.cells.filter(c=>c.visible).length);
 assert.equal(JSON.stringify(after).includes('seedString'),false);
 assert.equal(JSON.stringify(after).includes('pendingCutsceneQueue'),false);
});
