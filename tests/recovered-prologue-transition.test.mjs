import test from 'node:test';
import assert from 'node:assert/strict';
import {transitionRecoveredPrologue} from '../gateway/recovered-prologue-transition.mjs';
import {buildRecoveredWorldMap} from '../gateway/recovered-map-builder.mjs';
import {completeRecoveredEarthPrologue} from '../gateway/recovered-opening-turn.mjs';
const afterlife={id:'AFTERLIFE',map:{shape:'office',w:12,h:10},tags:['clerks','rest','archive']};
const base=()=>({seedString:'Billy-prologue',rngDraws:7,currentWorld:'EARTH_PROLOGUE',pos:{x:3,y:2},
 flags:{earthPrologueDead:true},turn:0,actionPoints:0,maxActionPoints:3,heat:0,
 unlockedWorlds:['EARTH_PROLOGUE'],storyMemory:{decisionHistory:[],pendingEchoes:[]},pendingCutscenes:['intro']});
test('prologue transition combines source state, canonical map and cutscene order',()=>{
 const original=base(),expected=structuredClone(original);
 const directive=completeRecoveredEarthPrologue(expected);
 const map=buildRecoveredWorldMap(expected,afterlife);
 map.pendingCutscenes=['intro',...directive.cutscenes];
 const outcome=transitionRecoveredPrologue(original,afterlife);
 assert.equal(outcome.transitioned,true);
 assert.deepEqual(outcome.state,map);
 assert.deepEqual(original,base()); // caller state remains immutable
 assert.equal(outcome.state.currentWorld,'AFTERLIFE');
 assert.deepEqual(outcome.state.pendingCutscenes,['intro','deathWake','officeIntake','floorTutorial']);
});
test('transition is one-shot and retains RNG and cutscene state on reload',()=>{
 const first=transitionRecoveredPrologue(base(),afterlife);
 const saved=JSON.parse(JSON.stringify(first.state));
 const second=transitionRecoveredPrologue(saved,afterlife);
 assert.equal(second.transitioned,false);
 assert.deepEqual(second.state,saved);
 assert.equal(second.state.rngDraws,first.state.rngDraws);
});
test('not-dead Earth prologue does not regenerate map or consume RNG',()=>{
 const saved=base();saved.flags.earthPrologueDead=false;
 const outcome=transitionRecoveredPrologue(saved,afterlife);
 assert.equal(outcome.transitioned,false);assert.deepEqual(outcome.state,saved);
});
test('requires trusted Afterlife profile',()=>{
 assert.throws(()=>transitionRecoveredPrologue(base(),{id:'RIFT'}),/canonical/i);
});
