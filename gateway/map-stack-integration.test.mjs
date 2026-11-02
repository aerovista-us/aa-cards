// Staging-only end-to-end composition proof, no live AVCC account or DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as requestHttp} from 'node:http';
import {createAvccMapIdentity} from './avcc-map-identity.mjs';
import {createOwnedMapSession} from './owned-map-session.mjs';
import {createMapSessionHttpHandler} from './map-session-http.mjs';
const APP='https://ascension-auth.aerovista.us',HANDLE='X'.repeat(43);
function fixture(){
 let revoked=false,allowed=true,queryCount=0;
 const adapter={
  auth:{async resolveSession(token){return {ok:true,authenticated:!revoked,identityId:token==='valid-alice'?'alice':'bob'};}},
  identity:{
   async describe(token){return {ok:true,authenticated:!revoked,identity:{identityId:token==='valid-alice'?'alice':'bob',status:'active'}};},
   async can(){return {ok:true,allowed};}
  }
 };
 const sessions={async get(handle){if(handle!==HANDLE)return null;return {token:'valid-alice'};}};
 const auth=createAvccMapIdentity({adapter,sessions,capability:'approved.test.map.view'});
 const pool={async query(sql,args){
   assert.match(sql,/WHERE owner_subject=\$1/);
   assert.deepEqual(args,['alice']);
   queryCount++;
   const width=9,height=7;
   const tiles=Array.from({length:width*height},(_,i)=>({
    tags:[i===4+4*width?'clerks':'void'],discovered:i===4+4*width,spawns:[]
   }));
   return {rows:[{id:'run-alice',owner_subject:'alice',revision:'7',state:{
    currentWorld:'AFTERLIFE',turn:2,pos:{x:4,y:4},worldMap:{width,height,tiles,tagPool:[]},
    storyMemory:{secret:'never expose'},seedString:'never expose'}}]};
  }};
 const service=createOwnedMapSession({
  pool,...auth,listVisibleMarkers:async()=>[]
 });
 const handler=createMapSessionHttpHandler({service,appOrigin:APP});
 return {handler,revoke:()=>{revoked=true;},deny:()=>{allowed=false;},queries:()=>queryCount};
}
async function fetchLocal(port,{cookie=true}={}){
 return new Promise((resolve,reject)=>{
  const req=requestHttp({host:'127.0.0.1',port,path:'/v1/game/map',method:'GET',
   headers:{Host:'ascension-auth.aerovista.us',...(cookie?{Cookie:'aa_cards_session='+HANDLE}:{})}},res=>{
   let data='';res.on('data',chunk=>data+=chunk);
   res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(data)}));
  });req.on('error',reject);req.end();
 });
}
test('AVCC-shaped verified session + live capability + owner PostgreSQL + redacted Phaser map',async()=>{
 const env=fixture(),server=createServer(env.handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const port=server.address().port;
  const legit=await fetchLocal(port);
  assert.equal(legit.status,200);assert.equal(legit.body.schema,'ascension.map-view.v1');
  assert.equal(legit.body.revision,7);
  assert.equal(JSON.stringify(legit.body).includes('never expose'),false);
  assert.equal(env.queries(),1);
  assert.equal((await fetchLocal(port,{cookie:false})).status,401);
  env.deny();
  assert.equal((await fetchLocal(port)).status,403);
  assert.equal(env.queries(),1,'unauthorized reads never touch database');
  env.revoke();
  assert.equal((await fetchLocal(port)).status,401);
  assert.equal(env.queries(),1);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
