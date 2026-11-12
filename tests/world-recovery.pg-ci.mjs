// Synthetic CI fixtures only. Never connect this rehearsal to production storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOwnerWorldInteractionStore} from '../gateway/owner-world-interaction-store.mjs';
import {projectWorldGame} from '../gateway/world-game-view.mjs';

const env=process.env,sourceContainer=env.POSTGRES_CI_CONTAINER;
if(env.GITHUB_ACTIONS!=='true'||env.ASCENSION_DISPOSABLE_PG!=='1'||env.PGHOST!=='127.0.0.1'||
 env.PGDATABASE!=='ascension_world_ci'||env.PGUSER!=='ascension_ci'||
 !env.WORLD_PG_MODULE_PATH||!env.RUNNER_TEMP||!env.OFFICE_ARTIFACT_DIR||
 !/^[a-f0-9]{64}$/.test(sourceContainer||''))throw Error('Explicit disposable GitHub CI recovery configuration required');
const {Pool}=createRequire(import.meta.url)(env.WORLD_PG_MODULE_PATH);
const execute=promisify(execFile);
const docker=(args,options={})=>execute('docker',args,{timeout:30000,maxBuffer:8*1024*1024,...options});
const identity={subject:'fixture-player-a'},foreign={subject:'fixture-player-b'};
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value instanceof Date)return value.toISOString();
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const rows=async pool=>(await pool.query('SELECT * FROM ascension_player_runs ORDER BY id')).rows;
function restoredPool(port,restricted=false){
 if(!/^\d{4,5}$/.test(String(port))||Number(port)===Number(env.PGPORT||5432)||Number(port)>65535)
  throw Error('Distinct disposable restore loopback port required');
 return new Pool({host:'127.0.0.1',port:Number(port),database:'ascension_world_ci',
  user:restricted?'ascension_game_restore_ci':'ascension_ci',
  password:restricted?'disposable-role-only':'disposable-ci-only',
  max:2,connectionTimeoutMillis:3000,query_timeout:5000});
}

if(env.WORLD_RECOVERY_RESUME_WORKER==='1'){
 const pool=restoredPool(env.WORLD_RESTORE_PGPORT,true);
 try{
  const store=createOwnerWorldInteractionStore({pool,authorizeWorld:async()=>true});
  const run=await store.loadCurrentRun(identity);
  console.log(JSON.stringify({run_sha256:digest(run)}));
 }finally{await pool.end();}
}else test('backup → fresh PostgreSQL volume → restricted-role action and new-process resume',async()=>{
 const source=new Pool({max:2,connectionTimeoutMillis:3000,query_timeout:5000});
 const name='ascension-restore-ci-'+randomUUID(),pools=[source];
 let temporary,report;
 try{
  const originalRows=await rows(source),sourceDigest=digest(originalRows);
  const originalStore=createOwnerWorldInteractionStore({pool:source,authorizeWorld:async()=>true});
  const originalRun=await originalStore.loadCurrentRun(identity);
  assert.ok(originalRun,'committed authored journey fixture required');
  assert.ok(originalRows.some(row=>row.id==='recovered-choice-fixture'),'bounded recovered fixtures required');
  const image=(await docker(['inspect','--format','{{.Image}}',sourceContainer])).stdout.trim();
  assert.match(image,/^sha256:[a-f0-9]{64}$/);
  temporary=await mkdtemp(join(env.RUNNER_TEMP,'ascension-recovery-'));
  const archive=join(temporary,'synthetic.dump');
  const dump=await docker(['exec',sourceContainer,'pg_dump','-U','ascension_ci','-d','ascension_world_ci',
   '--format=custom','--no-owner','--no-acl'],{encoding:'buffer'});
  assert.ok(dump.stdout.length>0);
  await writeFile(archive,dump.stdout,{mode:0o600,flag:'wx'});
  const sourceSystem=(await source.query('SELECT system_identifier::text AS id FROM pg_control_system()')).rows[0].id;
  await docker(['run','--pull','never','--detach','--name',name,
   '--publish','127.0.0.1::5432','--env','POSTGRES_DB=ascension_world_ci',
   '--env','POSTGRES_USER=ascension_ci','--env','POSTGRES_PASSWORD=disposable-ci-only',image]);
  const deadline=Date.now()+30000;let ready=false;
  while(Date.now()<deadline){
   try{await docker(['exec',name,'pg_isready','-h','127.0.0.1','-U','ascension_ci','-d','ascension_world_ci'],{timeout:2000});ready=true;break;}
   catch{await new Promise(resolve=>setTimeout(resolve,500));}
  }
  assert.equal(ready,true,'fresh restore cluster readiness');
  const published=(await docker(['port',name,'5432/tcp'])).stdout.trim();
  assert.match(published,/^127\.0\.0\.1:\d{4,5}$/);
  const port=published.split(':')[1],admin=restoredPool(port);pools.push(admin);
  const freshSystem=(await admin.query('SELECT system_identifier::text AS id FROM pg_control_system()')).rows[0].id;
  assert.notEqual(freshSystem,sourceSystem,'restore requires an independently initialized cluster');
  assert.equal((await admin.query("SELECT to_regclass('public.ascension_player_runs') AS name")).rows[0].name,null);
  await docker(['cp',archive,name+':/tmp/synthetic.dump']);
  await docker(['exec',name,'pg_restore','--exit-on-error','--no-owner','--no-acl',
   '-U','ascension_ci','-d','ascension_world_ci','/tmp/synthetic.dump']);
  assert.equal(digest(await rows(admin)),sourceDigest,'every persisted row field must restore unchanged');
  // Idempotent candidate migration must not mutate restored state.
  await admin.query(await readFile(new URL('../gateway/migrations/001_player_runs.sql',import.meta.url),'utf8'));
  assert.equal(digest(await rows(admin)),sourceDigest);
  // The fixture application role is neither the database/table owner nor a
  // superuser. This is table-level least privilege, not database row security.
  await admin.query("CREATE ROLE ascension_game_restore_ci LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD 'disposable-role-only'");
  await admin.query('REVOKE ALL ON DATABASE ascension_world_ci FROM PUBLIC');
  await admin.query('GRANT CONNECT ON DATABASE ascension_world_ci TO ascension_game_restore_ci');
  await admin.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');
  await admin.query('GRANT USAGE ON SCHEMA public TO ascension_game_restore_ci');
  await admin.query('GRANT SELECT,INSERT,UPDATE ON ascension_player_runs TO ascension_game_restore_ci');
  const app=restoredPool(port,true);pools.push(app);
  for(const sql of ['DELETE FROM ascension_player_runs WHERE false','TRUNCATE ascension_player_runs',
   'ALTER TABLE ascension_player_runs ADD COLUMN forbidden text','CREATE TABLE public.forbidden(id int)',
   'CREATE TEMP TABLE forbidden(id int)','CREATE ROLE forbidden'])
   await assert.rejects(app.query(sql),error=>error.code==='42501');
  let allowed=true;
  const store=createOwnerWorldInteractionStore({pool:app,authorizeWorld:async()=>allowed});
  const restored=await store.loadCurrentRun(identity);
  assert.equal(digest(restored),digest(originalRun),'private run, revision and RNG must survive restore');
  const view=projectWorldGame(identity,restored);
  assert.equal(digest(view),digest(projectWorldGame(identity,originalRun)));
  const command=view.actions.find(action=>action.command.type==='move')?.command;
  assert.ok(command);
  const input={expectedRevision:restored.revision,command};
  await assert.rejects(store.loadRun(foreign,restored.id),error=>error.status===404);
  await assert.rejects(store.commitAction(foreign,restored.id,input),error=>error.status===404);
  await assert.rejects(store.createRun(identity,'fixture-recovery-forbidden-fork'),error=>error.status===409);
  allowed=false;await assert.rejects(store.commitAction(identity,restored.id,input),error=>error.status===403);allowed=true;
  assert.equal(digest(await rows(admin)),sourceDigest,'denials must preserve every restored row');
  const saved=await store.commitAction(identity,restored.id,input);
  assert.equal(saved.revision,restored.revision+1);
  assert.equal(digest(saved.state.rng),digest(restored.state.rng));
  await assert.rejects(store.commitAction(identity,restored.id,input),error=>error.status===409);
  const expected=await store.loadCurrentRun(identity);
  const childEnv={...env,WORLD_RECOVERY_RESUME_WORKER:'1',WORLD_RESTORE_PGPORT:port};delete childEnv.NODE_TEST_CONTEXT;
  const child=await execute(process.execPath,[fileURLToPath(import.meta.url)],{env:childEnv,timeout:15000,maxBuffer:65536});
  assert.equal(JSON.parse(child.stdout).run_sha256,digest(expected));
  // A corrupt archive may not create an accepted store.
  await admin.query('CREATE DATABASE ascension_corrupt_ci');
  await writeFile(join(temporary,'corrupt.dump'),'invalid synthetic archive',{mode:0o600,flag:'wx'});
  await docker(['cp',join(temporary,'corrupt.dump'),name+':/tmp/corrupt.dump']);
  await assert.rejects(docker(['exec',name,'pg_restore','--exit-on-error','-U','ascension_ci',
   '-d','ascension_corrupt_ci','/tmp/corrupt.dump']),error=>Number.isInteger(error.code)&&error.code!==0);
  const corrupt=new Pool({host:'127.0.0.1',port:Number(port),database:'ascension_corrupt_ci',
   user:'ascension_ci',password:'disposable-ci-only',max:1});pools.push(corrupt);
  assert.equal((await corrupt.query("SELECT to_regclass('public.ascension_player_runs') AS name")).rows[0].name,null);
  assert.equal(digest(await rows(source)),sourceDigest,'recovery rehearsal must not mutate the source fixture database');
  report={phase:'PASS',scope:'synthetic-disposable-database-recovery-only',
   source_revision:env.ASCENSION_CANDIDATE_REVISION||null,
   checks:{fresh_cluster_and_volume:true,full_rows_restored:true,idempotent_migration_preserved_rows:true,
    restricted_role_denies_ddl_delete_truncate_temp_and_role_creation:true,
    private_run_rng_and_public_view_restored:true,same_run_cross_owner_denied:true,
    duplicate_create_denied:true,permission_denial_preserved_rows:true,resumed_action_committed:true,
    stale_retry_denied:true,new_process_resume:true,corrupt_archive_refused:true,source_rows_unchanged:true},
   fixture_row_count:originalRows.length,checkpoint_sha256:sourceDigest,
   live_account_acceptance:'NOT_RUN',production_storage_approval:'NOT_RUN',
   production_backup_restore:'NOT_RUN',database_row_level_security:'NOT_IMPLEMENTED',
   production_gameplay_map_cloud_saves:'DISABLED'};
 }finally{
  const ended=await Promise.allSettled(pools.reverse().map(pool=>pool.end()));
  // Remove only this uniquely named, newly created fixture container and its
  // anonymous data volume. Never reuse or remove the source service container.
  const owned=(await docker(['ps','--all','--quiet','--filter','name=^/'+name+'$'])).stdout.trim();
  if(owned)await docker(['rm','--force','--volumes',name]);
  if(temporary)await rm(temporary,{recursive:true,force:true});
  if(ended.some(result=>result.status==='rejected'))throw Error('Disposable recovery pool cleanup failed');
 }
 await mkdir(env.OFFICE_ARTIFACT_DIR,{recursive:true});
 await writeFile(join(env.OFFICE_ARTIFACT_DIR,'database-recovery.json'),JSON.stringify({
  ...report,checks:{...report.checks,temporary_container_volume_and_archives_removed:true}
 },null,2)+'\n',{mode:0o600,flag:'wx'});
});
