// Bounded assembly of an already-authorized opening board, using recovered
// candidate, placement and marker behavior. Not a full first-hour executor.
import {recoveredWorldTaskBoardKey} from './recovered-task-board-identity.mjs';
import {assembleRecoveredWorldBoard} from './recovered-task-board-assemble.mjs';
import {syncRecoveredTaskMarkers} from './recovered-task-marker-sync.mjs';
import {recoveredPrerequisiteDeskTarget} from './recovered-prerequisite-target.mjs';
export function setupRecoveredOpeningBoard(state,{candidates,cells,rand,fixedStation,characterForStorylet,isOfficeIntakeWorld,fixtureForCell,tileTagsAt,inBounds,blockedTasks}={}) {
 if(state?.currentWorld!=='AFTERLIFE'||!state.worldMap||!Array.isArray(state.pendingCanonicalTasks))throw new TypeError('Opening transition and canonical map required');
 if(!state.pendingCanonicalTasks.includes('ensureWorldTaskBoard')||!state.pendingCanonicalTasks.includes('syncTaskMarkers'))throw new Error('opening_setup_not_pending');
 if(!Array.isArray(candidates)||candidates.length===0||!Array.isArray(cells)||cells.length===0)throw new TypeError('Canonical candidates and reachable cells required');
 if(typeof blockedTasks!=='function')throw new TypeError('Canonical blocked-task authority required');
 const next=structuredClone(state);
 const storylets=new Map(candidates.map(s=>[s.id,s]));
 if(candidates.some(s=>!s?.id)||storylets.size!==candidates.length)throw new TypeError('Unique canonical candidates required');
 const key=recoveredWorldTaskBoardKey({currentWorld:next.currentWorld,mapWidth:next.worldMap.width,mapHeight:next.worldMap.height,worldShape:next.worldMap.worldProfile?.shape},candidates);
 const board=assembleRecoveredWorldBoard({state:next,candidates,key,cells,rand,fixedStation,characterForStorylet,isOfficeIntakeWorld,fixtureForCell,tileTagsAt,inBounds});
 if(board.tasks.length!==candidates.length)throw new Error('incomplete_opening_board');
 const markers=syncRecoveredTaskMarkers(next,{
  resolveStorylet:id=>storylets.get(id)||null,characterForStorylet,
  getPrerequisiteDeskTarget:s=>recoveredPrerequisiteDeskTarget(s,{blockedTasks})
 });
 next.pendingCanonicalTasks=next.pendingCanonicalTasks.filter(k=>k!=='ensureWorldTaskBoard'&&k!=='syncTaskMarkers');
 return {state:next,board,markers};
}
