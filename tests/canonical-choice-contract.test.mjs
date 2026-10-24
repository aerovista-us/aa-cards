import test from 'node:test';
import assert from 'node:assert/strict';
import {CANONICAL_CHOICE_STAGES,assertCanonicalExecutor,createCanonicalChoicePort} from '../gateway/canonical-choice-contract.mjs';
test('refuses partial choice-effect-only port',()=>{
 assert.throws(()=>assertCanonicalExecutor({authority:'recovered-ascension-v4',implementedStages:['eligibility','stateEffects'],execute:async()=>({})}),/Full canonical/);
});
test('requires persistent RNG and transaction commitment',()=>{
 const candidate={authority:'recovered-ascension-v4',implementedStages:[...CANONICAL_CHOICE_STAGES],execute:async()=>({})};
 assert.throws(()=>assertCanonicalExecutor(candidate),/Persistent RNG/);
});
test('forwards identity and canonical engine-produced state only',async()=>{
 const executor={authority:'recovered-ascension-v4',implementedStages:[...CANONICAL_CHOICE_STAGES],persistentRng:true,atomicRevisionCommit:true,
 execute:async(state,input,context)=>({state:{...state,turn:1,choice:input.choiceId,owner:context.identity.subject},turn:1,rngCheckpoint:{index:1}})};
 const execute=createCanonicalChoicePort(executor);
 await assert.rejects(execute({turn:0},{choiceId:'a'},{}),/Verified identity/);
 assert.deepEqual(await execute({turn:0},{choiceId:'a'},{identity:{subject:'alice'},client:{}}),{turn:1,choice:'a',owner:'alice'});
});
