#!/usr/bin/env node
// Read-only Ascension promotion audit. Never claims an authenticated play proof
// based solely on HTTP 200 or mocked unit tests.
const required = ['ASCENSION_PUBLIC_URL','ASCENSION_AUTH_URL','ASCENSION_GAME_SESSION_URL'];
const missing = required.filter(k=>!process.env[k]);
if(missing.length){console.error('BLOCKED: missing configured endpoints:',missing.join(','));process.exit(2)}
const targets = {
  public:process.env.ASCENSION_PUBLIC_URL,
  auth:process.env.ASCENSION_AUTH_URL,
  session:process.env.ASCENSION_GAME_SESSION_URL
};
for(const [key,url] of Object.entries(targets)){
 const u=new URL(url);
 if(u.protocol!=='https:') throw new Error(key+' must use HTTPS');
}
const timeout=AbortSignal.timeout(7000);
const results=[];
for(const [name,url] of Object.entries(targets)){
 try{
  const response=await fetch(url,{redirect:'manual',signal:timeout,cache:'no-store'});
  results.push({name,status:response.status,redirect:response.headers.get('location')||null});
 }catch(error){results.push({name,error:error.cause?.code||error.name})}
}
console.log(JSON.stringify(results,null,2));
const auth=results.find(x=>x.name==='auth');
const session=results.find(x=>x.name==='session');
if(auth?.error || session?.error){console.error('BLOCKED: identity/game origin unreachable');process.exit(2)}
if(session.status!==401 && session.status!==403){
 console.error('BLOCKED: anonymous gameplay session must be denied');process.exit(2)
}
console.error('PREFLIGHT ONLY: authorized login, full canonical parity, PostgreSQL restart, logout revocation and resume still require independently recorded end-to-end evidence.');
process.exit(3);
