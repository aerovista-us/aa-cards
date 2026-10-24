// Server-side state primitives extracted from recovered Ascension v4.
// A complete executor must also persist the canonical world map and call
// story/NPC/echo handlers; this module does not enable gameplay by itself.
import {grantRecoveredXp} from './recovered-choice-primitives.mjs';
import {advanceRecoveredEchoes} from './recovered-world-echo.mjs';
const REWARDS={
 AFTERLIFE:{common:['Scrap','Scripted Note'],uncommon:['Clerk Seal','Favor'],rare:['Rolodex Fragment']},
 VEILWAY:{common:['Clue','Scrap'],uncommon:['Veil Thread','Favor'],rare:['Memory Key']},
 ARCHIVE:{common:['Clue','Scripted Note'],uncommon:['Archive Stamp','Veil Thread'],rare:['Echo Ledger']},
 BLACK_MARKET:{common:['Favor','Scrap'],uncommon:['Contraband Vial','Clue'],rare:['Black Ledger']},
 ODDWYN:{common:['Scrap','Clue'],uncommon:['Wyrd Token','Favor'],rare:['Oddwyn Sigil']},
 MYSTARA:{common:['Clue','Favor'],uncommon:['Bloom Resin','Veil Thread'],rare:['Mystara Relic']},
 RIFT:{common:['Clue','Scrap'],uncommon:['Fracture Dust','Memory Key'],rare:['Rift Core']}
};
export function consumeRecoveredSpawn(tile,type) {
 const spawn=(tile?.spawns||[]).find(s=>s.type===type && s.charges>0);
 if(!spawn)return false;
 spawn.charges-=1;
 if(spawn.charges<=0)spawn.cooldown=spawn.respawn;
 return true;
}
export function grantRecoveredSpawnReward(state,type,storylet,rng) {
 const world=state.currentWorld;
 const roll=rng.next();
 const rarity=roll>0.9?'rare':roll>0.55?'uncommon':'common';
 const pool=REWARDS[world]||REWARDS.VEILWAY;
 const bucket=pool[rarity]||pool.common;
 const item=bucket[Math.floor(rng.next()*bucket.length)]||'Scrap';
 state.inventory??={};
 state.inventory[item]=Number(state.inventory[item]||0)+1;
 grantRecoveredXp(state,type==='encounter'?3:2);
 return {spawnType:type,world,item,qty:1,rarity,storyletId:storylet?.id||null};
}
export function tickRecoveredSpawns(tiles) {
 for(const tile of tiles)for(const spawn of tile.spawns||[])
  if(spawn.cooldown>0){spawn.cooldown--;if(spawn.cooldown<=0){spawn.cooldown=0;spawn.charges=1}}
}
export function resolveRecoveredTurn(state,rng,tiles) {
 const inc=(path,n)=>{const parts=path.split('.');let ref=state;for(const k of parts.slice(0,-1))ref=ref[k]??={};const last=parts.at(-1);ref[last]=Number(ref[last]||0)+n;};
 const events=[];
 const env=rng.next();
 if(env>0.7){inc('consequences.timeline',1);events.push('timeline')}
 else if(env<0.2){inc('heat',-0.4);events.push('pressure')}
 const np=state.npcs||{};
 if((np.jinx||0)>0&&rng.next()>0.55){inc('inventory.Clue',1);events.push('jinx')}
 if((np.edgar||0)>0&&rng.next()>0.6){inc('inventory.Scripted Note',1);events.push('edgar')}
 if((np.caseworker||0)<0&&rng.next()>0.6){inc('consequences.council',1);events.push('caseworker')}
 if((np.nyx||0)<0&&rng.next()>0.68){inc('consequences.humanity',-1);events.push('nyx')}
 state.turn=Number(state.turn||0)+1;
 state.actionPoints=Number(state.maxActionPoints||3);
 for(const key of Object.keys(state.cooldowns||{}))state.cooldowns[key]=Math.max(0,Number(state.cooldowns[key]||0)-1);
 state.heat=Math.max(0,Number(state.heat||0)-0.1);
 tickRecoveredSpawns(tiles);
 advanceRecoveredEchoes(state);
 return events;
}
