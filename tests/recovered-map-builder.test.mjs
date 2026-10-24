import test from 'node:test';import assert from 'node:assert/strict';
import {buildRecoveredWorldMap} from '../gateway/recovered-map-builder.mjs';
import {MapSystem} from '../gateway/recovered-v4/map.js';
import {SpawnSystem} from '../gateway/recovered-v4/spawn.js';
import {createPersistentRng} from '../gateway/persistent-rng.mjs';
const profile={id:'AFTERLIFE',map:{shape:'office',w:12,h:10},tags:['clerks','rest','archive']};
test('canonical world map matches recovered map+spawn generators for full tiles and RNG',()=>{
 const initial={seedString:'Billy-canonical-world',rngDraws:7,pos:{x:0,y:0},currentWorld:'EARTH_PROLOGUE'};
 const built=buildRecoveredWorldMap(initial,profile);
 const rng=createPersistentRng({seedString:initial.seedString,rngDraws:initial.rngDraws});
 const st={state:structuredClone(initial),rand:()=>rng.next()};
 const map=new MapSystem(st,{getContext:()=>({})});const spawn=new SpawnSystem(st,map);
 st.state.currentWorld=profile.id;st.state.pos={x:Math.floor(map.w/2),y:Math.floor(map.h/2)};
 map.setWorldProfile(profile.map);map.setTagPool(profile.tags);map.generate();spawn.seedAll();
 assert.deepEqual(built.worldMap.tiles,map.grid);assert.deepEqual(built.pos,st.state.pos);
 assert.equal(built.rngDraws,rng.checkpoint().rngDraws);
 assert.ok(built.worldMap.tiles.some(tile=>tile.spawns.length));
});
test('world map rebuild resumes persisted RNG deterministically',()=>{
 const initial={seedString:'Billy-canonical-world',rngDraws:23,pos:{x:0,y:0}};
 assert.deepEqual(buildRecoveredWorldMap(initial,profile),buildRecoveredWorldMap(JSON.parse(JSON.stringify(initial)),profile));
});
