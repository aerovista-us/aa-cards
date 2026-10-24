// App-owned login state challenge: backend-only reference.
// Durable store must implement put/get/delete with TTL and atomic consume.
// Never derive the challenge from a browser role or untrusted next URL.
import { randomBytes, timingSafeEqual } from 'node:crypto';
const safePath = next => typeof next==='string' && next.startsWith('/') && !next.startsWith('//')
  && !next.includes('\\') && !/[\r\n]/.test(next) ? next : '/';
const constantMatch=(a,b)=>{
 const x=Buffer.from(String(a||'')), y=Buffer.from(String(b||''));
 return x.length===y.length&&timingSafeEqual(x,y);
};
export function createLoginState({store,ttlSeconds=300}){
 if(typeof store?.put!=='function'||typeof store?.consume!=='function')
   throw new Error('Atomic expiring login state store required');
 if(!Number.isSafeInteger(ttlSeconds)||ttlSeconds<60||ttlSeconds>900)
   throw new TypeError('Invalid login state TTL');
 return Object.freeze({
   async begin({next='/',intent='login'}={}){
     if(intent!=='login'&&intent!=='register') throw new TypeError('Invalid intent');
     const state=randomBytes(32).toString('base64url');
     const bound={intent,next:safePath(next)};
     await store.put(state,bound,{ttlSeconds});
     return {state,...bound};
   },
   async consume({state,expectedState}={}){
     if(typeof state!=='string'||typeof expectedState!=='string'
       ||state.length<20||!constantMatch(state,expectedState))
       throw new Error('Invalid login state');
     const record=await store.consume(state); // MUST be atomic single-use
     if(!record||!['login','register'].includes(record.intent))
       throw new Error('Expired or replayed login state');
     return {next:safePath(record.next),intent:record.intent};
   }
 });
}
