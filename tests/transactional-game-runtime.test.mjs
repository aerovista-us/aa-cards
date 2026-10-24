import test from 'node:test';import assert from 'node:assert/strict';
import {createTransactionalGameRuntime} from '../gateway/transactional-game-runtime.mjs';
import {CANONICAL_CHOICE_STAGES} from '../gateway/canonical-choice-contract.mjs';
test('runtime refuses incomplete mechanic authority before database access',()=>{
 assert.throws(()=>createTransactionalGameRuntime({pool:{connect(){throw Error('should not run')}},canonicalExecutor:{
 authority:'recovered-ascension-v4',implementedStages:['stateEffects'],execute:async()=>({})},authorizeChapter:async()=>true}),/Full canonical/);
});
test('runtime refuses complete-claiming executor with missing map or memory',async()=>{
 let rolledBack=false;const state={seedString:'billy',rngDraws:0,worldMap:{width:1,height:1,tiles:[{spawns:[]}]},storyMemory:{decisionHistory:[]}};
 const client={async query(sql,args){if(sql==='BEGIN'||sql==='COMMIT')return{rows:[]};if(sql==='ROLLBACK'){rolledBack=true;return{rows:[]}};
 if(sql.includes('FOR UPDATE'))return{rows:[{id:'run-1',owner_subject:'alice',revision:'0',state}]};
 throw Error('unexpected database write')},release(){}};
 const runtime=createTransactionalGameRuntime({pool:{connect:async()=>client,query:async()=>({rows:[]})},
 authorizeChapter:async()=>true,canonicalExecutor:{authority:'recovered-ascension-v4',implementedStages:[...CANONICAL_CHOICE_STAGES],
 persistentRng:true,atomicRevisionCommit:true,execute:async()=>({state:{rngDraws:1},turn:1,rngCheckpoint:{rngDraws:1}})}});
 await assert.rejects(runtime.commitChoice({subject:'alice'},'run-1',{storyletId:'office.test',choiceId:'go',expectedRevision:0}),/Missing authoritative world map/);
 assert.equal(rolledBack,true);
});
