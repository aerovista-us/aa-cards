import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldCapabilityAuthorizer} from '../gateway/world-capability-policy.mjs';
const names={load:'fixture.world.load',create:'fixture.world.create',action:'fixture.world.action',travel:'fixture.world.travel',map:'fixture.world.map'};
const identity={subject:'fixture-player'};
const build=()=>{
 const calls=[],allowed=new Set(Object.values(names));
 const authorize=createWorldCapabilityAuthorizer({capabilityNames:names,
  adapter:{identity:{async can(args){calls.push(args);return {ok:true,allowed:allowed.has(args.capability)}}}}});
 return {authorize,calls,allowed};
};
const move={type:'move',dx:1,dy:0};
test('requires distinct approved names and actual App Adapter identity.can',()=>{
 for(const bad of [undefined,{}, {...names,travel:names.action},{...names,map:''},{...names,extra:'fixture.extra'}])
  assert.throws(()=>createWorldCapabilityAuthorizer({capabilityNames:bad,adapter:{identity:{can:()=>{}}}}),/capability/);
 assert.throws(()=>createWorldCapabilityAuthorizer({capabilityNames:names}),/identity.can/);
});
test('maps load/create/action/map to named capability, never accepts implicit blanket roles',async()=>{
 const b=build();
 for(const [operation,request]of [['load',{type:'load'}],['create',{type:'create',runId:'run-1'}],
  ['action',{type:'action',runId:'run-1',command:move}],['map',{type:'map'}]]){
  assert.equal(await b.authorize(identity,request),true);
  assert.deepEqual(b.calls.at(-1),{identityId:'fixture-player',capability:names[operation]});
 }
 b.allowed.delete(names.load);
 assert.equal(await b.authorize(identity,{type:'load'}),false);
 assert.equal(await b.authorize(identity,{type:'action',runId:'run-1',command:move}),true);
});
test('travel requires BOTH action and travel; denied/revoked grant is rechecked',async()=>{
 const b=build(),r={type:'action',runId:'run-1',command:{type:'travel',target:'exit'}};
 assert.equal(await b.authorize(identity,r),true);
 assert.deepEqual(b.calls.map(c=>c.capability),[names.action,names.travel]);
 b.allowed.delete(names.travel);b.calls.length=0;
 assert.equal(await b.authorize(identity,r),false);
 assert.deepEqual(b.calls.map(c=>c.capability),[names.action,names.travel]);
 b.allowed.delete(names.action);b.calls.length=0;
 assert.equal(await b.authorize(identity,r),false);
 assert.deepEqual(b.calls.map(c=>c.capability),[names.action]);
});
test('malformed or injected requests never contact the grant API',async()=>{
 const b=build();
 for(const r of [null,{}, {type:'delete',runId:'run-1'}, {type:'load',ownerId:'other'},
  {type:'create',runId:'run-1',ownerId:'other'}, {type:'map',ownerId:'other'},
  {type:'action',runId:'run-1',command:{type:'move',dx:1,dy:0,ownerId:'other'}},
  {type:'action',runId:'run-1',command:{type:'travel',target:'archive'}},
  {type:'action',runId:'run-1',command:{type:'move',dx:2,dy:0}}])
  assert.equal(await b.authorize(identity,r),false);
 assert.equal(await b.authorize(null,{type:'load'}),false);
 assert.equal(b.calls.length,0);
});
test('malformed adapter answers, unexpected status and outages are never authorization success',async()=>{
 for(const answer of [null,undefined,{},true,{ok:true,allowed:1},{ok:false,allowed:true},{ok:true,allowed:false}]){
  const authorize=createWorldCapabilityAuthorizer({capabilityNames:names,adapter:{identity:{can:async()=>answer}}});
  assert.equal(await authorize(identity,{type:'load'}),false);
 }
 const unavailable=createWorldCapabilityAuthorizer({capabilityNames:names,adapter:{identity:{can:async()=>{throw Error('gateway_unavailable')}}}});
 await assert.rejects(unavailable(identity,{type:'load'}),/gateway_unavailable/);
});
