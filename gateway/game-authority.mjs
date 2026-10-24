// Reference integration seam for the authoritative Ascension Director.
// Server only. Not mounted on static GitHub Pages or the legacy /api/runs API.
// All collaborators MUST be production implementations before enabling gameplay.
export class GameRequestError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const deny = (status, code) => { throw new GameRequestError(status, code); };
const id = x => typeof x === 'string' && x.length > 0 && x.length <= 160 && /^[a-zA-Z0-9:_-]+$/.test(x);
export function validateChoice(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !id(input.sessionId) || !((typeof input.storyletId === 'string') && /^[a-zA-Z0-9:_.-]{1,160}$/.test(input.storyletId)) || !id(input.choiceId) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) deny(422, 'invalid_choice');
  return { sessionId: input.sessionId, storyletId: input.storyletId,
    choiceId: input.choiceId, expectedRevision: input.expectedRevision };
}
function requireServices(services) {
  for (const name of ['resolveIdentity', 'canPlay', 'loadOwnedRun', 'executeChoice', 'presentState'])
    if (typeof services?.[name] !== 'function') throw new Error('Missing game gateway dependency: ' + name);
}
async function authorize(services, request) {
  const identity = await services.resolveIdentity(request);
  if (!identity?.subject || typeof identity.subject !== 'string') deny(401, 'authentication_required');
  if (await services.canPlay(identity, request) !== true) deny(403, 'game_access_denied');
  return identity;
}
// loadOwnedRun is required to enforce run ownership from the resolved identity.
// It MUST NOT accept a player identity supplied by the browser.
export function createAuthoritativeGameGateway(services) {
  requireServices(services);
  return Object.freeze({
    async session(request) {
      const identity = await authorize(services, request);
      const run = await services.loadOwnedRun(identity, null);
      if (!run) deny(404, 'run_not_found');
      return services.presentState(identity, run);
    },
    async choice(request, body) {
      const input = validateChoice(body);
      const identity = await authorize(services, request);
      const run = await services.loadOwnedRun(identity, input.sessionId);
      if (!run) deny(404, 'run_not_found');
      if (run.id !== input.sessionId) deny(403, 'run_mismatch');
      if (run.revision !== input.expectedRevision) deny(409, 'stale_revision');
      // executeChoice MUST atomically recheck owner, revision, entitlement,
      // storylet eligibility and AP within its transaction/serialized lock.
      // It must execute the canonical Director, not trust client outcomes.
      // A duplicate revision MUST be rejected without applying another turn.
      const committed = await services.executeChoice(identity, run, input);
      if (!committed || !Number.isSafeInteger(committed.revision) ||
          committed.revision !== input.expectedRevision + 1) deny(503, 'invalid_game_commit');
      return services.presentState(identity, committed);
    }
  });
}
