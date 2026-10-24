// Presentation-only scene contract for authoritative Ascension responses.
// This module never rolls stats, mutates saves, or authorizes choices.
export const SCENE_KINDS = Object.freeze(['narrative','dialogue','decision','encounter','stat-generator','case-worker','rolodex','consequence','glitch']);
const kinds = new Set(SCENE_KINDS);
const safe = (value, limit=4000) => typeof value === 'string' ? value.slice(0,limit) : '';
const id = value => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(value);
export function projectSceneCard(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Scene object required');
  if (!id(input.id)) throw new TypeError('Valid scene ID required');
  const kind = kinds.has(input.kind) ? input.kind : 'narrative';
  const choices = Array.isArray(input.choices) ? input.choices : [];
  if (choices.length > 16) throw new TypeError('Too many visible choices');
  const normalized = choices.map(choice => {
    if (!id(choice?.id) || typeof choice?.label !== 'string' || !choice.label.trim())
      throw new TypeError('Invalid visible choice');
    return Object.freeze({id:choice.id,label:safe(choice.label,180),enabled:choice.enabled === true});
  });
  return Object.freeze({
    id:input.id,kind,title:safe(input.title,180),body:safe(input.body),
    speaker:safe(input.speaker,100),sceneLabel:safe(input.sceneLabel,100),
    // Supplied only as player-visible server projection; no hidden gates/outcomes.
    choices:Object.freeze(normalized),
    status:safe(input.status,160)
  });
}
export function projectVisibleGameScene(response) {
  if (!response || !id(response.sessionId) || !Number.isSafeInteger(response.revision) || response.revision<0)
    throw new TypeError('Invalid authoritative session envelope');
  const scene=projectSceneCard(response.state?.scene);
  return Object.freeze({sessionId:response.sessionId,revision:response.revision,scene});
}
