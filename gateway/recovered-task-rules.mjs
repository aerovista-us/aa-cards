// Source-traced, bounded pure helpers from recovered BON Grid v4 app.js.
// Original SHA-256 prefix: ab2a37710f9cfd0a
// Lines 5644-5672 (tone/kind/mobility), 5950-5982 (readiness).
// Caller is responsible for source-equivalent board creation, world and story conditions.
export function recoveredTaskMarkerTone(storylet) {
 const tags=storylet?.tags||[];
 if(tags.includes('main')||tags.includes('onboarding'))return 'required';
 if(tags.includes('npc'))return 'npc';
 if(tags.includes('sidequest'))return 'side';
 if(tags.includes('echo'))return 'echo';
 return 'thread';
}
export function recoveredTaskMarkerKind(storylet) {
 const tags=storylet?.tags||[];
 if(tags.includes('caseworker')||/case worker|window 7b|intake form/i.test(storylet?.label||''))return 'npc';
 if(storylet?.planned||tags.includes('onboarding')||tags.includes('office')||tags.includes('main'))return 'desk';
 if(tags.includes('npc'))return 'npc';
 if(tags.includes('echo'))return 'echo';
 if(tags.includes('sidequest')||tags.includes('council')||tags.includes('clerks'))return 'side';
 if(tags.includes('observe'))return 'intel';
 if(tags.includes('rest'))return 'rest';
 if(tags.includes('archive'))return 'archive';
 if(tags.includes('market'))return 'market';
 return 'thread';
}
export function recoveredTaskMobility(storylet) {
 const tags=storylet?.tags||[];
 if(tags.includes('caseworker')||tags.includes('clerks')||tags.includes('onboarding')||tags.includes('office'))return 'desk';
 if(tags.includes('npc'))return 'roam';
 return 'static';
}
// The condition evaluator is supplied by the recovered engine rather than approximated.
// For a task with unmet prerequisite, return the original's blocked reason.
export function recoveredTaskReadiness({task,board,storylet,conditionOk,resolveStorylet}) {
 if(!task)return {ready:false,reason:'No task signal is active here.'};
 if(!storylet)return {ready:false,reason:'The signal is present, but the file is not readable yet.'};
 if(typeof conditionOk!=='function')throw new TypeError('Canonical condition evaluator required');
 const earlier=task.planned
  ?(board?.tasks||[]).filter(item=>!item.completed).filter(item=>!!item.planned)
   .filter(item=>Number(item.order??0)<Number(task.order??0))
   .sort((a,b)=>Number(a.order??0)-Number(b.order??0))[0]
  :null;
 if(earlier){
  if(typeof resolveStorylet!=='function')throw new TypeError('Canonical storylet resolver required for planned-order block');
  const earlierStorylet=resolveStorylet(earlier.id);
  return {ready:false,blocker:earlier,reason:`Complete ${earlierStorylet?.label||earlier.id} first.`};
 }
 if(!conditionOk(storylet.when||{}))return {ready:false,reason:'This desk is assigned, but the prerequisite file has not opened yet.'};
 return {ready:true,storylet};
}
