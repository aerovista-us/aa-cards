import test from 'node:test';
import assert from 'node:assert/strict';
import {probeAscensionBridge,ASCENSION_AUTH_ORIGIN} from './bridge-status.mjs';
import {SAMPLE_SNAPSHOTS} from './sample-snapshots.mjs';

const session=(authenticated,id)=>({authenticated,identity:authenticated?{id}:null,csrf:'do-not-return'});
const response=(status,body)=>({status,headers:{get:()=> 'application/json; charset=utf-8'},json:async()=>body});
test('signed-out browser checks only live bridge session, never game map',async()=>{
 const calls=[];
 const result=await probeAscensionBridge({fetchImpl:async (url,opts)=>{
  calls.push({url,opts});return response(200,session(false));
 }});
 assert.equal(result.status,'signed_out');
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,ASCENSION_AUTH_ORIGIN+'/api/session');
 assert.equal(calls[0].opts.credentials,'include');
 assert.equal(calls[0].opts.mode,'cors');
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[0].opts.cache,'no-store');
 assert.equal(calls[0].opts.redirect,'error');
 assert.equal(JSON.stringify(result).includes('do-not-return'),false);
});
test('active session plus missing map endpoint reports staging truth',async()=>{
 const calls=[];
 const r=await probeAscensionBridge({fetchImpl:async (url,opts)=>{
  calls.push({url,opts});return url.endsWith('/api/session')
   ?response(200,session(true,'avcc-id'))
   :response(404,{error:'not_found'});
 }});
 assert.equal(r.status,'map_not_deployed');
 assert.deepEqual(calls.map(x=>x.url),[
  ASCENSION_AUTH_ORIGIN+'/api/session',
  ASCENSION_AUTH_ORIGIN+'/api/game/map'
 ]);
 assert.ok(calls.every(x=>x.opts.credentials==='include'&&x.opts.method==='GET'));
 assert.equal(JSON.stringify(r).includes('avcc-id'),false);
});
test('map refuses access, expiry, incorrect body and malformed browser results',async()=>{
 async function check(status,body){
  return probeAscensionBridge({fetchImpl:async url=>url.endsWith('/api/session')
   ?response(200,session(true,'id'))
   :response(status,body)});
 }
 assert.equal((await check(401,{error:'expired'})).status,'expired');
 assert.equal((await check(403,{error:'denied'})).status,'denied');
 assert.equal((await check(503,{error:'unavailable'})).status,'map_unavailable');
 assert.equal((await check(200,{secret:'private',map:{}})).status,'invalid_map');
 const ok=await check(200,structuredClone(SAMPLE_SNAPSHOTS[0]));
 assert.equal(ok.status,'map_ready');
 assert.equal(ok.frame.revision,0);
 assert.equal(ok.frame.player.x,4);
});
test('unreachable server and malformed session never fall back to public data',async()=>{
 assert.equal((await probeAscensionBridge({fetchImpl:async()=>{throw Error('private token')}})).status,'unreachable');
 assert.equal((await probeAscensionBridge({fetchImpl:async()=>response(200,{})})).status,'unavailable');
 assert.equal((await probeAscensionBridge({fetchImpl:async()=>response(200,session(true,null))})).status,'invalid_session');
 assert.equal((await probeAscensionBridge({fetchImpl:async()=>({status:200,headers:{get:()=> 'text/html'},json:async()=>'<html>'})})).status,'unreachable');
});
