// Separate Node process, separate PG connection: verify committed state after DB restart.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {Pool}=createRequire(import.meta.url)(process.env.PG_MODULE_PATH);
const pool=new Pool({host:'127.0.0.1',port:Number(process.env.TEST_PG_PORT),user:'postgres',password:'disposable-only',database:'ascension_accept'});
try{
 const {rows}=await pool.query('SELECT revision,state FROM ascension_player_runs WHERE id=$1 AND owner_subject=$2',['m18-accept','alice']);
 assert.equal(rows.length,1);assert.equal(Number(rows[0].revision),1);
 const s=rows[0].state;
 assert.equal(s.rngDraws,17);assert.equal(s.actionPoints,3);
 assert.equal(s.storyMemory.worldTaskBoard.AFTERLIFE.tasks[0].completed,true);
 assert.equal(s.worldMap.taskMarkers[0].completed,true);
 assert.equal(s.storyMemory.cellActionLock.completedIds[0],'desk');
 console.log('PASS: new Node process and new PG connection loaded unchanged committed task/reward/marker/RNG state after DB restart');
}finally{await pool.end()}
