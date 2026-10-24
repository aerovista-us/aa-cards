import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcDialogueService} from '../gateway/npc-dialogue.mjs';
function setup({failGroq=false,quotaAllowed=true}={}){
 const calls=[],saved=new Map();let count=0;
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('groq')&&failGroq)return {ok:false,status:429};
  if(url.includes('groq'))return {ok:true,json:async()=>({choices:[{message:{content:'Please complete Form 28-B.'}}]})};
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'A second desk opens.'}]}}]})};
 };
 const service=createNpcDialogueService({fetcher,groqKey:'test-groq',geminiKey:'test-gemini',
 quota:{take:async()=>{count++;return quotaAllowed}},cache:{
 get:async k=>saved.get(k),put:async(k,v)=>{saved.set(k,v)}
 }});
 return {service,calls,get requests(){return count}};
}
const request={playerId:'alice',npcId:'caseworker',sceneId:'office-1',
 utterance:'Where am I?',facts:['One approved placement: Hallway'],memory:[],sessionAuthorized:true};
test('uses Groq first and caches identical scoped dialogue',async()=>{
 const x=setup();assert.equal((await x.service.talk(request)).provider,'groq');
 assert.equal((await x.service.talk(request)).cached,true);
 assert.equal(x.calls.length,1);assert.equal(x.requests,1);
 assert.match(x.calls[0].url,/api.groq.com/);
 assert.ok(!JSON.stringify(x.calls[0].options).includes('test-gemini'));
});
test('fails over to Gemini after Groq provider failure',async()=>{
 const x=setup({failGroq:true});
 const response=await x.service.talk(request);
 assert.equal(response.provider,'gemini');assert.equal(x.calls.length,2);
 assert.match(x.calls[1].url,/generativelanguage.googleapis.com/);
});
test('quota exhaustion uses scripted fallback without contacting providers',async()=>{
 const x=setup({quotaAllowed:false});
 assert.equal((await x.service.talk(request)).provider,'scripted');
 assert.equal(x.calls.length,0);
});
test('rejects missing session and invalid NPC IDs',async()=>{
 const x=setup();
 await assert.rejects(x.service.talk({...request,sessionAuthorized:false}),/Authenticated/);
 await assert.rejects(x.service.talk({...request,npcId:'overseer_admin'}),/Invalid dialogue/);
 assert.equal(x.calls.length,0);
});
test('cache is player scoped and changes with story facts',async()=>{
 const x=setup();
 await x.service.talk(request);
 await x.service.talk({...request,playerId:'bob'});
 await x.service.talk({...request,facts:['Different fact']});
 assert.equal(x.calls.length,3);
});
