// Authenticated Cards controller. Never mutates canonical game state locally.
// The production app must supply a verified HTTPS API origin and server-side session.
import { requestGameState, submitGameChoice } from './remote-api.js';
import { projectVisibleGameScene } from './scene-cards.js';

export class CardsSessionError extends Error {
  constructor(code, cause) { super(code); this.name = 'CardsSessionError'; this.code = code; this.cause = cause; }
}

export function createCardsSessionController({ apiOrigin, onChange = () => {}, remote = { requestGameState, submitGameChoice } }) {
  if (typeof apiOrigin !== 'string' || !apiOrigin) throw new TypeError('Trusted game API origin required');
  if (typeof onChange !== 'function') throw new TypeError('onChange must be a function');
  let snapshot = Object.freeze({ status: 'idle', game: null, error: null });
  let inFlight = false;
  const emit = (status, game = snapshot.game, error = null) => {
    snapshot = Object.freeze({ status, game, error });
    onChange(snapshot);
    return snapshot;
  };
  const categorize = error => {
    const message = String(error?.message || '');
    if (/\(401\)/.test(message)) return 'sign_in_required';
    if (/\(403\)/.test(message)) return 'access_denied';
    if (/\b409\b|Game changed/.test(message)) return 'stale_revision';
    return 'service_unavailable';
  };
  async function load() {
    if (inFlight) throw new CardsSessionError('request_in_progress');
    inFlight = true;
    emit('loading', null);
    try {
      const response = await remote.requestGameState(apiOrigin);
      return emit('ready', projectVisibleGameScene(response));
    } catch (error) {
      emit('error', null, categorize(error));
      throw new CardsSessionError(snapshot.error, error);
    } finally {
      inFlight = false;
    }
  }
  async function choose(choiceId) {
    if (inFlight) throw new CardsSessionError('request_in_progress');
    const current = snapshot.game;
    if (snapshot.status !== 'ready' || !current) throw new CardsSessionError('game_not_ready');
    const choice = current.scene.choices.find(c => c.id === choiceId && c.enabled);
    if (!choice) throw new CardsSessionError('choice_unavailable');
    inFlight = true;
    emit('submitting');
    try {
      const payload = await remote.submitGameChoice(apiOrigin, {
        sessionId: current.sessionId, storyletId: current.scene.id,
        choiceId, revision: current.revision
      });
      return emit('ready', projectVisibleGameScene(payload));
    } catch (error) {
      const code = categorize(error);
      // A stale action must never be retried as an additional turn.
      // Clear stale state and require an explicit refresh from the server.
      emit('error', code === 'stale_revision' ? null : current, code);
      throw new CardsSessionError(code, error);
    } finally {
      inFlight = false;
    }
  }
  return Object.freeze({load, choose, getSnapshot: () => snapshot});
}
