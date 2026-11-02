import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createPreparedBridgeMapHandler,AUTH_ORIGIN,UI_ORIGIN} from './ascension-bridge-map-handler.mjs';
import {cellEnabled} from '../phaser-lab/office-model.mjs';

function build(){
 const events=[];
 const adapter={
  auth:{async resolveSession(token){
   events.push('resolve');
   return {ok:true,authenticated:token==='native-1',identityId:'alice'};
  }},
  identity:{
   async describe(token){events.push('describe');
    return {ok:true,authenticated:token==='native-1',identity:{identityId:'alice',status:'active'}};},
   async can(){events.push('can');return {ok:true,allowed:true};}
  }
 };
 const pool={async query(sql,args){
  events.push('postgres');
  assert.match(sql,/WHERE owner_subject=\$1/);
  assert.deepEqual(args,['alice']);
  const width=9,height=7;
  const tiles=Array.from({length:63},(_,i)=>{const x=i%width,y=Math.floor(i/width);
   return {discovered:x===4&&y===4,tags:[cellEnabled(x,y)?'clerks':'void'],spawns:[],secret:'hidden'};
  });
  return {rows:[{id:'run-01',owner_subject:'alice',revision:'1',state:{
   currentWorld:'AFTERLIFE',turn:0,pos:{x:4,y:4},
   worldMap:{width,height,tiles,tagPool:['private']},seedString:'never-ship'
  }}]};
 }};
 const handler=createPreparedBridgeMapHandler({
  adapter,pool,capability:'verified.map.view',listVisibleMarkers:async()=>[]
 });
 return {handler,events};
}
test('real-bridge-shaped request validates native token, capability, SQL owner and CORS',async()=>{
 const {handler,events}=build();
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 try{
  const headers={Host:new URL(AUTH_ORIGIN).host,Origin:UI_ORIGIN,Cookie:'ascension_avcc_session=native-1'};
  const good=await fetch(url+'/api/game/map',{headers});
  assert.equal(good.status,200);
  assert.equal(good.headers.get('access-control-allow-origin'),UI_ORIGIN);
  assert.equal(good.headers.get('access-control-allow-credentials'),'true');
  const body=await good.json();
  assert.equal(body.schema,'ascension.map-view.v1');
  assert.equal(body.revision,1);
  assert.equal(JSON.stringify(body).includes('never-ship'),false);
  assert.deepEqual(events,['resolve','describe','can','postgres']);
  const n=events.length;
  const evil=await fetch(url+'/api/game/map',{headers:{...headers,Origin:'https://evil.example'}});
  assert.equal(evil.status,403);
  assert.equal(evil.headers.get('access-control-allow-origin'),null);
  const absent=await fetch(url+'/api/game/map',{headers:{Host:new URL(AUTH_ORIGIN).host}});
  assert.equal(absent.status,403);
  const other=await fetch(url+'/api/game/map?run=other',{headers});
  assert.equal(other.status,400);
  const posted=await fetch(url+'/api/game/map',{method:'POST',headers});
  assert.equal(posted.status,405);
  assert.equal(events.length,n,'denied origin, query or POST must never touch AVCC or database');
 }finally{await new Promise(resolve=>server.close(resolve))}
});
test('cannot initialize handler without approved capability or authorized markers',()=>{
 assert.throws(()=>createPreparedBridgeMapHandler({}),/App Adapter/);
});
