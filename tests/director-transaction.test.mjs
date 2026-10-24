import test from 'node:test';
import assert from 'node:assert/strict';
import {createDirectorTransaction} from '../gateway/director-transaction.mjs';
function fixture(){
 let current={id:'run-1',owner:'alice',revision:0,active:true,currentStoryletId:'office',chapterId:'free',state:{turn:0}};
 let queue=Promise.resolve();let calls=0;let paid=false;let revoked=false;
 const store={
   async readOwned(who,id){return who==='alice'&&(!id||id==='run-1')?structuredClone(current):null},
   transaction(fn){const p=queue.then(()=>fn({
     readOwnedForUpdate:async who=>who===current.owner?structuredClone(current):null,
     writeOwned:async (who,rev,next)=>{if(who!==current.owner||rev!==current.revision)throw Error('cas conflict');current=structuredClone(next)}
   }));queue=p.catch(()=>{});return p}
 };
 const director={
  allowedChoices:async()=>[{id:'continue'}],
  executeChoice:async run=>{calls++;return {nextState:{turn:run.state.turn+1},nextStoryletId:'next'}}
 };
 const entitlements={canAccessChapter:async (_identity,chapter)=>!revoked&&(chapter==='free'||paid)};
 return {adapter:createDirectorTransaction({store,director,entitlements,clock:()=>7}),run:()=>structuredClone(current),
   get calls(){return calls},setPaid(v){paid=v},setRevoked(v){revoked=v},setChapter(v){current.chapterId=v}};
}
const input={sessionId:'run-1',storyletId:'office',choiceId:'continue',expectedRevision:0};
test('serializes concurrent duplicate choices: one durable commit only',async()=>{
 const f=fixture(),identity={subject:'alice'},run=f.run();
 const results=await Promise.allSettled([f.adapter.executeChoice(identity,run,input),f.adapter.executeChoice(identity,run,input)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
 assert.equal(f.calls,1);assert.equal(f.run().revision,1);
});
test('ownership, entitlement, and choice eligibility fail closed',async()=>{
 const f=fixture();const run=f.run();
 await assert.rejects(f.adapter.executeChoice({subject:'bob'},run,input),{status:404});
 await assert.rejects(f.adapter.executeChoice({subject:'alice'},run,{...input,choiceId:'future'}),{status:422});
 f.setChapter('premium');
 await assert.rejects(f.adapter.executeChoice({subject:'alice'},run,input),{status:403});
 assert.equal(f.calls,0);
 f.setPaid(true);
 const next=await f.adapter.executeChoice({subject:'alice'},run,input);
 assert.equal(next.revision,1);assert.equal(f.calls,1);
});
test('missing transaction dependencies cannot be initialized',()=>{
 assert.throws(()=>createDirectorTransaction({store:{},director:{},entitlements:{}}),/required/);
});
