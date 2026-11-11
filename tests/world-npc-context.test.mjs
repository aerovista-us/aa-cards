import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleWorldNpcContext} from '../gateway/npc-world-context.mjs';
import {createOfficeRun} from '../gateway/world-interaction-engine.mjs';
import {walkState,completeState,enterHallwayState} from './support/office-journey.mjs';
const run=createOfficeRun({ownerId:'fixture-npc-owner',runId:'fixture-npc-run',seedString:'private-fixture-seed'});
const context=state=>visibleWorldNpcContext({subject:state.ownerId},{id:state.runId,revision:state.revision,state});
test('only an offered nearby NPC gets sanitized committed world facts',()=>{
 assert.equal(context(run),null);
 const s=walkState(completeState(run),'caseworker'),c=context(s);assert.equal(c.npcId,'caseworker');assert.ok(c.facts.some(x=>x.includes('Filed placement')));
 const json=JSON.stringify(c);for(const hidden of ['private-fixture-seed','fixture-npc-owner','rngDraws','npcMemory','consequences'])assert.equal(json.includes(hidden),false);
 const h=walkState(enterHallwayState(s),'attendant');assert.equal(context(h).npcId,'attendant');
 assert.throws(()=>visibleWorldNpcContext({subject:'other'},{id:s.runId,revision:s.revision,state:s}),e=>e.status===404);
});
