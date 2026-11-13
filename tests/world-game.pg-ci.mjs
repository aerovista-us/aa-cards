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
import {createOfficeRun} from '../gateway/world-interaction-engine.mjs';
import {createWorldGameClient} from '../game/world-client.mjs';
import {completeClient,completeHallwayClient,completeState} from './support/office-journey.mjs';
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
 let client=makeClient(),accepted;
 await t.test('opening mission and NPC memory are committed through the actual client and API',async()=>{
  await client.refresh();assert.equal(client.snapshot().phase,'new_run');
  const secondTab=makeClient();await secondTab.refresh();assert.equal(secondTab.snapshot().phase,'new_run');
  const contenders=[client,secondTab];await Promise.all(contenders.map(c=>c.begin()));
  assert.deepEqual(contenders.map(c=>c.snapshot().phase).sort(),['conflict','ready']);
  client=contenders.find(c=>c.snapshot().phase==='ready');
  const count=await pool.query('SELECT count(*)::int AS count FROM ascension_player_runs WHERE owner_subject=$1',[identity.subject]);assert.equal(count.rows[0].count,1);
  await completeClient(client,{resolution:'conceal'});
  await completeHallwayClient(client);
  accepted=client.snapshot().view;
  assert.equal(accepted.mission.complete,true);assert.ok(accepted.revision>7);
  assert.equal(accepted.caseFile.glitch.resolution,'conceal');assert.equal(accepted.world.width,9);assert.equal(accepted.world.id,'afterlife-hallway');assert.equal(accepted.hallway.inspectionComplete,true);
  const resumed=makeClient();await resumed.refresh();assert.deepEqual(resumed.snapshot().view,accepted);
 });
 await t.test('retrying create after committed progress returns 409 without a fork, reset or RNG change',async()=>{
  const before=await store.loadCurrentRun(identity);
  for(let i=0;i<2;i++){
   const response=await fetchAs()(origin+'/api/game/world/runs',{method:'POST',headers:{'Content-Type':'application/json','X-Ascension-CSRF':csrf},body:'{}'});
   assert.equal(response.status,409);assert.deepEqual(await response.json(),{error:'run_exists'});
  }
  const count=await pool.query('SELECT count(*)::int AS count FROM ascension_player_runs WHERE owner_subject=$1',[identity.subject]);assert.equal(count.rows[0].count,1);
  assert.deepEqual(await store.loadCurrentRun(identity),before);
  const independent={subject:'fixture-independent-player'};await store.createRun(independent,'fixture-independent-run');assert.equal((await store.loadCurrentRun(independent)).id,'fixture-independent-run');
 });
 await t.test('historical duplicate or unsupported Office saves fail closed instead of selecting/resetting one',async()=>{
  const who={subject:'fixture-duplicate-player'};
  for(const id of ['fixture-duplicate-a','fixture-duplicate-b']){
   const state=createOfficeRun({ownerId:who.subject,runId:id});
   await pool.query('INSERT INTO ascension_player_runs (id,owner_subject,revision,state) VALUES ($1,$2,0,$3::jsonb)',[id,who.subject,JSON.stringify(state)]);
  }
  await assert.rejects(store.loadCurrentRun(who),e=>e.message==='ambiguous_run');
  await assert.rejects(store.createRun(who,'fixture-duplicate-c'),e=>e.message==='ambiguous_run');
  const oldOwner={subject:'fixture-unsupported-player'},old=createOfficeRun({ownerId:oldOwner.subject,runId:'fixture-unsupported-run'});old.schemaVersion=1;
  await pool.query('INSERT INTO ascension_player_runs (id,owner_subject,revision,state) VALUES ($1,$2,0,$3::jsonb)',[old.runId,old.ownerId,JSON.stringify(old)]);
  await assert.rejects(store.createRun(oldOwner,'fixture-unsupported-replacement'),/unsupported_save_version/);
  const count=await pool.query('SELECT count(*)::int AS count FROM ascension_player_runs WHERE owner_subject=$1',[oldOwner.subject]);assert.equal(count.rows[0].count,1);
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
 await t.test('prior schema-2 completed Office save upgrades without reset and persists on the next action',async()=>{
  const legacyOwner={subject:'fixture-legacy-player'},original=completeState(createOfficeRun({ownerId:legacyOwner.subject,runId:'fixture-legacy-run',seedString:'legacy-seed'}),{resolution:'conceal'});
  const legacy=structuredClone(original);legacy.schemaVersion=2;delete legacy.hallway;
  await pool.query('INSERT INTO ascension_player_runs (id,owner_subject,revision,state) VALUES ($1,$2,$3,$4::jsonb)',[legacy.runId,legacy.ownerId,legacy.revision,JSON.stringify(legacy)]);
  const loaded=await store.loadCurrentRun(legacyOwner);assert.deepEqual(loaded.state,original);
  const unchanged=await pool.query('SELECT state FROM ascension_player_runs WHERE id=$1',[legacy.runId]);assert.deepEqual(unchanged.rows[0].state,legacy);
  await store.commitAction(legacyOwner,legacy.runId,{expectedRevision:legacy.revision,command:{type:'inspect',target:'rolodex'}});
  const migrated=await store.loadCurrentRun(legacyOwner);assert.equal(migrated.state.schemaVersion,3);assert.equal(migrated.revision,legacy.revision+1);
  assert.deepEqual(migrated.state.rng,original.rng);assert.deepEqual(migrated.state.inventory,original.inventory);assert.deepEqual(migrated.state.consequences,original.consequences);
 });
 await t.test('current App Adapter grant denial preserves real PostgreSQL row and revision',async()=>{
  const {createWorldCapabilityAuthorizer}=await import('../gateway/world-capability-policy.mjs');
  const names={load:'fixture.world.load',create:'fixture.world.create',action:'fixture.world.action',travel:'fixture.world.travel',map:'fixture.world.map'};
  const grants=new Set(Object.values(names)),who={subject:'fixture-capability-player'};
  const adapter={identity:{can:async({identityId,capability})=>({ok:true,allowed:identityId===who.subject&&grants.has(capability)})}};
  const protectedStore=createOwnerWorldInteractionStore({pool,authorizeWorld:createWorldCapabilityAuthorizer({adapter,capabilityNames:names})});
  await protectedStore.createRun(who,'fixture-capability-run');
  await protectedStore.commitAction(who,'fixture-capability-run',{expectedRevision:0,command:{type:'inspect',target:'notice'}});
  const before=(await pool.query('SELECT * FROM ascension_player_runs WHERE id=$1',['fixture-capability-run'])).rows[0];
  grants.delete(names.travel);
  await assert.rejects(protectedStore.commitAction(who,'fixture-capability-run',
   {expectedRevision:1,command:{type:'travel',target:'exit'}}),e=>e.status===403);
  grants.delete(names.action);
  await assert.rejects(protectedStore.commitAction(who,'fixture-capability-run',
   {expectedRevision:1,command:{type:'move',dx:1,dy:0}}),e=>e.status===403);
  const after=(await pool.query('SELECT * FROM ascension_player_runs WHERE id=$1',['fixture-capability-run'])).rows[0];
  assert.deepEqual(after,before,'Denied grants cannot change row data or revision');
  grants.delete(names.load);
  await assert.rejects(protectedStore.loadRun(who,'fixture-capability-run'),e=>e.status===403);
  assert.deepEqual((await pool.query('SELECT * FROM ascension_player_runs WHERE id=$1',['fixture-capability-run'])).rows[0],before);
 });
 await t.test('inactive identity clears the client view without changing the saved run',async()=>{
  const before=await store.loadCurrentRun(identity);
  active=false;await client.refresh();assert.equal(client.snapshot().phase,'signed_out');
  assert.equal(client.snapshot().view,null);assert.deepEqual(await store.loadCurrentRun(identity),before);
 });
});
