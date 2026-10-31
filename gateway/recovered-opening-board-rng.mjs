// Server-owned RNG boundary for bounded Afterlife board composition.
// This function is not an authenticated opening-transaction endpoint.
import {createPersistentRng} from './persistent-rng.mjs';
import {setupRecoveredOpeningBoard} from './recovered-opening-board-setup.mjs';
export function setupRecoveredOpeningBoardWithRng(saved,options={}) {
 if(Object.hasOwn(options,'rand'))throw new TypeError('Caller RNG overrides are prohibited');
 const rng=createPersistentRng(saved);
 const result=setupRecoveredOpeningBoard(saved,{...options,rand:()=>rng.next()});
 result.state.rngDraws=rng.checkpoint().rngDraws;
 return result;
}
