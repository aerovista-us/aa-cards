// Source-derived Earth -> Afterlife map transition, not a complete choice executor.
import worlds from './recovered-v4/worlds.json' with {type:'json'};
import {completeRecoveredEarthPrologue} from './recovered-opening-turn.mjs';
import {buildRecoveredWorldMap} from './recovered-map-builder.mjs';
import {requirePersistedWorld} from './recovered-memory-map.mjs';
const AFTERLIFE=worlds.worlds.find(w=>w.id==='AFTERLIFE');
export function transitionRecoveredEarthToAfterlife(saved){
 const before=structuredClone(saved);
 const desired=completeRecoveredEarthPrologue(before);
 if(!desired)return {changed:false,state:before};
 if(!desired.requiresCanonicalMapRebuild||desired.world!==AFTERLIFE.id)
  throw new Error('Unknown recovered world transition');
 const next=buildRecoveredWorldMap(before,AFTERLIFE);
 requirePersistedWorld(next);
 // The original opens the first cutscene immediately; subsequent cutscenes
 // are drained on user continuation. Persist intent; do NOT auto-acknowledge.
 next.pendingCutsceneQueue=[...desired.cutscenes];
 next.pendingCanonicalTasks=['ensureWorldTaskBoard','syncTaskMarkers','drainCutsceneQueue'];
 return {changed:true,state:next,cutscenes:[...desired.cutscenes],
   requiresTaskBoardAndCutsceneProcessing:true};
}
