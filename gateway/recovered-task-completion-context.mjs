// Strict state-backed context for bounded task completion. Source-derived
// readiness and cell-lock reconciliation; markers/reward remain authoritative
// injected operations. Do not expose as public gameplay until parity is proven.
import {reconcileRecoveredCellLock} from './recovered-cell-lock-reconcile.mjs';
import {recoveredTaskReadiness} from './recovered-task-rules.mjs';
import {recoveredAppConditionOk} from './recovered-task-canonical-context.mjs';
export function resolveRecoveredTaskCompletionContext(state,{library,syncTaskMarkers,rewardOpeningProgress,currentCellKey}){
 if(!state?.storyMemory?.worldTaskBoard||!state.pos||!state.currentWorld||!Array.isArray(library))
  throw new TypeError('Canonical task state and story library required');
 if(typeof syncTaskMarkers!=='function'||typeof rewardOpeningProgress!=='function'||typeof currentCellKey!=='function')
  throw new TypeError('Canonical marker, reward and cell identity handlers required');
 const board=state.storyMemory.worldTaskBoard[state.currentWorld];
 if(!board||!Array.isArray(board.tasks))throw new TypeError('Canonical active board required');
 const byId=new Map(library.map(s=>[s.id,s]));
 const resolveStorylet=id=>byId.get(id)||null;
 const tileTasks=board.tasks.filter(t=>t.x===state.pos.x&&t.y===state.pos.y);
 const readiness=task=>recoveredTaskReadiness({task,board,storylet:resolveStorylet(task.id),conditionOk:cond=>recoveredAppConditionOk(state,cond),resolveStorylet});
 const renderStorylet=id=>resolveStorylet(id);
 const hydrateLockedStorylets=ids=>ids.map(renderStorylet).filter(Boolean);
 const {lock,picks}=reconcileRecoveredCellLock({state,key:currentCellKey(state),tileTasks,readiness,renderStorylet,hydrateLockedStorylets});
 return {authoritative:true,board,lock,picks,resolveStorylet,syncTaskMarkers:()=>syncTaskMarkers(state),rewardOpeningProgress:label=>rewardOpeningProgress(state,label),currentWorld:state.currentWorld};
}
