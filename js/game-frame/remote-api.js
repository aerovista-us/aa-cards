// Ascension Cards remote bridge — disabled unless an explicitly trusted API
// origin is configured. This client never holds shared secrets or applies rules.
const allowed = new Set(['https:']);
export function validateApiOrigin(raw, pageOrigin = globalThis.location?.origin) {
  const url = new URL(raw);
  if (!allowed.has(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('API endpoint must be an HTTPS origin');
  if (pageOrigin && url.origin === pageOrigin) throw new Error('Use the separate authorized game API, not this static preview');
  return url.origin;
}
export async function requestGameState(apiOrigin, { signal } = {}) {
  const origin = validateApiOrigin(apiOrigin);
  const response = await fetch(origin + '/v1/game/session', { credentials: 'include', cache: 'no-store', signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Game session unavailable (' + response.status + ')');
  const payload = await response.json();
  if (!payload || !payload.state || typeof payload.state !== 'object' || !payload.sessionId) throw new Error('Invalid game session response');
  return payload;
}
export async function submitGameChoice(apiOrigin, { sessionId, storyletId, choiceId, revision }, { signal } = {}) {
  const origin = validateApiOrigin(apiOrigin);
  if (![sessionId, storyletId, choiceId].every(v => typeof v === 'string' && v.length > 0 && v.length < 200) || !Number.isSafeInteger(revision) || revision < 0) throw new TypeError('Invalid choice request');
  const response = await fetch(origin + '/v1/game/choices', {
    method: 'POST', credentials: 'include', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sessionId, storyletId, choiceId, expectedRevision: revision })
  });
  if (response.status === 409) throw new Error('Game changed: refresh current session before choosing');
  if (!response.ok) throw new Error('Choice rejected (' + response.status + ')');
  const payload = await response.json();
  if (!payload || !payload.state || !Number.isSafeInteger(payload.revision)) throw new Error('Invalid choice result');
  return payload;
}
