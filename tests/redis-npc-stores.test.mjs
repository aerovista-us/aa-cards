import test from 'node:test';
import assert from 'node:assert/strict';
import {createRedisNpcStores} from '../gateway/redis-npc-stores.mjs';
test('shared quota fails closed on invalid counts; cache strips unknown fields and requires TTL',async()=>{
 const db=new Map();let count=0;
 const redis={get:async k=>db.get(k),set:async(k,v,o)=>{assert.ok(o.EX>0);db.set(k,v);},eval:async()=>++count};
 const stores=createRedisNpcStores(redis);assert.equal(await stores.quota.take('npc:alice',{limit:1,windowSeconds:60}),true);assert.equal(await stores.quota.take('npc:alice',{limit:1,windowSeconds:60}),false);
 await stores.cache.put('fixture-key',{text:'A line.',provider:'groq',private:'strip'},{ttlSeconds:90});assert.deepEqual(await stores.cache.get('fixture-key'),{text:'A line.',provider:'groq'});
 const invalid=createRedisNpcStores({...redis,eval:async()=>0});assert.equal(await invalid.quota.take('npc:alice',{limit:1,windowSeconds:60}),false);
 await assert.rejects(stores.cache.put('fixture-key',{text:'x'.repeat(521),provider:'groq'},{ttlSeconds:90}));
 await assert.rejects(stores.cache.put('fixture-key',{text:'A line.',provider:'groq'},{ttlSeconds:0}));
});
