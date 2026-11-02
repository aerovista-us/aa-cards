// Canonical cell-action lock reconciliation. Source: recovered app.js 6195-6249.
// Caller supplies authoritative tile tasks, readiness, and storylet resolvers.
export function reconcileRecoveredCellLock({state,key,tileTasks,readiness,renderStorylet,hydrateLockedStorylets,force=false}){
 if(!state?.storyMemory||typeof key!=='string'||!Array.isArray(tileTasks))throw new TypeError('Canonical cell state required');
 for(const [name,fn] of Object.entries({readiness,renderStorylet,hydrateLockedStorylets}))if(typeof fn!=='function')throw new TypeError('Canonical '+name+' required');
 const lock=state.storyMemory.cellActionLock||(state.storyMemory.cellActionLock={});
 const ready=tileTasks.filter(t=>!t.completed&&readiness(t).ready);
 const fresh=()=>ready.map(t=>renderStorylet(t.id)).filter(Boolean);
 const required=()=>ready.filter(t=>t.required).map(t=>t.id);
 if(force||lock.key!==key){
  const picks=fresh();lock.key=key;lock.offeredIds=picks.map(p=>p.id);lock.requiredIds=required();lock.completedIds=[];lock.lastUpdatedTurn=Number(state.turn||0);
  return {lock,picks};
 }
 if(!Array.isArray(lock.offeredIds))lock.offeredIds=[];
 if(!Array.isArray(lock.requiredIds))lock.requiredIds=[];
 if(!Array.isArray(lock.completedIds))lock.completedIds=[];
 const liveIds=ready.map(t=>t.id);
 lock.offeredIds=lock.offeredIds.filter(id=>liveIds.includes(id));
 lock.requiredIds=lock.requiredIds.filter(id=>liveIds.includes(id));
 const completedIds=tileTasks.filter(t=>t.completed).map(t=>t.id);
 lock.offeredIds=lock.offeredIds.filter(id=>!completedIds.includes(id));
 lock.requiredIds=lock.requiredIds.filter(id=>!completedIds.includes(id));
 let picks=hydrateLockedStorylets(lock.offeredIds);
 if(picks.length===0){
  const replacement=fresh();lock.offeredIds=replacement.map(p=>p.id);lock.requiredIds=required();lock.completedIds=[];lock.lastUpdatedTurn=Number(state.turn||0);
  return {lock,picks:replacement};
 }
 lock.offeredIds=picks.map(p=>p.id);
 lock.requiredIds=lock.requiredIds.filter(id=>lock.offeredIds.includes(id));
 if(lock.requiredIds.length===0&&lock.offeredIds.length>0){lock.requiredIds=required();lock.completedIds=[];}
 else lock.completedIds=lock.completedIds.filter(id=>lock.requiredIds.includes(id));
 return {lock,picks};
}
