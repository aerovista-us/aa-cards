// Source-traced task completion: recovered app.js lines 6287-6306.
// Caller supplies authoritative reconciled requirement status, active board,
// storylet resolver and marker/reward effects. Not a public command endpoint.
import {recoveredCellRequirementStatus} from './recovered-cell-requirements.mjs';
export function completeRecoveredCellTask({board,lock,picks=[],storyletId,resolveStorylet,syncTaskMarkers,rewardOpeningProgress,currentWorld}){
 if(!board||!Array.isArray(board.tasks)||typeof storyletId!=='string')throw new TypeError('Canonical task board and ID required');
 for(const [name,fn] of Object.entries({resolveStorylet,syncTaskMarkers,rewardOpeningProgress}))
  if(typeof fn!=='function')throw new TypeError('Canonical '+name+' required');
 // Verify the task was actually offered and exists before mutations. The
 // source UI guarantees this via its choice renderer; server must enforce it.
 if(!Array.isArray(lock?.offeredIds)||!lock.offeredIds.includes(storyletId))
  throw Object.assign(new Error('task_not_offered'),{status:422});
 const req=recoveredCellRequirementStatus(lock,picks);
 const storylet=resolveStorylet(storyletId);
 if(!storylet)throw Object.assign(new Error('unresolved_storylet'),{status:422});
 const task=board.tasks.find(item=>item.id===storyletId);
 if(!task||task.completed)throw Object.assign(new Error('inactive_or_completed_task'),{status:409});
 task.completed=true;syncTaskMarkers();
 if(!req.requiredIds.includes(storyletId))return {completed:false,remaining:req.remaining,total:req.totalRequired};
 if(!lock.completedIds.includes(storyletId))lock.completedIds.push(storyletId);
 const remaining=lock.requiredIds.filter(id=>!lock.completedIds.includes(id)).length;
 if(remaining===0||storylet.progressor||(storylet.tags||[]).includes('onboarding'))
  rewardOpeningProgress(storylet.label||(currentWorld==='EARTH_PROLOGUE'?'Station cleared':'Desk cleared'));
 return {completed:true,remaining,total:lock.requiredIds.length};
}
