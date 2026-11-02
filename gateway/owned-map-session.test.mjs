import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {request as httpRequest} from 'node:http';
import {createOwnedMapSession,MapSessionError} from './owned-map-session.mjs';
import {createMapSessionHttpHandler} from './map-session-http.mjs';

const APP='https://ascension-auth.aerovista.us';
const START={x:4,y:4};
function makeRow(subject='alice'){
 const width=9,height=7;
 const cells=Array.from({length:width*height},(_,index)=>{
   const x=index%width,y=Math.floor(index/width);
   return {tags:[(x===4&&(y===4||y===3))?'clerks':'void'],
     discovered:x===4&&(y===4||y===3),spawns:[],
     hiddenTitle:'SECRET FUTURE',decisionMemory:{future:'SECRET MEMORY'}};
 });
 return {id:'run-1',owner_subject:subject,revision:'4',state:{
   currentWorld:'AFTERLIFE',turn:2,pos:START,
   worldMap:{width,height,tiles:cells,
     tagPool:['secret-world-tag'],worldProfile:{shape:'office'}},
   storyMemory:{decisionHistory:['future choice']},rngDraws:42,seedString:'private-seed',
   pendingCutsceneQueue:['HIDDEN CUTSCENE']
 }};
}
const sessionTokens=new Map([['valid-session','alice'],['other-session','bob'],['denied-session','alice']]);
function harness({row=makeRow(),dbFailure=false,markerFailure=false}={}){
 const queries=[];
 const pool={query:async(sql,args)=>{
   queries.push({sql,args});
   if(dbFailure)throw new Error('sensitive SQL connection string');
   return {rows:row?.owner_subject===args?.[0]?[structuredClone(row)]:[]};
 }};
 const service=createOwnedMapSession({
   pool,
   // Test-only simulated session store, not production AVCC auth.
   resolveIdentity:async req=>{
     const sid=String(req.headers.cookie||'').match(/(?:^|; )aa_cards_session=([^;]+)/)?.[1];
     const subject=sessionTokens.get(sid);
     return subject?{subject}:null;
   },
   authorizeMapView:async (_id,req)=>!String(req.headers.cookie||'').includes('denied-session'),
   listVisibleMarkers:async (_id,_run)=>markerFailure?[
     {id:'evil',kind:'npc',label:'<script>alert(1)</script>',x:4,y:3}
   ]:[
     {id:'cw',kind:'npc',label:'Case Worker',x:4,y:3},
     {id:'hidden',kind:'npc',label:'Hidden Worker',x:7,y:6}
   ]
 });
 return {service,queries};
}
const fakeRequest=(sid='valid-session', extra={})=>({headers:{cookie:'aa_cards_session='+sid,...extra}});
test('owned read queries only the identity-bound row and emits whitelist view',async()=>{
 const h=harness();
 const view=await h.service.getMap(fakeRequest());
 assert.equal(h.queries.length,1);
 assert.match(h.queries[0].sql,/SELECT id, owner_subject, revision, state FROM ascension_player_runs WHERE owner_subject=\$1/);
 assert.deepEqual(h.queries[0].args,['alice']);
 assert.equal(view.revision,4);assert.equal(view.world,'AFTERLIFE');
 assert.equal(view.map.cells.filter(c=>c.visible).length,2);
 assert.deepEqual(view.map.cells[0],{visible:false});
 assert.deepEqual(view.markers,[{id:'cw',kind:'npc',label:'Case Worker',x:4,y:3}]);
 const json=JSON.stringify(view);
 for(const secret of ['private-seed','SECRET FUTURE','SECRET MEMORY','secret-world-tag','HIDDEN CUTSCENE','storyMemory','spawns','owner_subject','rngDraws']){
   assert.ok(!json.includes(secret),'leaked '+secret);
 }
});
test('authentication, view capability and cross-owner scope fail closed',async()=>{
 const h=harness();
 await assert.rejects(()=>h.service.getMap(fakeRequest('missing')),{status:401});
 await assert.rejects(()=>h.service.getMap(fakeRequest('denied-session')),{status:403});
 await assert.rejects(()=>h.service.getMap(fakeRequest('other-session')),{status:404});
 assert.equal(h.queries.length,1,'database must not be read before identity+grant');
 // An attacker-supplied subject header cannot affect the validated server session.
 const okay=await h.service.getMap(fakeRequest('valid-session',{'x-user':'bob'}));
 assert.equal(okay.sessionId,'run-1');
});
test('fails on missing services, bad marker, and unsafe BIGINT revision',async()=>{
 assert.throws(()=>createOwnedMapSession({pool:{query(){}},resolveIdentity(){},authorizeMapView(){}}),/listVisibleMarkers/);
 await assert.rejects(()=>harness({markerFailure:true}).service.getMap(fakeRequest()),/authorized marker/);
 await assert.rejects(()=>harness({row:{...makeRow(),revision:'9007199254740993'}}).service.getMap(fakeRequest()),{status:503});
});
async function withHttp(service,fn){
 const server=createServer(createMapSessionHttpHandler({service,appOrigin:APP}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const send=({method='GET',path='/api/game/map',cookie='aa_cards_session=valid-session',host='ascension-auth.aerovista.us',origin}={})=>
  new Promise((resolve,reject)=>{
   const req=httpRequest({host:'127.0.0.1',port,method,path,
     headers:{Host:host,...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})}},res=>{
     let data='';res.setEncoding('utf8');
     res.on('data',chunk=>data+=chunk);
     res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(data)}));
   });req.on('error',reject);req.end();
  });
 try{await fn(send)}finally{await new Promise(resolve=>server.close(resolve))}
}
test('mountable HTTP route supplies no-store JSON; rejects origin, method and query',async()=>{
 const h=harness();
 await withHttp(h.service,async send=>{
   const ok=await send();
   assert.equal(ok.status,200);
   assert.equal(ok.data.schema,'ascension.map-view.v1');
   assert.match(ok.headers['cache-control'],/no-store/);
   assert.equal(ok.headers['access-control-allow-origin'],undefined);
   assert.equal((await send({host:'evil.test'})).status,403);
   assert.equal((await send({origin:'https://evil.test'})).status,403);
   assert.equal((await send({method:'POST'})).status,405);
   assert.equal((await send({path:'/api/game/map?owner=bob'})).status,400);
   assert.equal((await send({path:'/v1/game/choices'})).status,404);
   assert.equal((await send({cookie:null})).status,401);
 });
 assert.equal(h.queries.length,1,'denied HTTP requests cannot reach database');
});
test('HTTP redacts database failures and never includes SQL or tokens in error',async()=>{
 await withHttp(harness({dbFailure:true}).service,async send=>{
   const r=await send();
   assert.equal(r.status,503);
   assert.deepEqual(r.data,{error:'map_service_unavailable'});
   assert.equal(JSON.stringify(r.data).includes('sensitive SQL'),false);
 });
});
test('handler refuses missing services and non-HTTPS origins',()=>{
 assert.throws(()=>createMapSessionHttpHandler({service:{getMap(){}},appOrigin:'http://example.test'}),/HTTPS/);
 assert.throws(()=>createMapSessionHttpHandler({service:{},appOrigin:APP}),/service/);
});
