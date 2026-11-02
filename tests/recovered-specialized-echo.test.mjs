import test from 'node:test';
import assert from 'node:assert/strict';
import {queueCanonicalRecoveredEcho} from '../gateway/recovered-specialized-echo.mjs';
const base=()=>({turn:3,currentWorld:'AFTERLIFE',flags:{},storyMemory:{pendingEchoes:[]}});
const rng=()=>({next:()=>0.25});
const run=(id,tags,choice='acknowledge')=>queueCanonicalRecoveredEcho(base(),{id,label:id,tags},{id:choice,label:choice},{},{council:0,timeline:0},{council:1,timeline:0},rng());
test('specialized intake echo has exact canonical label and follow-up choices',()=>{
 const a=run('office.intake_briefing',['onboarding']);assert.equal(a.label,'Echo Notice: Window 7B Reopens Your File');assert.equal(a.choices.length,2);assert.equal(a.sourceStoryletId,'office.intake_briefing');
});
test('memory and present route echoes preserve two distinct destinations',()=>{
 const a=run('office.choice_point_memory_or_present',['main'],'memory_route');
 const b=run('office.choice_point_memory_or_present',['main'],'present_route');
 assert.equal(a.world,'ARCHIVE');assert.equal(b.world,'BLACK_MARKET');assert.notDeepEqual(a.choices,b.choices);
});
test('Jinx Edgar Case Worker Nyx specialized branches are active',()=>{
 for(const name of ['jinx','edgar','caseworker','nyx']){
  const a=run('npc.test.'+name,['npc',name]);assert.ok(a?.choices?.length>=2,name);assert.ok(a.label,name);
 }
});
test('duplicate unresolved echo consumes delay draw only and makes no duplicate',()=>{
 const s=base();let count=0;const random={next(){count++;return .25}};
 const story={id:'office.intake_briefing',tags:['onboarding']},choice={id:'acknowledge'};
 queueCanonicalRecoveredEcho(s,story,choice,{}, {},{},random);
 const prior=count;assert.equal(queueCanonicalRecoveredEcho(s,story,choice,{}, {},{},random),null);
 assert.equal(count,prior+1);assert.equal(s.storyMemory.pendingEchoes.length,1);
});
