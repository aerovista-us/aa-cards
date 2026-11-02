// Owner-scoped bounded task completion transaction.
// Does not enable public gameplay until canonical render, readiness, reward
// and state parity authorities are supplied and verified.
import {completeRecoveredCellTask} from './recovered-cell-task-complete.mjs';
import {requirePersistedWorld} from './recovered-memory-map.mjs';
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const taskId=x=>typeof x==='string'&&/^[A-Za-z0-9:_.-]{1,160}$/.test(x);
const fail=(message,status)=>Object.assign(new Error(message),{status});
export function createOwnerTaskCompletionTransaction({pool,authorizeChapter,resolveCanonicalTaskContext}){
 if(!pool?.connect||typeof authorizeChapter!=='function'||typeof resolveCanonicalTaskContext!=='function')throw new TypeError('Required game authorities unavailable');
 return Object.freeze({async completeTask(identity,runId,input){
  if(!valid(identity?.subject))throw fail('authentication_required',401);
  if(!valid(runId)||!taskId(input?.storyletId)||!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)throw fail('invalid_task_completion',422);
  const client=await pool.connect();
  try {
   await client.query('BEGIN');
   const row=await client.query('SELECT id,owner_subject,revision,state FROM ascension_player_runs WHERE id=$1 FOR UPDATE',[runId]);
   const run=row.rows[0];
   if(!run||run.owner_subject!==identity.subject)throw fail('not_found',404);
   if(Number(run.revision)!==input.expectedRevision)throw fail('stale_revision',409);
   if(await authorizeChapter(identity,run.state,input,client)!==true)throw fail('chapter_denied',403);
   const state=structuredClone(run.state);requirePersistedWorld(state);
   if(state.activeCutsceneKey||state.pendingCutsceneQueue?.length)throw fail('cutscene_pending',409);
   const context=await resolveCanonicalTaskContext(state,input,{identity,client});
   if(!context||!context.authoritative)throw fail('unverified_task_context',422);
   const result=completeRecoveredCellTask({...context,storyletId:input.storyletId});
   requirePersistedWorld(state);
   const saved=await client.query('UPDATE ascension_player_runs SET state=$1::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$2 AND owner_subject=$3 AND revision=$4 RETURNING id,revision,state',[JSON.stringify(state),runId,identity.subject,run.revision]);
   if(saved.rows.length!==1)throw fail('stale_revision',409);
   await client.query('COMMIT');
   return {...saved.rows[0],revision:Number(saved.rows[0].revision),taskResult:result};
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }});
}
