// Compose verified authorities into the owner-scoped PostgreSQL repository.
// Deliberately refuses a partially ported canonical engine or incomplete world map.
import {createOwnerRunStore} from './owner-run-store.mjs';
import {createCanonicalChoicePort} from './canonical-choice-contract.mjs';
import {requirePersistedWorld} from './recovered-memory-map.mjs';
export function createTransactionalGameRuntime({pool,canonicalExecutor,authorizeChapter}) {
 const execute=createCanonicalChoicePort(canonicalExecutor);
 return createOwnerRunStore({
  pool,authorizeChapter,
  async executeCanonicalChoice(state,input,context) {
   requirePersistedWorld(state);
   const next=await execute(state,input,context);
   requirePersistedWorld(next);
   if(!next.storyMemory || !Array.isArray(next.storyMemory.decisionHistory) ||
      !Number.isSafeInteger(next.rngDraws)||next.rngDraws<Number(state.rngDraws||0))
    throw new Error('Incomplete canonical state snapshot');
   return next;
  }
 });
}
