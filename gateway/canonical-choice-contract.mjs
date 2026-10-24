// Fail-closed contract for porting the recovered browser choice lifecycle.
// A provider must implement *all* canonical mechanics in one server transaction.
// This is intentionally NOT a replacement rules engine.
export const CANONICAL_CHOICE_STAGES = Object.freeze([
  'eligibility','actionCost','spawnConsumption','outcomeRoll','stateEffects',
  'pendingEcho','experience','choiceMemory','npcMemory','worldUnlocks',
  'requiredThread','actionPointSpend','turnTransition','aftershock','snapshot'
]);
export function assertCanonicalExecutor(executor) {
  if (!executor || typeof executor.execute !== 'function' ||
      executor.authority !== 'recovered-ascension-v4' ||
      !Array.isArray(executor.implementedStages) ||
      CANONICAL_CHOICE_STAGES.some(stage => !executor.implementedStages.includes(stage))) {
    throw new Error('Full canonical choice lifecycle unavailable; gameplay must remain disabled');
  }
  if (executor.persistentRng !== true || executor.atomicRevisionCommit !== true)
    throw new Error('Persistent RNG and atomic revision commit required');
  return executor;
}
export function createCanonicalChoicePort(executor) {
  const bound=assertCanonicalExecutor(executor);
  return async function executeCanonicalChoice(state, input, context) {
    if (!context?.identity?.subject || !context?.client)
      throw new Error('Verified identity and transactional database client required');
    const result=await bound.execute(structuredClone(state),input,context);
    if (!result?.state || typeof result.state !== 'object' ||
        !Number.isSafeInteger(result.turn) || result.turn < 0 ||
        !result.rngCheckpoint || typeof result.rngCheckpoint !== 'object')
      throw new Error('Invalid canonical execution result');
    // The run store expects the full authoritative state. No browser claims.
    return result.state;
  };
}
