import test from 'node:test';
import assert from 'node:assert/strict';
import {createAscensionBridgeIdentity} from './ascension-bridge-identity.mjs';

function harness({sessionOk=true,descriptionOk=true,active=true,mismatch=false,allowed=true}={}){
 const calls=[];
 const adapter={
  auth:{async resolveSession(token){
   calls.push(['session',token]);
   return {ok:sessionOk,authenticated:sessionOk,identityId:'avcc-user-1'};
  }},
  identity:{
   async describe(token){
    calls.push(['describe',token]);
    return {ok:descriptionOk,authenticated:descriptionOk,
     identity:{identityId:mismatch?'someone-else':'avcc-user-1',status:active?'active':'suspended'}};
   },
   async can(input){
    calls.push(['can',input]);
    return {ok:true,allowed};
   }
  }
 };
 return {...createAscensionBridgeIdentity({adapter,capability:'verified.map.read'}),calls};
}
const request={headers:{cookie:'theme=dark; ascension_avcc_session=native%2Eopaque%2Etoken; ascension_csrf=unused'}};
test('deployed cookie resolves native session and rechecks canonical identity',async()=>{
 const h=harness();const identity=await h.resolveIdentity(request);
 assert.deepEqual(identity,{subject:'avcc-user-1'});
 assert.equal(await h.authorizeMapView(identity),true);
 assert.deepEqual(h.calls,[
  ['session','native.opaque.token'],['describe','native.opaque.token'],
  ['can',{identityId:'avcc-user-1',capability:'verified.map.read'}]
 ]);
 assert.equal(JSON.stringify(identity).includes('native'),false);
});
test('missing cookie, duplicates, encoding errors and untrusted subject headers fail shut',async()=>{
 const h=harness();
 for(const req of [
  {headers:{}},{headers:{cookie:'aa_cards_session='+('X'.repeat(43))}},
  {headers:{cookie:'ascension_avcc_session=a; ascension_avcc_session=b'}},
  {headers:{cookie:'ascension_avcc_session=%ZZ'}},
  {headers:{cookie:'ascension_avcc_session=%0Abad'}},
 ]){
   assert.equal(await h.resolveIdentity(req),null);
 }
 assert.equal(h.calls.length,0);
 const valid=await h.resolveIdentity({headers:{...request.headers,'x-avcc-user-id':'an-attacker'}});
 assert.equal(valid.subject,'avcc-user-1');
});
test('revoked, identity-mismatched, inactive and denied capability return no authority',async()=>{
 assert.equal(await harness({sessionOk:false}).resolveIdentity(request),null);
 assert.equal(await harness({descriptionOk:false}).resolveIdentity(request),null);
 assert.equal(await harness({mismatch:true}).resolveIdentity(request),null);
 assert.equal(await harness({active:false}).resolveIdentity(request),null);
 const denied=harness({allowed:false}),identity=await denied.resolveIdentity(request);
 assert.equal(await denied.authorizeMapView(identity),false);
});
test('refuses missing adapters and unregistered grant configuration',()=>{
 assert.throws(()=>createAscensionBridgeIdentity({adapter:{},capability:'foo.bar'}),/Approved live/);
 assert.throws(()=>createAscensionBridgeIdentity({adapter:{auth:{resolveSession(){}},identity:{describe(){},can(){}}}}),/registered map capability/);
});
