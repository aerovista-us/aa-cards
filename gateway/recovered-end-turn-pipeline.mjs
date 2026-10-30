// M18 provisional deterministic turn pipeline. NOT a public gameplay endpoint.
// Full recovered recap, UI continuation, dynamic cutscenes and ending evaluation
// remain unported; caller must not promote this as full turn parity.
import {createPersistentRng} from './persistent-rng.mjs';
import {resolveRecoveredTurn} from './recovered-spawn-turn.mjs';
import {moveRecoveredRoamingTasks} from './recovered-task-roaming.mjs';
import {recoveredEndTurnGate} from './recovered-turn-gates.mjs';
export function simulateRecoveredEndTurn(saved,{ui={},inBounds,syncTaskMarkers,noteTurn}={}){
 if(recoveredEndTurnGate(ui).allowed!==true)throw Object.assign(new Error('turn_blocked'),{status:422});
 if(typeof inBounds!=='function'||typeof syncTaskMarkers!=='function'||typeof noteTurn!=='function')
  throw new TypeError('Canonical map bounds, marker and note handlers required');
 if(!saved?.worldMap||!Array.isArray(saved.worldMap.tiles)||!saved.storyMemory?.worldTaskBoard)
  throw new TypeError('Canonical world and task board required');
 const state=structuredClone(saved);
 const rng=createPersistentRng({seedString:state.seedString,rngDraws:state.rngDraws});
 // Source ordering: environment, NPC, advanceTurn, spawn tick, pending echoes,
 // then roaming actors. resolveRecoveredTurn encapsulates the first five steps.
 const events=resolveRecoveredTurn(state,rng,state.worldMap.tiles);
 const board=state.storyMemory.worldTaskBoard[state.currentWorld];
 if(!board||!Array.isArray(board.tasks))throw new TypeError('Canonical active board required');
 const moved=moveRecoveredRoamingTasks({board,turn:state.turn,rand:()=>rng.next(),inBounds,
  syncTaskMarkers:()=>syncTaskMarkers(state),noteTurn:(...args)=>noteTurn(state,...args)});
 state.rngDraws=rng.checkpoint().rngDraws;
 return {state,events,moved};
}
