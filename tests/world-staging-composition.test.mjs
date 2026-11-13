import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreparedWorldGameHandler} from '../gateway/world-staging-composition.mjs';

const capabilityNames={load:'fixture.world.load',create:'fixture.world.create',action:'fixture.world.action',travel:'fixture.world.travel',map:'fixture.world.map'};
const adapter={auth:{resolveSession:async()=>({ok:false,authenticated:false})},
 identity:{describe:async()=>({ok:false,authenticated:false}),can:async()=>({ok:true,allowed:false})}};
const pool={connect:async()=>{throw Error('must_not_connect_during_composition')}};
const options={adapter,pool,capabilityNames,appOrigin:'https://ascension-auth.aerovista.us',uiOrigin:'https://ascension.aerovista.us'};

test('prepared world composition only returns an unmounted handler with no DB calls or server effects',()=>{
 const handler=createPreparedWorldGameHandler(options);
 assert.equal(typeof handler,'function');
});
test('prepared world composition rejects missing registry, identity, PostgreSQL, and origins',()=>{
 for(const key of ['adapter','pool','capabilityNames','appOrigin','uiOrigin']){
  const invalid={...options};
  delete invalid[key];
  assert.throws(()=>createPreparedWorldGameHandler(invalid),/required|capability|authority|origin|URL|Invalid/);
 }
 assert.throws(()=>createPreparedWorldGameHandler({...options,capabilityNames:{...capabilityNames,travel:capabilityNames.action}}),/capability/);
 assert.throws(()=>createPreparedWorldGameHandler({...options,appOrigin:'http://ascension-auth.aerovista.us'}),/origin/i);
});
