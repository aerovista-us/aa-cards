// Explicit composition boundary for bounded owner-scoped task completion.
// Authoritative marker/cell/event implementations must be supplied by runtime.
// No default map mutation; never advertise this as a completed gameplay API.
import {createOwnerTaskCompletionTransaction} from './owner-task-completion-transaction.mjs';
import {resolveRecoveredTaskCompletionContext} from './recovered-task-completion-context.mjs';
import {rewardRecoveredOpeningProgress} from './recovered-opening-progress-reward.mjs';
export function createBoundedRecoveredTaskRuntime({pool,authorizeChapter,library,currentCellKey,syncTaskMarkers,logEvent,noteTurn}){
 if(!Array.isArray(library))throw new TypeError('Canonical story library required');
 for(const [name,fn] of Object.entries({currentCellKey,syncTaskMarkers,logEvent,noteTurn}))
  if(typeof fn!=='function')throw new TypeError('Canonical '+name+' required');
 return createOwnerTaskCompletionTransaction({
  pool,authorizeChapter,
  resolveCanonicalTaskContext(state){
   return resolveRecoveredTaskCompletionContext(state,{
    library,currentCellKey,syncTaskMarkers,
    rewardOpeningProgress:(s,label)=>rewardRecoveredOpeningProgress(s,label,{logEvent,noteTurn})
   });
  }
 });
}
