// Source port of recovered app.js appendTasksToBoard, lines 5773-5833.
// Must be invoked only inside an owner-locked transaction with canonical callbacks.
import {recoveredTaskMarkerTone,recoveredTaskMarkerKind,recoveredTaskMobility} from './recovered-task-rules.mjs';
export function appendRecoveredTasks({board,storylets,cells,fixedStation,characterForStorylet,isOfficeIntakeWorld,fixtureForCell,tileTagsAt,inBounds}){
 if(!Array.isArray(board?.tasks)||!Array.isArray(storylets)||!Array.isArray(cells))throw new TypeError('Canonical board, storylets and cells required');
 for(const [key,fn] of Object.entries({fixedStation,characterForStorylet,fixtureForCell,tileTagsAt,inBounds}))
  if(typeof fn!=='function')throw new TypeError('Canonical '+key+' required');
 const used=new Set(board.tasks.map(task=>`${task.x},${task.y}`));
 const takeCell=(storylet,index)=>{
  const counter=fixedStation(storylet?.id);
  if(counter&&inBounds(counter.x,counter.y)){used.add(`${counter.x},${counter.y}`);return {x:counter.x,y:counter.y};}
  if(recoveredTaskMobility(storylet)==='desk'&&isOfficeIntakeWorld){
   const desk=cells.find(cell=>!used.has(`${cell.x},${cell.y}`)&&['desk','window','terminal'].includes(fixtureForCell(cell.x,cell.y)));
   if(desk){used.add(`${desk.x},${desk.y}`);return desk;}
  }
  const preferred=Array.isArray(storylet.tileTags)?cells.find(cell=>!used.has(`${cell.x},${cell.y}`)&&storylet.tileTags.some(tag=>(tileTagsAt(cell.x,cell.y)||[]).includes(tag))):null;
  const fallback=preferred||cells.find(cell=>!used.has(`${cell.x},${cell.y}`));
  if(fallback)used.add(`${fallback.x},${fallback.y}`);
  return fallback;
 };
 const startOrder=board.tasks.reduce((max,task)=>Math.max(max,Number(task.order??-1)),-1)+1;
 for(const [index,sl] of storylets.entries()){
  const cell=takeCell(sl,index);if(!cell)continue;
  const counter=fixedStation(sl.id);
  const character=characterForStorylet(sl,{fixedOfficeCounter:!!counter});
  board.tasks.push({
   id:sl.id,x:cell.x,y:cell.y,homeX:cell.x,homeY:cell.y,
   mobility:recoveredTaskMobility(sl),order:startOrder+index,planned:!!sl.planned,
   required:!!sl.progressor||(sl.tags||[]).includes('main')||(sl.tags||[]).includes('onboarding'),
   completed:false,tone:recoveredTaskMarkerTone(sl),kind:recoveredTaskMarkerKind(sl),
   ticket:counter?.ticket||null,window:counter?.window||null,station:counter?.station||null,
   icon:counter?.icon||null,characterKey:character?.characterKey||null,fixedOfficeCounter:!!counter
  });
 }
 return board;
}
