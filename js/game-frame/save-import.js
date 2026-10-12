// Ascension Cards read-only save importer. No network calls, uploads or storage.
import { projectGameFrame } from './adapter.js';

export function parseAscensionExport(text) {
  if (typeof text !== 'string' || text.length > 5_000_000) throw new Error('Save file must be text under 5 MB');
  const json = JSON.parse(text);
  const run = json?.run?.state ? json.run : json?.state ? json : null;
  if (!run || typeof run.state !== 'object' || Array.isArray(run.state)) throw new Error('This is not an Ascension run export');
  const state = run.state;
  if (typeof state.currentWorld !== 'string' || !Number.isFinite(Number(state.actionPoints))) throw new Error('Missing Ascension world or action points');
  return projectGameFrame(run, null);
}

export function renderImportedRecord(frame, documentRoot = document) {
  const value = (id, text) => { const el = documentRoot.getElementById(id); if (el) el.textContent = String(text); };
  const c = frame.character;
  value('person', c.name + ' · Imported Record');
  value('story-title', 'Saved Soul Record');
  value('story-text', 'This is an offline, read-only view of an imported Ascension save. To continue gameplay, return to your original game.');
  value('flags', frame.flags.join(', ') || 'None recorded');
  value('inventory', frame.inventory.map(item => item.name + ' × ' + item.count).join(', ') || 'Empty');
  value('companions', frame.companions.map(item => item.name + ' (' + item.standing + ')').join(', ') || 'No associates');
  const metrics = documentRoot.getElementById('metrics');
  const details = documentRoot.getElementById('sheet-metrics');
  if (metrics) metrics.replaceChildren();
  if (details) details.replaceChildren();
  for (const [name, val] of [['Level',c.level],['Action points',c.actionPoints+'/'+c.maximumActionPoints],['Glitch',c.glitch],['Heat',c.heat],['Realm',c.location],['Turn',frame.turn]]) {
    if (metrics) { const row=documentRoot.createElement('div');row.className='metric';const label=documentRoot.createElement('span');label.textContent=name;const strong=documentRoot.createElement('strong');strong.textContent=val;row.append(label,strong);metrics.append(row); }
    if (details) { const cell=documentRoot.createElement('div');const dt=documentRoot.createElement('dt');dt.textContent=name;const dd=documentRoot.createElement('dd');dd.textContent=val;cell.append(dt,dd);details.append(cell); }
  }
  const choices=documentRoot.getElementById('choices');
  if (choices) choices.replaceChildren();
}
