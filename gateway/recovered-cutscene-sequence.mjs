// Recovered app.js queueOpeningCutscenes -> drainCutsceneQueue ->
// maybeShowCutscene -> closeCutscene, stripped of DOM/audio presentation.
// Caller alone decides when narration has completed and user can continue.
export function queueRecoveredOpeningCutscenes(state,keys=[]){
 if(!Array.isArray(keys)||keys.some(k=>typeof k!=='string'))throw new TypeError('Invalid cutscene keys');
 state.pendingCutsceneQueue=[...keys];return drainRecoveredCutsceneQueue(state);
}
export function drainRecoveredCutsceneQueue(state){
 state.flags??={};state.flags.cutscenes??={};
 state.pendingCutsceneQueue??=[];
 if(state.activeCutsceneKey)return state.activeCutsceneKey;
 while(state.pendingCutsceneQueue.length){
  const key=state.pendingCutsceneQueue.shift();
  if(state.flags.cutscenes[key])continue;
  state.flags.cutscenes[key]=true; // original flags immediately on display
  state.activeCutsceneKey=key;
  return key;
 }
 return null;
}
export function continueRecoveredCutscene(state,key){
 if(!key||state.activeCutsceneKey!==key)throw Object.assign(new Error('invalid_cutscene_continuation'),{status:409});
 state.activeCutsceneKey=null;
 return drainRecoveredCutsceneQueue(state);
}
