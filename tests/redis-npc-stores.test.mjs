import test from 'node:test';
import assert from 'node:assert/strict';
import {createRedisNpcStores} from '../gateway/redis-npc-stores.mjs';
test('uses atomic distributed quota script, TTL caching and single-use challenges',async()=>{
 const db=new Map(),calls=[];
 const redis={
  get:async k=>db.get(k)||null,
  set:async(k,v,o)=>{calls.push({k,o});db.set(k,v)},
  eval:async(_script,{keys,arguments:args})=>{
   const k=keys[0];
   if(k.includes(':rate:')){const n=Number(db.get(k)||0)+1;db.set(k,String(n));return n}
   const v=db.get(k);db.delete(k);return v||null;
  }
 };
 const x=createRedisNpcStores(redis);
 assert.equal(await x.quota.take('alice',{limit:1,windowSeconds:60}),true);
 assert.equal(await x.quota.take('alice',{limit:1,windowSeconds:60}),false);
 await x.cache.put('k',{text:'text'}, {ttlSeconds:90});
 assert.deepEqual(await x.cache.get('k'),{text:'text'});
 await x.loginChallenges.put('s',{intent:'login'},{ttlSeconds:300});
 assert.deepEqual(await x.loginChallenges.consume('s'),{intent:'login'});
 assert.equal(await x.loginChallenges.consume('s'),null);
 assert.equal(calls.every(v=>v.o.EX>0),true);
});
