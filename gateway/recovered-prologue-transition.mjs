// Single source-derived prologue orchestration step. This is NOT a public game executor.
// Caller must persist the returned state atomically and coordinate cutscene playback.
import {completeRecoveredEarthPrologue} from './recovered-opening-turn.mjs';
import {buildRecoveredWorldMap} from './recovered-map-builder.mjs';
export function transitionRecoveredPrologue(saved,afterlifeWorld){
 if(!saved||typeof saved!=='object'||!afterlifeWorld||afterlifeWorld.id!=='AFTERLIFE')
  throw new TypeError('Canonical saved run and Afterlife world definition required');
 const next=structuredClone(saved);
 const result=completeRecoveredEarthPrologue(next);
 if(!result)return {transitioned:false,state:next,cutscenes:[]};
 if(!result.requiresCanonicalMapRebuild||result.world!==afterlifeWorld.id)
  throw new Error('Unsupported canonical transition');
 const rebuilt=buildRecoveredWorldMap(next,afterlifeWorld);
 // Cutscene queue is server persisted, but playback is a client presentation detail.
 // Append in recovered prescribed order and do not dequeue on save/reload.
 const existing=rebuilt.pendingCutscenes;
 if(existing!==undefined&&!Array.isArray(existing))throw new TypeError('Invalid persisted cutscene queue');
 rebuilt.pendingCutscenes=[...(existing||[]),...result.cutscenes];
 return {transitioned:true,state:rebuilt,cutscenes:[...result.cutscenes]};
}
