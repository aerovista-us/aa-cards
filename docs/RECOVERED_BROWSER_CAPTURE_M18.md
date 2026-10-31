# M18 independent recovered-browser capture procedure (NOT YET EXECUTED)

The recovered `/srv/ACOS/workspaces/ascension/app/js/main.js` exposes `window.__ASCENSION_APP__` **only on localhost or 127.0.0.1**. Its `saveRun()` uses `this.state.snapshot()` and `this.captureMapSnapshot()` as **two separate persisted payloads**. The recovered workspace currently has no `scripts/` directory despite package.json referencing `first-hour-smoke.mjs`. Do not claim an automated original-game capture exists.

To capture from an **isolated, nonproduction browser session** at the known recovered checkpoint, open DevTools and run the following. Use exactly the same scenario, seed and checkpoint in the independent modern-gateway capture. It generates a local downloadable JSON file; it does not call `saveRun` or write to the game database.

```js
const app = window.__ASCENSION_APP__;
if (!app?.state?.snapshot || !app?.captureMapSnapshot) throw Error('Recovered localhost app unavailable');
const scenario = 'earth-to-office-first-hour';
const checkpoint = 'after-required-tasks-and-end-turn';
const state = app.state.snapshot();
const map = structuredClone(app.captureMapSnapshot());
const capture = {
  provenance: {
    origin: 'recovered-browser', captureId: crypto.randomUUID(),
    scenario, seed: String(state.seedString), checkpoint,
    source: 'recovered/js/app.js:saveRun + captureMapSnapshot'
  },
  state,
  map
};
const blob = new Blob([JSON.stringify(capture,null,2)],{type:'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href=url;a.download=`recovered-${checkpoint}.json`;a.click();
setTimeout(()=>URL.revokeObjectURL(url),1000);
```

**Do not treat this raw capture as parity-ready.** The original save has `{state,map}` while the modern gateway uses `state.worldMap` and may have different representation of presentation-only map fields. Establish a source-backed, lossless schema adapter and explicit RNG behavior before declaring equivalence; never simply drop mismatched fields. The `verify-recovered-parity.mjs` helper now REQUIRES and compares both `state` and `map` independently; a different save-schema representation will intentionally fail until source-backed parity is established.

The restored source also includes localhost-only `__ASCENSION_APP__` access; capture provenance does not itself prove a capture was made in an independently executed browser. Actual evidence must include scenario inputs, original source SHA, execution log and separate modern-gateway execution.
