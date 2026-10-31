// Owner-scoped cutscene continuation. This is NOT a complete choice executor.
import {continueRecoveredCutscene} from './recovered-cutscene-sequence.mjs';
const valid=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(x);
const cutscene=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
const fail=(message,status)=>Object.assign(new Error(message),{status});
export function createOwnerCutsceneTransaction({pool,authorizeChapter}){
 if(!pool?.connect||typeof authorizeChapter!=='function')throw new TypeError('Server database and authorization required');
 return Object.freeze({async continueCutscene(identity,runId,input){
  if(!valid(identity?.subject))throw fail('authentication_required',401);
  if(!valid(runId)||!cutscene(input?.cutsceneKey)||!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)throw fail('invalid_continuation',422);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const result=await client.query('SELECT id,owner_subject,revision,state FROM ascension_player_runs WHERE id=$1 FOR UPDATE',[runId]);
   const run=result.rows[0];
   if(!run||run.owner_subject!==identity.subject)throw fail('not_found',404);
   if(Number(run.revision)!==input.expectedRevision)throw fail('stale_revision',409);
   if(await authorizeChapter(identity,run.state,input,client)!==true)throw fail('chapter_denied',403);
   const state=structuredClone(run.state);
   // Opening transition must complete canonical board and marker setup before
   // cutscene continuation can be authoritative. Do not silently skip it.
   if(state.pendingCanonicalTasks?.some(task=>['ensureWorldTaskBoard','syncTaskMarkers'].includes(task)))
    throw fail('opening_setup_pending',409);
   const nextCutscene=continueRecoveredCutscene(state,input.cutsceneKey);
   const saved=await client.query('UPDATE ascension_player_runs SET state=$1::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$2 AND owner_subject=$3 AND revision=$4 RETURNING id,revision,state',[JSON.stringify(state),runId,identity.subject,run.revision]);
   if(saved.rows.length!==1)throw fail('stale_revision',409);
   await client.query('COMMIT');
   return {id:saved.rows[0].id,revision:Number(saved.rows[0].revision),state:saved.rows[0].state,nextCutscene};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 }});
}
