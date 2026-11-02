import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvccMapIdentity} from './avcc-map-identity.mjs';

const HANDLE='A'.repeat(43);
const mockRequest={headers:{cookie:'aa_cards_session='+HANDLE}};
function rig({resolvedIdentity='uuid_alice',describeId='uuid_alice',status='active',
  revoked=false,allowed=true,storeToken='opaque-in-server-store'}={}){
 const calls=[];
 const adapter={
   auth:{async resolveSession(token){
     calls.push(['resolveSession',token]);
     return {ok:true,authenticated:!revoked,identityId:revoked?null:resolvedIdentity};
   }},
   identity:{
     async describe(token){
       calls.push(['describe',token]);
       return {ok:true,authenticated:true,identity:{identityId:describeId,status}};
     },
     async can(query){calls.push(['can',query]);return {ok:true,allowed};}
   }
 };
 const sessions={async get(handle){
   calls.push(['sessionStore',handle]);
   return handle===HANDLE?{token:storeToken}:null;
 }};
 return {...createAvccMapIdentity({adapter,sessions,capability:'example.approved.capability'}),calls};
}
test('valid secure cookie handle resolves AVCC subject, then verifies live capability',async()=>{
 const h=rig();
 const identity=await h.resolveIdentity(mockRequest);
 assert.deepEqual(identity,{subject:'uuid_alice'});
 assert.equal(await h.authorizeMapView(identity,mockRequest),true);
 assert.deepEqual(h.calls,[
  ['sessionStore',HANDLE],['resolveSession','opaque-in-server-store'],
  ['describe','opaque-in-server-store'],
  ['can',{identityId:'uuid_alice',capability:'example.approved.capability'}]
 ]);
 assert.equal(JSON.stringify(identity).includes('opaque'),false);
});
test('missing, injected and duplicated cookies fail before session-store access',async()=>{
 const h=rig();
 for(const req of [
  {headers:{}},{headers:{cookie:'aa_cards_session=bad'}},
  {headers:{cookie:'aa_cards_session='+HANDLE+'; aa_cards_session='+HANDLE}},
  {headers:{cookie:'x-user=bob; Authorization=Bearer.fake'}}
 ])assert.equal(await h.resolveIdentity(req),null);
 assert.equal(h.calls.length,0);
});
test('revoked, identity mismatch, and inactive principals fail closed',async()=>{
 assert.equal(await rig({revoked:true}).resolveIdentity(mockRequest),null);
 assert.equal(await rig({describeId:'bob'}).resolveIdentity(mockRequest),null);
 assert.equal(await rig({status:'suspended'}).resolveIdentity(mockRequest),null);
 const h=rig({allowed:false});const identity=await h.resolveIdentity(mockRequest);
 assert.equal(await h.authorizeMapView(identity),false);
});
test('refuses unspecified or malformed capabilities and missing adapter features',()=>{
 assert.throws(()=>createAvccMapIdentity({adapter:{},sessions:{get(){}},capability:'some.perm'}),/Verified App Adapter/);
 assert.throws(()=>createAvccMapIdentity({adapter:{auth:{resolveSession(){}},identity:{describe(){},can(){}}},sessions:{get(){}},capability:null}),/approved capability/);
});
