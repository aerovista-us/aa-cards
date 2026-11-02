// Recovered app.js getPrerequisiteDeskTarget (5835-5850).
// Blocked-task statuses must come from canonical currentTileBlockedTasks;
// never guess blockers from incomplete state.
export function recoveredPrerequisiteDeskTarget(state,{blockedTasks}){
 if(typeof blockedTasks!=='function')throw new TypeError('Canonical blocked-task resolver required');
 const blocked=blockedTasks(state);
 if(!Array.isArray(blocked))throw new TypeError('Canonical blocked-task rows required');
 const withBlocker=blocked.find(row=>row?.status?.blocker);
 if(withBlocker)return {x:withBlocker.status.blocker.x,y:withBlocker.status.blocker.y};
 const board=state?.storyMemory?.worldTaskBoard?.[state?.currentWorld];
 if(!board||!Array.isArray(board.tasks))throw new TypeError('Canonical world task board required');
 const next=board.tasks.filter(task=>!task.completed&&task.planned)
  .sort((a,b)=>Number(a.order??0)-Number(b.order??0))[0];
 return next?{x:next.x,y:next.y}:null;
}
