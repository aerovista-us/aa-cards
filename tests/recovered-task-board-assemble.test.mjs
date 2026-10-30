import test from 'node:test';import assert from 'node:assert/strict';
import {assembleRecoveredWorldBoard as assemble} from '../gateway/recovered-task-board-assemble.mjs';
const ctx=()=>{let draws=0;const state={currentWorld:'AFTERLIFE',turn:2,storyMemory:{worldTaskBoard:{}}};return {state,key:'office-key',candidates:[{id:'office.intake_briefing',tags:['main'],planned:true}],cells:[{x:0,y:0},{x:1,y:0}],rand:()=>{draws++;return 0;},getDraws:()=>draws,
 fixedStation:()=>({x:1,y:0,ticket:'A-001',station:'Counter'}),characterForStorylet:()=>({characterKey:'caseworker'}),isOfficeIntakeWorld:true,fixtureForCell:()=>null,tileTagsAt:()=>[],inBounds:()=>true};};
test('full board task shape preserves canonical metadata',()=>{const c=ctx(),b=assemble(c);assert.equal(b.tasks[0].required,true);assert.equal(b.tasks[0].ticket,'A-001');assert.equal(b.tasks[0].characterKey,'caseworker');assert.equal(b.tasks[0].homeX,1);assert.equal(c.getDraws(),1);});
test('same-key complete board reuses source object and draws no new RNG',()=>{const c=ctx(),one=assemble(c),n=c.getDraws();assert.strictEqual(assemble(c),one);assert.equal(c.getDraws(),n);});
test('rebuild preserves completion for matching task id',()=>{const c=ctx();c.state.storyMemory.worldTaskBoard.AFTERLIFE={key:'old',tasks:[{id:'office.intake_briefing',completed:true}]};assert.equal(assemble(c).tasks[0].completed,true);});
test('same-key missing candidate fails closed rather than approximating append',()=>{const c=ctx();c.state.storyMemory.worldTaskBoard.AFTERLIFE={key:c.key,tasks:[]};assert.throws(()=>assemble(c),/unported_task_board_append/);});
test('empty map yields board without RNG draws',()=>{const c=ctx();c.cells=[];assert.equal(assemble(c).tasks.length,0);assert.equal(c.getDraws(),0);});
