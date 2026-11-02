// Owner-locked, revision-checked bounded board initialization; not a public API.
import {setupRecoveredOpeningBoardWithRng} from './recovered-opening-board-rng.mjs';
import {requirePersistedWorld} from './recovered-memory-map.mjs';
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const fail=(message,status)=>Object.assign(new Error(message),{status});
export function createOwnerOpeningBoardTransaction({pool,authorizeChapter,resolveCanonicalBoardContext}){
 if(!pool?.connect||typeof authorizeChapter!=='function'||typeof resolveCanonicalBoardContext!=='function')throw new TypeError('Required opening authorities unavailable');
 return Object.freeze({async initializeBoard(identity,runId,input){
  if(!valid(identity?.subject))throw fail('authentication_required',401);
  if(!valid(runId)||!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)throw fail('invalid_board_setup',422);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const result=await client.query('SELECT id,owner_subject,revision,state FROM ascension_player_runs WHERE id=$1 FOR UPDATE',[runId]);
   const run=result.rows[0];
   if(!run||run.owner_subject!==identity.subject)throw fail('not_found',404);
   if(Number(run.revision)!==input.expectedRevision)throw fail('stale_revision',409);
   if(await authorizeChapter(identity,run.state,input,client)!==true)throw fail('chapter_denied',403);
   requirePersistedWorld(run.state);
   const options=await resolveCanonicalBoardContext(structuredClone(run.state),{identity,client});
   if(!options||typeof options!=='object'||Object.hasOwn(options,'rand'))throw fail('unverified_board_authority',422);
   const {state,board}=setupRecoveredOpeningBoardWithRng(run.state,options);
   requirePersistedWorld(state);
   const saved=await client.query('UPDATE ascension_player_runs SET state=$1::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$2 AND owner_subject=$3 AND revision=$4 RETURNING id,revision,state',[JSON.stringify(state),runId,identity.subject,run.revision]);
   if(saved.rows.length!==1)throw fail('stale_revision',409);
   await client.query('COMMIT');
   return {id:saved.rows[0].id,revision:Number(saved.rows[0].revision),state:saved.rows[0].state,taskCount:board.tasks.length};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 }});
}
