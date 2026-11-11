import test from 'node:test';
import assert from 'node:assert/strict';
import {probeReleaseBoundary} from '../scripts/verify-live-game-readonly.mjs';
function fixture({map=404,authenticated=false,redirect=false}={}){
 const calls=[];return {calls,fetchImpl:async(url,options)=>{
  calls.push({url,options});const status=url.endsWith('/api/access')?401:url.endsWith('/api/game/map')?map:url.endsWith('/api/game/world')?404:redirect?302:200;
  return {status,headers:new Headers({'content-type':'application/json'}),json:async()=>({authenticated,privateValue:'never-report-this'})};
 }};
}
test('anonymous fixed-origin probes never collect credentials or certify live acceptance',async()=>{
 const f=fixture(),r=await probeReleaseBoundary(f);assert.equal(r.boundaryReady,true);assert.equal(r.promotionAllowed,false);assert.equal(r.liveAccountAcceptance,'NOT_ESTABLISHED');
 assert.equal(new Set(f.calls.map(x=>x.options.signal)).size,6);
 assert.ok(f.calls.every(x=>x.options.credentials==='omit'&&x.options.method==='GET'&&x.options.redirect==='manual'&&!x.options.headers.Cookie));
 assert.equal(JSON.stringify(r).includes('never-report-this'),false);
 assert.ok(f.calls.every(x=>!x.url.includes('callback')&&!x.url.includes('/login')));
});
test('available map, unexpected authenticated session, redirect or network failure fails closed',async()=>{
 for(const options of [{map:200},{authenticated:true},{redirect:true}])assert.equal((await probeReleaseBoundary(fixture(options))).boundaryReady,false);
 const failed=await probeReleaseBoundary({fetchImpl:async()=>{throw Error('private-backend-detail');}});
 assert.equal(failed.boundaryReady,false);assert.equal(JSON.stringify(failed).includes('private-backend-detail'),false);
});
