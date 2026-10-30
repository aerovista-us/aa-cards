// Recovered BON Grid v4 task board assembler (app.js 5685-5771).
// Bounded: canonical candidate selection and source map/character callbacks supplied.
// Existing board same key is returned without RNG; missing candidates are refused
// until exact appendTasksToBoard behavior is ported.
import {placeRecoveredTaskCells} from './recovered-task-placement.mjs';
import {recoveredTaskMarkerTone,recoveredTaskMarkerKind,recoveredTaskMobility} from './recovered-task-rules.mjs';
export function assembleRecoveredWorldBoard({state,candidates,key,cells,rand,fixedStation,characterForStorylet,isOfficeIntakeWorld,fixtureForCell,tileTagsAt,inBounds,force=false}) {
 if(!state||typeof state!=='object'||!Array.isArray(candidates)||!Array.isArray(cells)||typeof key!=='string')throw new TypeError('Canonical board context required');
 if(typeof characterForStorylet!=='function')throw new TypeError('Canonical character resolver required');
 const boards=state.storyMemory?.worldTaskBoard;
 if(!boards||typeof boards!=='object')throw new TypeError('Preexisting canonical story memory required');
 const current=boards[state.currentWorld];
 if(!force&&current?.key===key&&Array.isArray(current.tasks)){
  const known=new Set(current.tasks.map(t=>t.id));
  if(candidates.every(sl=>known.has(sl.id)))return current;
  throw Object.assign(new Error('unported_task_board_append'),{status:422});
 }
 if(cells.length===0){const board={key,world:state.currentWorld,turn:Number(state.turn||0),tasks:[]};boards[state.currentWorld]=board;return board;}
 const placements=placeRecoveredTaskCells({candidates,cells,rand,fixedStation,mobility:recoveredTaskMobility,isOfficeIntakeWorld,fixtureForCell,tileTagsAt,inBounds});
 const tasks=placements.map(({storylet:sl,cell,counter},index)=>{
  const character=characterForStorylet(sl,{fixedOfficeCounter:!!counter});
  return {id:sl.id,x:cell.x,y:cell.y,homeX:cell.x,homeY:cell.y,mobility:recoveredTaskMobility(sl),order:index,planned:!!sl.planned,
   required:!!sl.progressor||(sl.tags||[]).includes('main')||(sl.tags||[]).includes('onboarding'),
   completed:!!current?.tasks?.find?.(task=>task.id===sl.id)?.completed,tone:recoveredTaskMarkerTone(sl),kind:recoveredTaskMarkerKind(sl),
   ticket:counter?.ticket||null,window:counter?.window||null,station:counter?.station||null,icon:counter?.icon||null,
   characterKey:character?.characterKey||null,fixedOfficeCounter:!!counter};
 });
 const board={key,world:state.currentWorld,turn:Number(state.turn||0),tasks};boards[state.currentWorld]=board;return board;
}
