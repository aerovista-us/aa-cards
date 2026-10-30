// M18 bridge for the recovered v4 Director's authoritative scoring behavior.
// This is a bounded adapter, NOT a full session or transaction executor.
// Source: recovered-v4/director.js as restored from original game.
import {Director} from './recovered-v4/director.js';
import {renderTemplate} from './recovered-v4/text.js';
import {selectRecoveredBoardCandidates} from './recovered-task-candidates.mjs';
export function selectRecoveredBoardCandidatesWithDirector({state,tile,library,plannedIds,ambientIds,readyEchoes,priorityIds,conditionOk,memoryScore,limit=12}) {
 if(!state||typeof state!=='object'||!tile||!Array.isArray(tile.tags)) throw new TypeError('Canonical state and current tile required');
 if(typeof conditionOk!=='function'||typeof memoryScore!=='function')throw new TypeError('Canonical app condition and memory evaluators required');
 // Original Director.score reads stateRef.state; no RNG or world mutation.
 const director=new Director({state}, {currentTile:()=>tile}, {availableOnCurrent:()=>false});
 director.library=library;
 return selectRecoveredBoardCandidates({
  state,tile,library,plannedIds,ambientIds,readyEchoes,priorityIds,
  conditionOk,score:sl=>director.score(sl),memoryScore,renderTemplate,limit
 });
}
