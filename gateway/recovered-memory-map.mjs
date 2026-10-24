// Server-only persistence preparation. No claim of complete game parity.
export function recordRecoveredDecisionMemory(state,storylet,choice,outcome,before,after) {
 const memory=state.storyMemory??={};
 memory.decisionHistory??=[];memory.threadCounts??={};memory.worldStates??={};
 const tags=storylet.tags||[];
 const changes=['council','exiles','timeline'].map(k=>[k,Number(after[k]||0)-Number(before[k]||0)]);
 const summary=changes.filter(([,n])=>n!==0).map(([k,n])=>k[0].toUpperCase()+k.slice(1)+' '+(n>0?'+':'')+n).join(', ')||'No public drift';
 memory.decisionHistory.push({turn:state.turn||0,world:state.currentWorld,storyletId:storylet.id,choiceId:choice.id,
  outcomeKey:outcome.resultEvent||null,tags,summary});
 memory.decisionHistory=memory.decisionHistory.slice(-80);
 for(const tag of tags)memory.threadCounts[tag]=Number(memory.threadCounts[tag]||0)+1;
 const drift=changes.reduce((n,[,v])=>n+Math.abs(v),0);
 memory.worldStates[state.currentWorld]=Number(memory.worldStates[state.currentWorld]||0)+drift;
 return memory;
}
export function snapshotRecoveredMap(world) {
 if(!world||!Array.isArray(world.tiles)||!Number.isSafeInteger(world.width)||!Number.isSafeInteger(world.height)
    ||world.width<1||world.height<1||world.tiles.length!==world.width*world.height)
  throw new TypeError('Canonical map tiles and dimensions required');
 const copy=structuredClone(world);
 for(const tile of copy.tiles) {
  if(!tile||!Array.isArray(tile.spawns||[])) throw new TypeError('Invalid persisted spawn tile');
  for(const spawn of tile.spawns||[]) {
   if(!Number.isSafeInteger(spawn.charges)||!Number.isSafeInteger(spawn.cooldown)||!Number.isSafeInteger(spawn.respawn))
    throw new TypeError('Invalid spawn persistence');
  }
 }
 return copy;
}
export function requirePersistedWorld(state) {
 if(!state?.worldMap) throw new Error('Missing authoritative world map: cannot commit choice');
 snapshotRecoveredMap(state.worldMap);
 return state;
}
