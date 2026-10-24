// Snapshot-only movement gate for already-established canonical cell locks.
// Creation/reconciliation of locks remains in recovered task-board authority.
// Missing lock is NOT permission to move.
const ids=x=>Array.isArray(x)&&x.every(id=>typeof id==='string'&&id.length>0);
export function inspectRecoveredCellLock(saved,{expectedKey}={}){
 const lock=saved?.storyMemory?.cellActionLock;
 if(typeof expectedKey!=='string'||!expectedKey||!lock||lock.key!==expectedKey||
    !ids(lock.offeredIds)||!ids(lock.requiredIds)||!ids(lock.completedIds))
   return {allowed:false,reason:'unverified_cell_lock',pendingIds:[]};
 const offered=new Set(lock.offeredIds),required=new Set(lock.requiredIds),completed=new Set(lock.completedIds);
 if(required.size!==lock.requiredIds.length||completed.size!==lock.completedIds.length||
    [...required].some(id=>!offered.has(id))||
    [...completed].some(id=>!required.has(id)))
   return {allowed:false,reason:'inconsistent_cell_lock',pendingIds:[]};
 const pendingIds=[...required].filter(id=>!completed.has(id));
 return {allowed:pendingIds.length===0,reason:pendingIds.length?'required_interactions_pending':'cleared',pendingIds};
}
export function completeRecoveredCellRequirement(saved,{expectedKey,storyletId}={}){
 const before=inspectRecoveredCellLock(saved,{expectedKey});
 if(before.reason==='unverified_cell_lock'||before.reason==='inconsistent_cell_lock')
  throw new Error(before.reason);
 const lock=saved.storyMemory.cellActionLock;
 if(typeof storyletId!=='string'||!lock.requiredIds.includes(storyletId))
  throw new Error('Storylet is not a required interaction');
 if(!lock.offeredIds.includes(storyletId))throw new Error('Storylet not offered');
 const next=structuredClone(saved);
 if(!next.storyMemory.cellActionLock.completedIds.includes(storyletId))
  next.storyMemory.cellActionLock.completedIds.push(storyletId);
 // Caller must *first* verify that Director executed an eligible choice and
 // the recovered task board marked this storylet completed transactionally.
 return {state:next,lock:inspectRecoveredCellLock(next,{expectedKey})};
}
