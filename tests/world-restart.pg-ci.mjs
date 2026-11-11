// CI-only disposable database restart proof. Never a production recovery certificate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createOwnerWorldInteractionStore} from '../gateway/owner-world-interaction-store.mjs';
import {projectWorldGame} from '../gateway/world-game-view.mjs';

if(process.env.ASCENSION_DISPOSABLE_PG!=='1'||process.env.PGHOST!=='127.0.0.1'||
 process.env.PGDATABASE!=='ascension_world_ci'||process.env.PGUSER!=='ascension_ci'||
 !process.env.WORLD_PG_MODULE_PATH||!process.env.RUNNER_TEMP||!process.env.OFFICE_ARTIFACT_DIR||
 !['before','after'].includes(process.env.WORLD_RESTART_PHASE))
 throw Error('Explicit disposable CI restart configuration required');
const {Pool}=createRequire(import.meta.url)(process.env.WORLD_PG_MODULE_PATH);
const pool=new Pool({max:2});
const identity={subject:'fixture-player-a'},other={subject:'fixture-player-b'};
const baselinePath=join(process.env.RUNNER_TEMP,'ascension-restart-baseline.json');
// Compare every persisted field; preserve array order and omit no state fields.
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value instanceof Date)return value.toISOString();
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const allRows=async()=> (await pool.query('SELECT * FROM ascension_player_runs ORDER BY id')).rows;
const started=async()=> (await pool.query('SELECT pg_postmaster_start_time() AS started')).rows[0].started.toISOString();

test('disposable PostgreSQL service restart: complete committed state and owner boundary',async t=>{
 t.after(()=>pool.end());
 const rows=await allRows(),store=createOwnerWorldInteractionStore({pool,authorizeWorld:async()=>true});
 const run=await store.loadCurrentRun(identity);
 assert.ok(run,'authored journey fixture required');
 const view=projectWorldGame(identity,run);
 assert.equal(view.world.id,'afterlife-hallway');
 assert.equal(view.mission.complete,true);
 assert.equal(view.hallway.inspectionComplete,true);
 assert.equal(view.caseFile.glitch.resolution,'conceal');
 const choice=rows.find(row=>row.id==='recovered-choice-fixture');
 const scene=rows.find(row=>row.id==='recovered-scene-fixture');
 assert.equal(Number(choice?.revision),1);
 assert.equal(Number(scene?.revision),3);
 assert.equal(scene.state.activeCutsceneKey,null);
 assert.deepEqual(scene.state.pendingCutsceneQueue,[]);
 const checkpoint={rows:rows.length,complete_rows_sha256:digest(rows),owned_run_sha256:digest(run),
  public_view_sha256:digest(view),server_started:await started()};
 if(process.env.WORLD_RESTART_PHASE==='before'){
  await writeFile(baselinePath,JSON.stringify(checkpoint),{flag:'wx',mode:0o600});
  return;
 }
 const before=JSON.parse(await readFile(baselinePath,'utf8'));
 assert.ok(Date.parse(checkpoint.server_started)>Date.parse(before.server_started),'PostgreSQL must actually restart');
 for(const key of ['rows','complete_rows_sha256','owned_run_sha256','public_view_sha256'])
  assert.equal(checkpoint[key],before[key],key+' must survive restart');
 // Use the actual saved run, never a nonexistent substitute, for owner denial.
 const command=view.actions.find(action=>action.command.type==='move')?.command;
 assert.ok(command,'committed journey must remain actionable');
 const input={expectedRevision:run.revision,command};
 await assert.rejects(store.loadRun(other,run.id),e=>e.status===404);
 await assert.rejects(store.commitAction(other,run.id,input),e=>e.status===404);
 await assert.rejects(store.createRun(identity,'fixture-restart-forbidden-fork'),e=>e.status===409&&e.message==='run_exists');
 assert.equal(digest(await allRows()),before.complete_rows_sha256,'denials must preserve all persisted fields');
 const saved=await store.commitAction(identity,run.id,input);
 assert.equal(saved.revision,run.revision+1);
 assert.equal(digest((await store.loadCurrentRun(identity)).state),digest(saved.state));
 assert.equal(digest(saved.state.rng),digest(run.state.rng),'movement must not reroll assessment RNG');
 await assert.rejects(store.commitAction(identity,run.id,input),e=>e.status===409);
 assert.equal(digest((await store.loadCurrentRun(identity)).state),digest(saved.state),'stale retry must preserve resumed state');
 await mkdir(process.env.OFFICE_ARTIFACT_DIR,{recursive:true});
 await writeFile(join(process.env.OFFICE_ARTIFACT_DIR,'database-restart.json'),JSON.stringify({
  phase:'PASS',scope:'disposable-authored-and-bounded-recovered-fixtures-only',
  source_revision:process.env.ASCENSION_CANDIDATE_REVISION||null,
  checks:{database_service_restarted:true,complete_persisted_rows_unchanged:true,
   private_run_and_public_view_unchanged:true,same_run_cross_owner_denied:true,
   duplicate_creation_denied:true,denials_preserved_all_rows:true,resumed_action_committed:true,
   stale_retry_denied:true,rng_preserved:true},
  fixture_row_count:before.rows,checkpoint_sha256:before.complete_rows_sha256,
  live_account_acceptance:'NOT_RUN',production_backup_restore:'NOT_RUN',full_recovered_parity:'NOT_RUN',
  production_gameplay_map_cloud_saves:'DISABLED'
 },null,2)+'\n',{flag:'wx',mode:0o600});
});
