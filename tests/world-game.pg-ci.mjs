// Explicit disposable PostgreSQL only. Never point this proof at NXCore player data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createOwnerWorldInteractionStore} from '../gateway/owner-world-interaction-store.mjs';
import {createWorldGameHandler} from '../gateway/world-game-handler.mjs';
import {projectWorldGame} from '../gateway/world-game-view.mjs';
import {createWorldGameClient} from '../game/world-client.mjs';
import {completeClient} from './support/office-journey.mjs';
if(process.env.ASCENSION_DISPOSABLE_PG!=='1'||process.env.PGHOST!=='127.0.0.1'||
 process.env.PGDATABASE!=='ascension_world_ci'||process.env.PGUSER!=='ascension_ci'||!process.env.WORLD_PG_MODULE_PATH)
 throw Error('Explicit disposable loopback PostgreSQL configuration required');
const {Pool}=createRequire(import.meta.url)(process.env.WORLD_PG_MODULE_PATH);
const pool=new Pool({max:5});
const identity={subject:'fixture-player-a'};
const csrf='fixture-only-world-csrf-value-123456';
if(process.env.WORLD_RESUME_WORKER==='1'){
 try{
  const store=createOwnerWorldInteractionStore({pool,authorizeWorld:async()=>true});
  const run=await store.loadCurrentRun(identity);
  assert.ok(run);console.log(JSON.stringify(projectWorldGame(identity,run)));
 }finally{await pool.end();}
}else test('disposable PostgreSQL: main client → HTTP → owner transaction → new-process resume',async t=>{
 await pool.query(await readFile(new URL('../gateway/migrations/001_player_runs.sql',import.meta.url),'utf8'));
 await pool.query('TRUNCATE ascension_player_runs');
 let allowed=true,active=true,handler,sequence=0;
 const authorizeWorld=async()=>allowed;
 const store=createOwnerWorldInteractionStore({pool,authorizeWorld});
 const adapter={auth:{resolveSession:async token=>({ok:true,authenticated:active&&['fixture-a','fixture-b'].includes(token),identityId:token==='fixture-b'?'fixture-player-b':identity.subject})},
  identity:{describe:async token=>({ok:true,authenticated:active,identity:{identityId:token==='fixture-b'?'fixture-player-b':identity.subject,status:'active'}})}};
 const server=createServer(async(req,res)=>{
  if(req.url==='/api/session'){
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify(active?{authenticated:true,identity:{id:identity.subject},csrf}:{authenticated:false,identity:null,csrf:null}));return;
  }
  if(!await handler(req,res)){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'not_found'}));}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 const build=selectedStore=>createWorldGameHandler({adapter,store:selectedStore,appOrigin:origin,uiOrigin:origin,newRunId:()=> 'fixture-world-'+(++sequence)});
 handler=build(store);
 const fetchAs=(token='fixture-a')=>(url,options={})=>fetch(url,{...options,headers:{...options.headers,Origin:origin,
  Cookie:'ascension_avcc_session='+token+';ascension_csrf='+csrf}});
 const makeClient=()=>createWorldGameClient({origin,fetchImpl:fetchAs()});
 const post=async(value,token='fixture-a')=>{
  const r=await fetchAs(token)(origin+'/api/game/world/actions',{method:'POST',headers:{'Content-Type':'application/json','X-Ascension-CSRF':csrf},body:JSON.stringify(value)});
  return {status:r.status,body:await r.json()};
 };
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await pool.end();});
 const client=makeClient();let accepted;
 await t.test('opening mission and NPC memory are committed through the actual client and API',async()=>{
  await client.refresh();assert.equal(client.snapshot().phase,'new_run');
  await client.begin();assert.equal(client.snapshot().phase,'ready');
  await completeClient(client,{resolution:'conceal'});
  accepted=client.snapshot().view;
  assert.equal(accepted.mission.complete,true);assert.ok(accepted.revision>7);
  assert.equal(accepted.caseFile.glitch.resolution,'conceal');assert.equal(accepted.world.width,9);
  const resumed=makeClient();await resumed.refresh();assert.deepEqual(resumed.snapshot().view,accepted);
 });
 await t.test('a new Node process restores exactly the same player-visible state from PostgreSQL',async()=>{
  const workerEnvironment={...process.env,WORLD_RESUME_WORKER:'1'};
  delete workerEnvironment.NODE_TEST_CONTEXT;
  const result=await promisify(execFile)(process.execPath,[fileURLToPath(import.meta.url)],{
   env:workerEnvironment,timeout:15000,maxBuffer:65536});
  assert.deepEqual(JSON.parse(result.stdout),accepted);
 });
 await t.test('concurrent actions commit one revision and reject the stale contender',async()=>{
  const value={runId:accepted.runId,expectedRevision:accepted.revision,command:accepted.actions.find(a=>a.command.type==='move').command};
  const results=await Promise.all([post(value),post(value)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const current=await store.loadCurrentRun(identity);assert.equal(current.revision,accepted.revision+1);
 });
 await t.test('wrong owner, denied permission and failure after SQL UPDATE preserve saved state',async()=>{
  const before=await store.loadCurrentRun(identity);
  const value={runId:before.id,expectedRevision:before.revision,command:projectWorldGame(identity,before).actions.find(a=>a.command.type==='move').command};
  assert.equal((await post(value,'fixture-b')).status,404);
  allowed=false;assert.equal((await post(value)).status,403);allowed=true;
  const failingPool={connect:async()=>{
   const connection=await pool.connect();
   return {release:()=>connection.release(),query:async(sql,args)=>{
    const result=await connection.query(sql,args);
    if(sql.startsWith('UPDATE ascension_player_runs'))throw Error('fixture-private-database-detail');
    return result;
   }};
  }};
  handler=build(createOwnerWorldInteractionStore({pool:failingPool,authorizeWorld}));
  const failed=await post(value);assert.equal(failed.status,503);
  assert.equal(JSON.stringify(failed.body).includes('fixture-private-database-detail'),false);
  handler=build(store);assert.deepEqual(await store.loadCurrentRun(identity),before);
 });
 await t.test('inactive identity clears the client view without changing the saved run',async()=>{
  const before=await store.loadCurrentRun(identity);
  active=false;await client.refresh();assert.equal(client.snapshot().phase,'signed_out');
  assert.equal(client.snapshot().view,null);assert.deepEqual(await store.loadCurrentRun(identity),before);
 });
});
