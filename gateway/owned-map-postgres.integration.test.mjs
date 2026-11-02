import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {buildRecoveredWorldMap} from './recovered-map-builder.mjs';
import {createOwnedMapSession} from './owned-map-session.mjs';
import {validateMapView} from '../phaser-lab/authority/view-contract.mjs';

const envKeys=['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE'];
for(const key of envKeys){
 if(!process.env[key])throw new Error('Disposable PostgreSQL CI database required: '+key);
}
if(process.env.PGHOST!=='127.0.0.1'||process.env.PGDATABASE!=='ascension_map_test')
 throw new Error('Refusing to run against a non-disposable or remote database');

const pool=new pg.Pool({
 host:process.env.PGHOST,port:Number(process.env.PGPORT),
 user:process.env.PGUSER,password:process.env.PGPASSWORD,
 database:process.env.PGDATABASE,max:2,connectionTimeoutMillis:3000
});
const worlds=JSON.parse(readFileSync(new URL('./recovered-v4/worlds.json',import.meta.url),'utf8')).worlds;
const office=worlds.find(w=>w.id==='AFTERLIFE');
function saved(seed){
 return buildRecoveredWorldMap({
  seedString:seed,rngDraws:0,currentWorld:'NONE',turn:0,
  pos:{x:0,y:0},storyMemory:{future:'do-not-expose'},
  pendingCutsceneQueue:['private-event']
 },office);
}
async function insert(id,owner,revision,state,when){
 await pool.query(
  'INSERT INTO ascension_player_runs(id,owner_subject,revision,state,updated_at) VALUES($1,$2,$3,$4::jsonb,$5::timestamptz)',
  [id,owner,String(revision),JSON.stringify(state),when]
 );
}
test('disposable PostgreSQL owner-run read is real, scoped, redacted and revision-safe',async()=>{
 try{
  const schema=readFileSync(new URL('./migrations/001_player_runs.sql',import.meta.url),'utf8');
  await pool.query(schema);
  await pool.query('TRUNCATE TABLE ascension_player_runs');
  const older=saved('older'),latest=saved('newest'),bob=saved('bob-only');
  latest.worldMap.tiles[latest.pos.y*latest.worldMap.width+latest.pos.x].spawns.push({
   id:'spawn-private',type:'loot',tag:'clerks',charges:1,cooldown:0,respawn:8,discovered:false
  });
  await insert('alice-old','alice',2,older,'2026-11-01T10:00:00Z');
  await insert('alice-new','alice',5,latest,'2026-11-02T10:00:00Z');
  await insert('bob-run','bob',3,bob,'2026-11-02T12:00:00Z');

  // This is an in-process fixture subject, NOT a substitute for real AVCC
  // authentication; the production bridge must supply verified identities.
  const calls=[];
  const service=createOwnedMapSession({
   pool,
   async resolveIdentity(req){return req?.fixtureIdentity?{subject:req.fixtureIdentity}:null;},
   async authorizeMapView(identity){calls.push(['grant',identity.subject]);return identity.subject!=='denied';},
   async listVisibleMarkers(){return [];}
  });
  const alice=validateMapView(await service.getMap({fixtureIdentity:'alice'}));
  assert.equal(alice.sessionId,'alice-new','latest per-owner run must be selected');
  assert.equal(alice.revision,5);
  assert.deepEqual(alice.player,latest.pos);
  assert.equal(alice.world,'AFTERLIFE');
  const json=JSON.stringify(alice);
  for(const secret of ['private-event','spawn-private','do-not-expose','seedString','rngDraws','spawns','owner_subject'])
   assert.ok(!json.includes(secret),'leaked '+secret);

  const other=validateMapView(await service.getMap({fixtureIdentity:'bob'}));
  assert.equal(other.sessionId,'bob-run');
  assert.equal(other.revision,3);
  await assert.rejects(()=>service.getMap({fixtureIdentity:'charlie'}),e=>e.status===404);
  await assert.rejects(()=>service.getMap({fixtureIdentity:'denied'}),e=>e.status===403);
  await assert.rejects(()=>service.getMap({fixtureIdentity:'alice OR 1=1'}),e=>e.status===401);
  await assert.rejects(()=>service.getMap({}),e=>e.status===401);
  assert.ok(calls.some(([type,who])=>type==='grant'&&who==='alice'));

  // PostgreSQL int8 overflows safe JS integer range; reject instead of
  // silently rounding a revision and applying a stale client state.
  await insert('alice-overflow','alice','9007199254740993',saved('overflow'),'2026-11-02T13:00:00Z');
  await assert.rejects(()=>service.getMap({fixtureIdentity:'alice'}),e=>e.status===503);

  // The read gateway must not have changed any stored bytes/revisions.
  const row=await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',['alice-new']);
  assert.equal(row.rows[0].revision,'5');
  assert.deepEqual(row.rows[0].state,latest);
 }finally{
  await pool.query('DROP TABLE IF EXISTS ascension_player_runs');
  await pool.end();
 }
});
