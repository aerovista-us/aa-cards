import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveredTaskMarkerTone as tone,recoveredTaskMarkerKind as kind,recoveredTaskMobility as mobility,recoveredTaskReadiness as readiness} from '../gateway/recovered-task-rules.mjs';
test('classification follows recovered tag priorities',()=>{
 assert.equal(tone({tags:['npc','main']}),'required');
 assert.equal(tone({tags:['echo','sidequest']}),'side');
 assert.equal(kind({label:'Window 7B file',tags:['main']}),'npc');
 assert.equal(kind({tags:['office','npc']}),'desk');
 assert.equal(kind({tags:['archive']}),'archive');
 assert.equal(mobility({tags:['npc','clerks']}),'desk');
 assert.equal(mobility({tags:['npc']}),'roam');
 assert.equal(mobility({tags:[]}), 'static');
});
test('absent task and missing storylet stay blocked',()=>{
 assert.equal(readiness({task:null}).ready,false);
 assert.equal(readiness({task:{id:'x'},storylet:null}).ready,false);
});
test('earlier outstanding planned desk blocks later planned desk',()=>{
 const prior={id:'desk_a',order:0,planned:true,completed:false};
 const later={id:'desk_b',order:1,planned:true,completed:false};
 const r=readiness({task:later,board:{tasks:[later,prior]},storylet:{id:'desk_b'},conditionOk:()=>true,resolveStorylet:id=>({id,label:'First Counter'})});
 assert.equal(r.ready,false);assert.equal(r.blocker,prior);assert.match(r.reason,/First Counter/);
});
test('completed or nonplanned earlier task does not block',()=>{
 const task={id:'b',order:1,planned:true};
 const r=readiness({task,board:{tasks:[{id:'a',order:0,planned:true,completed:true},{id:'x',order:0,planned:false}]},storylet:{id:'b'},conditionOk:()=>true});
 assert.equal(r.ready,true);
});
test('conditions are evaluated by caller canonical engine',()=>{
 const r=readiness({task:{id:'a'},board:{tasks:[]},storylet:{id:'a',when:{flag:'x'}},conditionOk:()=>false});
 assert.equal(r.ready,false);assert.match(r.reason,/prerequisite/);
 assert.throws(()=>readiness({task:{id:'a'},storylet:{id:'a'}}),/Canonical condition/);
});
