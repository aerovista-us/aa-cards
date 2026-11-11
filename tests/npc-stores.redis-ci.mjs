// Two real Redis clients, synthetic dialogue providers, disposable loopback only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createRedisNpcStores} from '../gateway/redis-npc-stores.mjs';
import {createNpcDialogueService} from '../gateway/npc-dialogue.mjs';
if(process.env.ASCENSION_DISPOSABLE_REDIS!=='1'||process.env.REDIS_URL!=='redis://127.0.0.1:6379/15'||!process.env.NPC_REDIS_MODULE_PATH)throw Error('Explicit disposable loopback Redis required');
const {createClient}=createRequire(import.meta.url)(process.env.NPC_REDIS_MODULE_PATH);
test('real Redis: shared quota, cache scope, TTL and multi-instance dialogue budget',async()=>{
 const a=createClient({url:process.env.REDIS_URL}),b=createClient({url:process.env.REDIS_URL});a.on('error',()=>{});b.on('error',()=>{});
 try{
  await a.connect();await b.connect();
  const prefix='ascension:npc:ci',one=createRedisNpcStores(a,{prefix}),two=createRedisNpcStores(b,{prefix});
  const admitted=await Promise.all(Array.from({length:40},(_,i)=>(i%2?one:two).quota.take('shared-fixture',{limit:12,windowSeconds:60})));
  assert.equal(admitted.filter(Boolean).length,12);assert.ok(await a.pTTL(prefix+':rate:shared-fixture')>0);
  await one.cache.put('player-a',{text:'A scoped line.',provider:'groq'},{ttlSeconds:1});
  assert.deepEqual(await two.cache.get('player-a'),{text:'A scoped line.',provider:'groq'});assert.equal(await two.cache.get('player-b'),null);
  await new Promise(resolve=>setTimeout(resolve,1100));assert.equal(await two.cache.get('player-a'),null);
  let providerCalls=0;
  const options={groqKey:'fixture-not-a-real-key',groqModel:'fixture-model',approveDialogue:async()=>true,
   fetcher:async()=>{providerCalls++;return {ok:true,json:async()=>({choices:[{message:{content:'An approved fixture line.'}}]})};}};
  const services=[createNpcDialogueService({...options,...one}),createNpcDialogueService({...options,...two})];
  const replies=await Promise.all(Array.from({length:20},(_,i)=>services[i%2].talk({playerId:'fixture-dialogue-player',npcId:'caseworker',sceneId:'fixture-office',utterance:'Question '+i,facts:[],memory:[],sessionAuthorized:true})));
  assert.equal(providerCalls,12);assert.equal(replies.filter(x=>x.reason==='rate_limited').length,8);
  const keys=await b.keys(prefix+':*');if(keys.length)await b.del(keys);
  console.log(JSON.stringify({scope:'disposable-redis-only',quota_concurrency:true,two_instances:true,cache_scope:true,ttl_expired:true,provider_requests:'synthetic-only',production_activation:false}));
 }finally{if(a.isOpen)a.destroy();if(b.isOpen)b.destroy();}
});
