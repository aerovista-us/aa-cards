#!/usr/bin/env node
// Anonymous fixed-origin probes only. Never redeem a callback or collect session data.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const UI='https://ascension.aerovista.us',AUTH='https://ascension-auth.aerovista.us';
export async function probeReleaseBoundary({fetchImpl=fetch,timeoutMs=5000}={}){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<250||timeoutMs>10000)throw TypeError('Bounded timeout required');
 const checks=[];
 for(const [name,url,expected] of [
  ['public_ui',UI+'/',200],['auth_health',AUTH+'/health',200],['anonymous_session',AUTH+'/api/session',200],
  ['anonymous_access',AUTH+'/api/access',[401,403]],['map_disabled',AUTH+'/api/game/map',404],['world_disabled',AUTH+'/api/game/world',404]
 ]){
  try{
   const response=await fetchImpl(url,{method:'GET',credentials:'omit',redirect:'manual',cache:'no-store',headers:{Accept:'application/json',Origin:UI},signal:AbortSignal.timeout(timeoutMs)});
   let pass=Array.isArray(expected)?expected.includes(response.status):response.status===expected;
   if(name==='anonymous_session'){
    if(pass&&response.headers.get('content-type')?.includes('application/json'))pass=(await response.json())?.authenticated===false;
    else pass=false;
   }
   checks.push({name,status:response.status,pass});
  }catch{checks.push({name,pass:false,detail:'unavailable'});}
 }
 return {scope:'anonymous-preflight-only',checks,boundaryReady:checks.every(x=>x.pass),liveAccountAcceptance:'NOT_ESTABLISHED',promotionAllowed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await probeReleaseBoundary();console.log(JSON.stringify(result,null,2));
 // Neither successful probes nor a healthy auth bridge certify production gameplay.
 process.exitCode=result.boundaryReady?3:2;
}
