// Bounded owner-locked end-turn acceptance on disposable PostgreSQL 16.
// Fixture authority only: NOT recovered-browser parity or playable API authorization.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createOwnerEndTurnTransaction} from '../gateway/owner-end-turn-transaction.mjs';
const {Pool}=createRequire(import.meta.url)(process.env.PG_MODULE_PATH);
const pool=new Pool({host:'127.0.0.1',port:Number(process.env.TEST_PG_PORT),user:'postgres',password:'disposable-only',database:'ascension_accept',max:4});
const id='m18-end-turn-accept';
const initial={seedString:'m18-owner-pg',rngDraws:0,currentWorld:'AFTERLIFE',turn:2,maxActionPoints:4,actionPoints:0,heat:2,cooldowns:{a:2},npcs:{},consequences:{timeline:0},storyMemory:{pendingEchoes:[],worldTaskBoard:{AFTERLIFE:{key:'k',tasks:[{id:'x',x:0,y:0,mobility:'static'}]}}},worldMap:{width:1,height:1,tiles:[{spawns:[]}]}};
const service=createOwnerEndTurnTransaction({pool,authorizeChapter:async()=>true,resolveCanonicalTurnContext:()=>({authoritative:true,ui:{},inBounds:()=>true,syncTaskMarkers:()=>{},noteTurn:()=>{}})});
const read=async()=>(await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1',[id])).rows[0];
try{
 await pool.query('INSERT INTO ascension_player_runs(id,owner_subject,revision,state) VALUES($1,$2,0,$3::jsonb)',[id,'alice',JSON.stringify(initial)]);
 const calls=await Promise.allSettled([service.endTurn({subject:'alice'},id,{expectedRevision:0}),service.endTurn({subject:'alice'},id,{expectedRevision:0})]);
 assert.equal(calls.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(calls.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
 const winner=calls.find(x=>x.status==='fulfilled').value;
 assert.equal(winner.revision,1);assert.equal(winner.state.turn,3);assert.equal(winner.state.actionPoints,4);
 assert.ok(winner.state.rngDraws>0);assert.deepEqual((await read()).state,winner.state);
 await assert.rejects(service.endTurn({subject:'bob'},id,{expectedRevision:1}),e=>e.status===404);
 const before=await read();
 await assert.rejects(service.endTurn({subject:'alice'},id,{expectedRevision:1,seedString:'tamper'}),e=>e.status===422);
 assert.deepEqual(await read(),before);
 console.log('PASS disposable PG end-turn: one CAS winner, foreign owner denied, client state override rejected, full state/RNG persisted');
}finally{await pool.end()}
