import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchOwnedMap,MapReadError} from './live-map-client.mjs';
import {SAMPLE_SNAPSHOTS} from './sample-snapshots.mjs';
test('only same-origin, no-store authenticated GET; validates sanitized response',async()=>{
 let seen=null;
 const result=await fetchOwnedMap({fetchImpl:async (...args)=>{
   seen=args;
   return {ok:true,status:200,headers:{get:()=> 'application/json; charset=utf-8'},
      json:async()=>({...structuredClone(SAMPLE_SNAPSHOTS[0]),secret:'leak me not'})};
 }});
 assert.equal(seen[0],'/api/game/map');
 assert.equal(seen[1].method,'GET');
 assert.equal(seen[1].credentials,'same-origin');
 assert.equal(seen[1].cache,'no-store');
 assert.equal(seen[1].mode,'same-origin');
 assert.equal(seen[1].redirect,'error');
 assert.deepEqual(result.player,{x:4,y:4});
 assert.equal(Object.hasOwn(result,'secret'),false);
});
test('authentication, access denial and missing runs are explicit, no fallback to guest',async()=>{
 for(const [status,code] of [[401,'authentication_required'],[403,'map_access_denied'],[404,'run_not_found'],[503,'map_unavailable']]){
   await assert.rejects(()=>fetchOwnedMap({fetchImpl:async()=>({ok:false,status})}),e=>e instanceof MapReadError&&e.code===code);
 }
});
test('rejects HTML login pages, invalid data and missing fetch',async()=>{
 await assert.rejects(()=>fetchOwnedMap({fetchImpl:async()=>({ok:true,status:200,headers:{get:()=> 'text/html'},json:async()=>'<html>'})}),{code:'invalid_map_content_type'});
 await assert.rejects(()=>fetchOwnedMap({fetchImpl:async()=>({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({})})}),/map-view/);
 await assert.rejects(()=>fetchOwnedMap({fetchImpl:null}),/Fetch implementation/);
});
