// Source-derived movement gate from recovered app.js lines 6251-6285.
// This is pure evaluation of an already-authoritatively refreshed cell lock.
// The original ensureCellActionLock reconciliation MUST precede this check.
export function recoveredCellRequirementStatus(lock,picks=[]) {
 if(!lock||!Array.isArray(lock.requiredIds)||!Array.isArray(lock.completedIds)||!Array.isArray(picks))
  throw new TypeError('Authoritative reconciled cell lock and picks required');
 const requiredIds=lock.requiredIds,completedIds=lock.completedIds;
 const pendingIds=requiredIds.filter(id=>!completedIds.includes(id));
 const byId=new Map(picks.map(p=>[p.id,p]));
 return {lock,picks,requiredIds,completedIds,pendingIds,pendingLabels:pendingIds.map(id=>byId.get(id)?.label||id),remaining:pendingIds.length,totalRequired:requiredIds.length};
}
export function canLeaveRecoveredCell(lock,picks=[]){
 const status=recoveredCellRequirementStatus(lock,picks);
 return {allowed:status.remaining<=0,status};
}
