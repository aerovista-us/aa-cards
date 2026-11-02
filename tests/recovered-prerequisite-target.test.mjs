import test from 'node:test';import assert from 'node:assert/strict';
import {recoveredPrerequisiteDeskTarget as target} from '../gateway/recovered-prerequisite-target.mjs';
const state=()=>({currentWorld:'AFTERLIFE',storyMemory:{worldTaskBoard:{AFTERLIFE:{tasks:[{x:2,y:2,order:2,planned:true,completed:false},{x:1,y:1,order:1,planned:true,completed:false},{x:0,y:0,order:0,planned:true,completed:true}]}}}});
test('original planned ordering excludes completed tasks',()=>{assert.deepEqual(target(state(),{blockedTasks:()=>[]}),{x:1,y:1})});
test('original blocked task target outranks planned task target',()=>{assert.deepEqual(target(state(),{blockedTasks:()=>[{status:{blocker:{x:7,y:8}}}]}),{x:7,y:8})});
test('returns null only when no blocked or pending planned task remains',()=>{const s=state();s.storyMemory.worldTaskBoard.AFTERLIFE.tasks.forEach(t=>t.completed=true);assert.equal(target(s,{blockedTasks:()=>[]}),null)});
test('refuses missing canonical blocked or board authority',()=>{assert.throws(()=>target(state(),{}),/resolver/);assert.throws(()=>target(state(),{blockedTasks:()=>null}),/rows/);const s=state();delete s.storyMemory.worldTaskBoard.AFTERLIFE;assert.throws(()=>target(s,{blockedTasks:()=>[]}),/board/)});
