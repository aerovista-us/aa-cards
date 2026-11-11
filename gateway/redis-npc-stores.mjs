// Redis-compatible shared stores. Atomic quota requires Redis EVAL support.
// Requires a trusted server-side Redis client; do not expose these operations publicly.
const windowScript=`
local current=redis.call('INCR',KEYS[1])
if current==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end
return current
`;
export function createRedisNpcStores(redis,{prefix='ascension:npc'}={}){
 if(typeof redis?.get!=='function'||typeof redis?.set!=='function'||typeof redis?.eval!=='function')
  throw new Error('Redis get/set/eval required for shared NPC stores');
 if(!/^[a-z0-9:_-]{3,80}$/i.test(prefix))throw new TypeError('Invalid Redis namespace');
 const validToken=value=>typeof value==='string'&&/^[A-Za-z0-9:_-]{1,220}$/.test(value);
 const key=(group,value)=>prefix+':'+group+':'+value;
 const evalScript=(script,keys,args)=>redis.eval(script,{keys,arguments:args});
 return Object.freeze({
  quota:Object.freeze({
   async take(token,{limit,windowSeconds}){
    if(!validToken(token)||!Number.isInteger(limit)||limit<1||limit>10000||
     !Number.isInteger(windowSeconds)||windowSeconds<1||windowSeconds>3600)throw new TypeError('Invalid quota');
    const count=Number(await evalScript(windowScript,[key('rate',token)],[String(windowSeconds)]));
    return Number.isSafeInteger(count)&&count>=1&&count<=limit;
   }
  }),
  cache:Object.freeze({
   async get(token){
    if(!validToken(token)||token.length>160)throw new TypeError('Invalid cache key');
    const data=await redis.get(key('cache',token));
    if(!data)return null;
    try{const value=JSON.parse(data);return typeof value?.text==='string'&&value.text.length<=520&&['groq','gemini'].includes(value.provider)?{text:value.text,provider:value.provider}:null;}catch{return null}
   },
   async put(token,value,{ttlSeconds}){
    if(!validToken(token)||token.length>160||!Number.isInteger(ttlSeconds)||ttlSeconds<1||
      ttlSeconds>300)throw new TypeError('Invalid cache TTL');
    if(typeof value?.text!=='string'||!value.text.trim()||value.text.length>520||!['groq','gemini'].includes(value.provider))throw TypeError('Invalid cached dialogue');
    await redis.set(key('cache',token),JSON.stringify({text:value.text,provider:value.provider}),{EX:ttlSeconds});
   }
  })
 });
}
