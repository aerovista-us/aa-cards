// LIMITED canonical source-derived transactional choice sequence.
// Not a complete game executor: unsupported overlay, map, required-thread and
// prologue transitions deliberately reject instead of silently diverging.
import {State} from './recovered-v4/state.js';
import {Director} from './recovered-v4/director.js';
import {createPersistentRng} from './persistent-rng.mjs';
import {rollRecoveredOutcome,grantRecoveredXp,spendRecoveredAp} from './recovered-choice-primitives.mjs';
import {recordRecoveredDecisionMemory,requirePersistedWorld} from './recovered-memory-map.mjs';
import {advanceRecoveredNpcMemory} from './recovered-npc-memory.mjs';
import {queueCanonicalRecoveredEcho} from './recovered-specialized-echo.mjs';
import {resolveRecoveredEcho,unlockRecoveredWorlds,recoveredAftershock} from './recovered-world-echo.mjs';
import {consumeRecoveredSpawn,grantRecoveredSpawnReward} from './recovered-spawn-turn.mjs';
import {createOwnerRunStore} from './owner-run-store.mjs';
const consequences=s=>Object.fromEntries(['council','exiles','keepers','timeline','humanity'].map(k=>[k,s.consequences?.[k]||0]));
export function createBoundedRecoveredChoiceExecutor({library,pool,authorizeChapter}) {
 if(!Array.isArray(library)||!pool)throw new TypeError('Canonical story library and pool required');
 async function executeCanonicalChoice(saved,input) {
  requirePersistedWorld(saved);
  const engine=new State();engine.hydrate(saved);
  const rng=createPersistentRng({seedString:saved.seedString,rngDraws:saved.rngDraws??0});
  engine.state.rand=()=>rng.next();
  const state=engine.state;
  const map=structuredClone(saved.worldMap);
  const tile=map.tiles[state.pos.y*map.width+state.pos.x];
  if(!tile)throw new Error('Canonical player tile not found');
  const director=new Director(engine,{currentTile:()=>tile},{availableOnCurrent:type=>(tile.spawns||[]).some(s=>s.type===type&&s.charges>0)});
  director.library=library;
  const storylet=director.eligible().find(s=>s.id===input.storyletId);
  if(!storylet)throw Object.assign(new Error('ineligible_storylet'),{status:422});
  const choice=storylet.choices?.find(c=>c.id===input.choiceId);
  if(!choice)throw Object.assign(new Error('invalid_choice'),{status:422});
  // The recovered UI gives these paths additional special choreography that is
  // not yet source-ported. Never enable such choices with incomplete effects.
  if(storylet.cutscene||choice.cutscene||['EARTH_PROLOGUE'].includes(state.currentWorld))
   throw Object.assign(new Error('unported_story_choreography'),{status:422});
  const cost=choice.actionCost||1;
  if((state.actionPoints||0)<cost)throw Object.assign(new Error('insufficient_action_points'),{status:422});
  const before=consequences(state);
  if(choice.spawnConsume&&consumeRecoveredSpawn(tile,choice.spawnConsume))grantRecoveredSpawnReward(state,choice.spawnConsume,storylet,rng);
  const outcome=rollRecoveredOutcome(choice,storylet,state,rng);
  engine.applyEffects(outcome.effects,storylet);
  resolveRecoveredEcho(state,storylet.id);
  grantRecoveredXp(state,1+(storylet.progressor?1:0)+(storylet.tags||[]).includes('npc'));
  unlockRecoveredWorlds(state);
  const after=consequences(state);
  recordRecoveredDecisionMemory(state,storylet,choice,outcome,before,after);
  advanceRecoveredNpcMemory(state,storylet,choice,outcome);
  queueCanonicalRecoveredEcho(state,storylet,choice,outcome,before,after,rng);
  // Full turn-end, required cell locks and narrative-specific callbacks are
  // not ported; refuse choices requiring those transitions.
  if(cost>=state.actionPoints || storylet.progressor || (storylet.tags||[]).includes('onboarding'))
   throw Object.assign(new Error('unported_turn_or_story_progression'),{status:422});
  spendRecoveredAp(state,choice);
  recoveredAftershock(state,rng,{storyInfluenceEnabled:!!(state.storyMemory?.introQuestComplete||state.flags?.mainIntroQuestComplete)});
  const next=engine.snapshot();next.rngDraws=rng.checkpoint().rngDraws;next.worldMap=map;
  requirePersistedWorld(next);return next;
 }
 return createOwnerRunStore({pool,authorizeChapter,executeCanonicalChoice});
}
