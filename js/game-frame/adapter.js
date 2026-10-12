// Game Frame v1: read-only projection of the authoritative Ascension run.
// No Woodsman mechanics, random rolls, saves or mutable game state are introduced.
const label = value => String(value ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const asObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function projectGameFrame(run, storylet = null) {
  const state = asObject(run?.state ?? run);
  const story = asObject(storylet);
  const world = String(state.currentWorld || 'UNKNOWN');
  const choices = Array.isArray(story.choices) ? story.choices : [];
  return {
    version: 1,
    character: {
      id: 'billy',
      name: 'Billy',
      level: safeNumber(state.level),
      experience: safeNumber(state.xp),
      actionPoints: safeNumber(state.actionPoints),
      maximumActionPoints: safeNumber(state.maxActionPoints),
      glitch: safeNumber(state.glitchLevel),
      heat: safeNumber(state.heat),
      location: label(world),
      worldId: world
    },
    storylet: story.id ? {
      id: String(story.id),
      title: String(story.title ?? story.label ?? 'Untitled record'),
      text: String(story.text ?? story.body ?? ''),
      choices: choices.map((choice, index) => ({
        id: String(choice.id ?? index),
        index,
        label: String(choice.label ?? choice.text ?? `Choice ${index + 1}`)
      }))
    } : null,
    companions: Object.entries(asObject(state.npcs)).map(([id, standing]) => ({
      id, name: label(id), standing: safeNumber(standing)
    })),
    inventory: Object.entries(asObject(state.inventory)).filter(([,count]) => safeNumber(count) > 0).map(([id,count]) => ({
      id, name: label(id), count: safeNumber(count)
    })),
    flags: Object.keys(asObject(state.flags)).filter(key => state.flags[key] === true),
    turn: safeNumber(state.turn)
  };
}

// The runtime supplies the canonical action handler. Never directly apply
// choice.effects here: that belongs to the existing Director/state pipeline.
export function createGameFrameAdapter({ getRun, getStorylet, choose }) {
  if (typeof getRun !== 'function' || typeof getStorylet !== 'function' || typeof choose !== 'function') {
    throw new TypeError('Game Frame requires getRun, getStorylet and choose callbacks');
  }
  return Object.freeze({
    snapshot() { return projectGameFrame(getRun(), getStorylet()); },
    choose(storyletId, choiceId) {
      const current = projectGameFrame(getRun(), getStorylet());
      if (!current.storylet || current.storylet.id !== String(storyletId)) {
        throw new Error('Storylet changed: refresh before choosing');
      }
      const choice = current.storylet.choices.find(item => item.id === String(choiceId));
      if (!choice) throw new Error('Unknown or stale choice');
      return choose({ storyletId: current.storylet.id, choiceIndex: choice.index, choiceId: choice.id });
    }
  });
}
