import test from 'node:test';import assert from 'node:assert/strict';
import {recoveredAppConditionOk as cond,recoveredStoryletMemoryScore as memory} from '../gateway/recovered-task-canonical-context.mjs';
test('conditions preserve nested paths and comparisons',()=>{
 assert.equal(cond({flags:{ready:true},heat:4},{'flags.ready':true,heat:{'>=':4,'<':5}}),true);
 assert.equal(cond({heat:3},{heat:{'>=':4}}),false);
 assert.equal(cond({flags:{}},{'flags.ready':true}),false);
});
test('memory score is inactive before intro completion',()=>{
 assert.equal(memory({turn:5,storyMemory:{threadCounts:{main:5}}},{tags:['main'],progressor:true}),0);
});
test('story memory counts, cap and bonuses match original',()=>{
 const s={turn:4,flags:{mainIntroQuestComplete:true},storyMemory:{threadCounts:{main:10,sidequest:2}}};
 assert.equal(memory(s,{tags:['main'],progressor:true}),0.95);
 assert.equal(memory(s,{tags:['sidequest']}),0.42000000000000004);
});
