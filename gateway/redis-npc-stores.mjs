// Redis-compatible shared stores. Atomic quota requires Redis EVAL support.
// Requires a trusted server-side Redis client; do not expose these operations publicly.
const windowScript=`
local current=redis.call('INCR',KEYS[1])
if current==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end
return current
`;
const atomicGetDelete=`
local v=redis.call('GET',KEYS[1])
if v then redis.call('DEL',KEYS[1]) end
return v
`;
export function createRedisNpcStores(redis,{prefix='ascension:npc'}={}){
 if(typeof redis?.get!=='function'||typeof redis?.set!=='function'||typeof redis?.eval!=='function')
  throw new Error('Redis get/set/eval required for shared NPC stores');
 if(!/^[a-z0-9:_-]{3,80}$/i.test(prefix))throw new TypeError('Invalid Redis namespace');
 const key=(group,value)=>prefix+':'+group+':'+value;
 const evalScript=(script,keys,args)=>redis.eval(script,{keys,arguments:args});
 return Object.freeze({
  quota:Object.freeze({
   async take(token,{limit,windowSeconds}){
    if(typeof token!=='string'||token.length>220||!Number.isInteger(limit)||limit<1||
     !Number.isInteger(windowSeconds)||windowSeconds<1)throw new TypeError('Invalid quota');
    const count=Number(await evalScript(windowScript,[key('rate',token)],[String(windowSeconds)]));
    return count<=limit;
   }
  }),
  cache:Object.freeze({
   async get(token){
    if(typeof token!=='string'||token.length>160)throw new TypeError('Invalid cache key');
    const data=await redis.get(key('cache',token));
    if(!data)return null;
    try{return JSON.parse(data)}catch{return null}
   },
   async put(token,value,{ttlSeconds}){
    if(typeof token!=='string'||token.length>160||!Number.isInteger(ttlSeconds)||ttlSeconds<1||
      ttlSeconds>300)throw new TypeError('Invalid cache TTL');
    await redis.set(key('cache',token),JSON.stringify(value),{EX:ttlSeconds});
   }
  }),
  loginChallenges:Object.freeze({
   async put(token,value,{ttlSeconds}){
    if(typeof token!=='string'||token.length>160||!Number.isInteger(ttlSeconds)||ttlSeconds<1)
      throw new TypeError('Invalid login challenge');
    await redis.set(key('login',token),JSON.stringify(value),{EX:ttlSeconds});
   },
   async consume(token){
    const value=await evalScript(atomicGetDelete,[key('login',token)],[]);
    return value?JSON.parse(value):null;
   }
  })
 });
}
