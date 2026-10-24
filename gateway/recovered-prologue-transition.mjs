// Bounded recovered Earth->Afterlife transition. No public gameplay release.
// This prepares persisted map and ordered cutscene presentation state together;
// it DOES NOT claim full original task-board, NPC, or browser-view parity.
import {completeRecoveredEarthPrologue} from './recovered-opening-turn.mjs';
import {buildRecoveredWorldMap} from './recovered-map-builder.mjs';
const KEYS=Object.freeze(['deathWake','officeIntake','floorTutorial']);
export function buildRecoveredPrologueTransition(saved,world){
 if(!saved||!world||world.id!=='AFTERLIFE')throw new TypeError('Canonical Afterlife world required');
 if(saved.currentWorld!=='EARTH_PROLOGUE'||saved.flags?.earthPrologueDead!==true)
   throw new Error('Earth death transition not available');
 if(saved.flags?.earthPrologueComplete)throw new Error('Earth transition already completed');
 const next=structuredClone(saved);
 const effect=completeRecoveredEarthPrologue(next);
 if(!effect?.requiresCanonicalMapRebuild||effect.world!==world.id||
    JSON.stringify(effect.cutscenes)!==JSON.stringify(KEYS))
   throw new Error('Recovered transition contract changed');
 const rebuilt=buildRecoveredWorldMap(next,world);
 // Recovered queueOpeningCutscenes replaces the pending list. A shown scene
 // flags.cutscenes.<id> is marked true at presentation start, NOT at queue time.
 // Keep the complete queue pending until an authenticated consumer drains it.
 rebuilt.pendingCutsceneQueue=[...KEYS];
 rebuilt.cutsceneOpen=false;
 rebuilt.activeCutsceneKey=null;
 return rebuilt;
}
export function claimNextRecoveredCutscene(saved){
 if(!saved||!Array.isArray(saved.pendingCutsceneQueue))throw new TypeError('Saved cutscene queue required');
 const next=structuredClone(saved);
 if(next.activeCutsceneKey)return {state:next,key:next.activeCutsceneKey,replayed:true};
 while(next.pendingCutsceneQueue.length){
  const key=next.pendingCutsceneQueue.shift();
  if(!KEYS.includes(key))throw new Error('Unknown cutscene key');
  if(next.flags?.cutscenes?.[key])continue;
  next.flags??={};next.flags.cutscenes??={};next.flags.cutscenes[key]=true;
  next.activeCutsceneKey=key;next.cutsceneOpen=true;
  return {state:next,key,replayed:false};
 }
 next.cutsceneOpen=false;next.activeCutsceneKey=null;
 return {state:next,key:null,replayed:false};
}
export function acknowledgeRecoveredCutscene(saved,key){
 if(!KEYS.includes(key)||saved?.activeCutsceneKey!==key||saved?.cutsceneOpen!==true)
  throw new Error('No matching active cutscene');
 const next=structuredClone(saved);
 next.activeCutsceneKey=null;next.cutsceneOpen=false;
 return next;
}
