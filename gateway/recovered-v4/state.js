import { makeRNGFromSeed, seedFromString } from './rng.js';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, patch) {
  if (!isPlainObject(base)) return patch;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    if (isPlainObject(value) && isPlainObject(base[key])) out[key] = deepMerge(base[key], value);
    else out[key] = value;
  }
  return out;
}

export class State {
  constructor() { this.reset(); }

  makeBaseState(seedStr) {
    const seed = String(seedStr || Date.now());
    return {
      seedString: seed,
      rand: makeRNGFromSeed(seedFromString(seed)),
      turn: 0,
      level: 1,
      xp: 0,
      maxActionPoints: 3,
      actionPoints: 3,
      pos: { x: 3, y: 2 },
      currentWorld: 'EARTH_PROLOGUE',
      unlockedWorlds: ['EARTH_PROLOGUE'],
      glitchLevel: 0,
      arc: { discovery: 0, confrontation: 0, reckoning: 0 },
      progress: { veil: 0, executor: 0 },
      consequences: { council: 0, exiles: 0, keepers: 0, timeline: 0, humanity: 0 },
      quests: { council: 0, exiles: 0 },
      npcs: {
        jinx: 0,
        edgar: 0,
        caseworker: 0,
        nyx: 0,
        bananzarrr: 0,
        gatekeeper: 0,
        masterWeaver: 0,
        pathfinder: 0,
        forgeMaster: 0,
        grandWeaver: 0,
        nettie: 0,
        timbr: 0,
      },
      heat: 0,
      tags: [],
      recentTags: [],
      seenTags: [],
      storyletCounts: {},
      tagCounts: {},
      cooldowns: {},
      inventory: {},
      flags: {},
      unlockedPaths: [],
      storyMemory: {
        introQuestComplete: false,
        decisionHistory: [],
        threadCounts: {},
        pendingEchoes: [],
        npcThreads: {},
        npcMemory: {
          jinxTrust: 0,
          edgarDebt: 0,
          caseworkerSuspicion: 0,
          nyxPressure: 0,
          bananzarrrRespect: 0,
          gatekeeperTrust: 0,
          masterWeaverTrust: 0,
          pathfinderTrust: 0,
          forgeMasterTrust: 0,
          grandWeaverTrust: 0,
          nettieTrust: 0,
          timbrTrust: 0,
        },
        cellActionLock: {
          key: '',
          offeredIds: [],
          requiredIds: [],
          completedIds: [],
          lastUpdatedTurn: 0,
        },
        worldStates: {
          EARTH_PROLOGUE: 0,
          AFTERLIFE: 0,
          VEILWAY: 0,
          ARCHIVE: 0,
          BLACK_MARKET: 0,
          ODDWYN: 0,
          MYSTARA: 0,
          RIFT: 0,
          EARTH_ECHO: 0,
        },
      },
      puzzleTracks: {
        soulResonance: 0,
        lifeRecognition: 0,
        monkeyRiddles: 0,
        nyxChain: 0,
        jinxCompass: 0,
      },
      run: {
        id: null,
        name: '',
        lastSavedAt: null,
      },
    };
  }

  reset(mode) {
    const params = new URLSearchParams('');
    let seedStr = params.get('seed');
    if (mode === 'NEW' || !seedStr) seedStr = String(Date.now());
    this.state = this.makeBaseState(seedStr);
  }

  rand() { return this.state.rand ? this.state.rand() : Math.random(); }
  get(path) { return path.split('.').reduce((a, k) => a?.[k], this.state); }

  set(path, val) {
    const p = path.split('.');
    let o = this.state;
    while (p.length > 1) {
      const k = p.shift();
      o[k] = o[k] ?? {};
      o = o[k];
    }
    o[p[0]] = val;
  }

  inc(path, delta) { this.set(path, (this.get(path) ?? 0) + delta); }

  addItem(name, qty = 1) {
    this.state.inventory[name] = (this.state.inventory[name] || 0) + qty;
    if (this.state.inventory[name] <= 0) delete this.state.inventory[name];
  }

  applyEffects(effects, storylet) {
    for (const [k, v] of Object.entries(effects || {})) {
      if (k === 'loot') {
        for (const { item, qty } of v) this.addItem(item, qty || 1);
        continue;
      }
      if (k === 'cooldowns') {
        for (const [sid, turns] of Object.entries(v)) this.state.cooldowns[sid] = turns;
        continue;
      }
      if (typeof v === 'string' && /^[+-]\d+$/.test(v)) {
        this.inc(k, parseInt(v, 10));
        continue;
      }
      if (Array.isArray(v) && Array.isArray(this.get(k))) {
        const merged = [...new Set([...(this.get(k) || []), ...v])];
        this.set(k, merged);
        continue;
      }
      this.set(k, v);
    }

    for (const [item, qty] of Object.entries(this.state.inventory || {})) {
      if (Number(qty || 0) <= 0) delete this.state.inventory[item];
    }

    if (!storylet) return;

    if (storylet.cooldown) this.state.cooldowns[storylet.id] = storylet.cooldown;
    const tags = storylet.tags || [];
    for (const t of tags) {
      if (!this.state.seenTags.includes(t)) this.state.seenTags.push(t);
      this.state.recentTags.unshift(t);
      this.state.tagCounts[t] = (this.state.tagCounts[t] || 0) + 1;
    }
    this.state.recentTags = this.state.recentTags.slice(0, 6);
    this.state.storyletCounts[storylet.id] = (this.state.storyletCounts[storylet.id] || 0) + 1;
  }

  advanceTurn() {
    this.state.turn += 1;
    this.state.actionPoints = this.state.maxActionPoints;
    for (const k of Object.keys(this.state.cooldowns)) {
      this.state.cooldowns[k] = Math.max(0, (this.state.cooldowns[k] || 0) - 1);
    }
    this.state.heat = Math.max(0, (this.state.heat || 0) - 0.1);
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  hydrate(nextState) {
    if (!nextState || typeof nextState !== 'object') return false;

    const incoming = JSON.parse(JSON.stringify(nextState));
    const seed = String(incoming.seedString || this.state.seedString || Date.now());
    delete incoming.rand;

    const base = this.makeBaseState(seed);
    const merged = deepMerge(base, incoming);

    merged.seedString = seed;
    merged.rand = makeRNGFromSeed(seedFromString(seed));
    merged.maxActionPoints = Number(merged.maxActionPoints ?? 3);
    merged.actionPoints = Number(merged.actionPoints ?? merged.maxActionPoints ?? 3);

    if (!Array.isArray(merged.storyMemory?.decisionHistory)) merged.storyMemory.decisionHistory = [];
    if (!Array.isArray(merged.storyMemory?.pendingEchoes)) merged.storyMemory.pendingEchoes = [];
    if (!merged.storyMemory?.npcThreads || typeof merged.storyMemory.npcThreads !== 'object') merged.storyMemory.npcThreads = {};
    if (!merged.storyMemory?.cellActionLock || typeof merged.storyMemory.cellActionLock !== 'object') merged.storyMemory.cellActionLock = {};
    if (!Array.isArray(merged.storyMemory.cellActionLock.offeredIds)) merged.storyMemory.cellActionLock.offeredIds = [];
    if (!Array.isArray(merged.storyMemory.cellActionLock.requiredIds)) merged.storyMemory.cellActionLock.requiredIds = [];
    if (!Array.isArray(merged.storyMemory.cellActionLock.completedIds)) merged.storyMemory.cellActionLock.completedIds = [];
    merged.storyMemory.cellActionLock.key = String(merged.storyMemory.cellActionLock.key || '');
    merged.storyMemory.cellActionLock.lastUpdatedTurn = Number(merged.storyMemory.cellActionLock.lastUpdatedTurn || 0);
    if (!Array.isArray(merged.unlockedWorlds)) merged.unlockedWorlds = ['AFTERLIFE'];

    this.state = merged;
    return true;
  }
}

