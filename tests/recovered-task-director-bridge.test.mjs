import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRecoveredBoardCandidatesWithDirector as select} from '../gateway/recovered-task-director-bridge.mjs';
const state={currentWorld:'AFTERLIFE',flags:{officeOnboardComplete:true},arc:{discovery:0,confrontation:0,reckoning:0},progress:{veil:0,executor:0},turn:2,heat:0,tagCounts:{},recentTags:[],storyletCounts:{},cooldowns:{}};
const base=()=>({state:structuredClone(state),tile:{tags:['office']},library:[{id:'a',label:'A',weight:1,tags:['npc']},{id:'b',label:'B',weight:3,tags:[]}],plannedIds:[],ambientIds:[],readyEchoes:[],priorityIds:[],conditionOk:()=>true,memoryScore:()=>0});
test('uses real recovered Director.score rather than arbitrary stub',()=>{assert.deepEqual(select(base()).map(s=>s.id),['b','a']);});
test('planned tasks retain canonical priority over high score',()=>{const c=base();c.plannedIds=['a'];assert.deepEqual(select(c).map(s=>s.id),['a','b']);});
test('reject missing source condition or memory evaluator',()=>{const c=base();delete c.conditionOk;assert.throws(()=>select(c),/Canonical app condition/);});
