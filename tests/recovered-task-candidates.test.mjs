import test from 'node:test';import assert from 'node:assert/strict';
import {selectRecoveredBoardCandidates as select} from '../gateway/recovered-task-candidates.mjs';
const ctx=()=>({state:{currentWorld:'AFTERLIFE',flags:{},cooldowns:{}},tile:{tags:['office']},library:[{id:'planned',label:'P',when:{blocked:true}},{id:'npc',label:'N',tags:['npc']},{id:'observe',label:'O',tags:['observe']},{id:'main',label:'M',tags:['main']}],plannedIds:['planned'],ambientIds:[],readyEchoes:[],priorityIds:[],conditionOk:(_,w)=>!w.blocked,score:()=>0,memoryScore:()=>0,renderTemplate:x=>x,limit:12});
test('planned bypasses when, tagged observe excluded first office',()=>{const c=ctx(),r=select(c);assert.deepEqual(r.map(x=>x.id),['planned','main','npc']);assert.equal(r[0].planned,true);});
test('candidate selection respects cooldown, needsSpawn, uniqueness',()=>{const c=ctx();c.state.cooldowns.main=2;c.library[1].needsSpawn=true;c.plannedIds=['planned','planned'];assert.deepEqual(select(c).map(x=>x.id),['planned']);});
test('priority and echo are inserted before ranked choices',()=>{const c=ctx();c.readyEchoes=[{id:'echo',label:'E'}];c.priorityIds=['npc'];assert.deepEqual(select(c).map(x=>x.id),['planned','echo','npc','main']);});
test('memory and director scores affect rank without RNG',()=>{const c=ctx();c.state.flags.officeOnboardComplete=true;c.plannedIds=[];c.score=sl=>sl.id==='observe'?10:0;assert.equal(select(c)[0].id,'observe');});
test('missing authoritative callbacks fail closed',()=>{const c=ctx();delete c.score;assert.throws(()=>select(c),/Canonical score/);});
