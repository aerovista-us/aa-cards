// Original app.js syncTaskMarkers 5863-5888 and MapSystem 89-96.
// A state-owned map overlay, not a tile mutation: do not invent tile markers.
import {isRecoveredOpeningHour} from './recovered-opening-turn.mjs';
export function syncRecoveredTaskMarkers(state,{resolveStorylet,characterForStorylet,getPrerequisiteDeskTarget}) {
 if(!state?.worldMap||!Array.isArray(state?.storyMemory?.worldTaskBoard?.[state.currentWorld]?.tasks)) throw new TypeError('Canonical map and board required');
 for(const [name,fn] of Object.entries({resolveStorylet,characterForStorylet,getPrerequisiteDeskTarget}))
  if(typeof fn!=='function') throw new TypeError('Canonical '+name+' required');
 const board=state.storyMemory.worldTaskBoard[state.currentWorld];
 const opening=isRecoveredOpeningHour(state);
 const markers=board.tasks.map(task=>{
  const storylet=resolveStorylet(task.id);
  const character=characterForStorylet(storylet,task);
  return {x:task.x,y:task.y,required:!!task.required,planned:!!task.planned,
   deemphasize:opening&&!task.planned&&!task.required,completed:!!task.completed,
   tone:task.tone||'thread',kind:task.kind||'thread',mobility:task.mobility||'static',
   ticket:task.ticket||null,window:task.window||null,station:task.station||null,
   icon:task.icon||null,characterKey:task.characterKey||character?.characterKey||null,
   fixedOfficeCounter:!!task.fixedOfficeCounter};
 }).slice(0,24);
 const target=getPrerequisiteDeskTarget(state);
 const prerequisiteTarget=target&&Number.isFinite(Number(target.x))&&Number.isFinite(Number(target.y))
  ?{x:Number(target.x),y:Number(target.y)}:null;
 state.worldMap.taskMarkers=markers;
 state.worldMap.prerequisiteTarget=prerequisiteTarget;
 return {markers,prerequisiteTarget};
}
