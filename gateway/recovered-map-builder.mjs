// Source-faithful map generation using recovered MapSystem and SpawnSystem.
// Intended for the server-owned RNG cursor within a locked run transaction.
import {MapSystem} from './recovered-v4/map.js';
import {SpawnSystem} from './recovered-v4/spawn.js';
import {createPersistentRng} from './persistent-rng.mjs';
export function buildRecoveredWorldMap(saved, world) {
 if(!saved?.seedString || !world?.id || !world?.map || !Array.isArray(world?.tags)||!world.tags.length)
  throw new TypeError('Authoritative saved state and world definition required');
 const next=structuredClone(saved);
 const rng=createPersistentRng({seedString:next.seedString,rngDraws:next.rngDraws??0});
 const stateRef={state:next,rand:()=>rng.next()};
 const map=new MapSystem(stateRef,{getContext:()=>({})});
 const spawn=new SpawnSystem(stateRef,map);
 next.currentWorld=world.id;
 next.pos={x:Math.floor(map.w/2),y:Math.floor(map.h/2)};
 map.setWorldProfile(world.map);map.setTagPool(world.tags);
 map.generate();spawn.seedAll();
 next.rngDraws=rng.checkpoint().rngDraws;
 next.worldMap={width:map.w,height:map.h,tiles:structuredClone(map.grid),worldProfile:structuredClone(map.worldProfile),tagPool:[...map.tagPool]};
 return next;
}
