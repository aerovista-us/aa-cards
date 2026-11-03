// M18 bounded owner-locked end-turn step. NOT a full first-hour executor or public route.
// Requires server-derived canonical callbacks. Never trusts client-supplied state/RNG/UI.
import {simulateRecoveredEndTurn} from './recovered-end-turn-pipeline.mjs';
import {requirePersistedWorld} from './recovered-memory-map.mjs';
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const fail=(message,status)=>Object.assign(new Error(message),{status});
export function createOwnerEndTurnTransaction({pool,authorizeChapter,resolveCanonicalTurnContext}={}){
 if(!pool?.connect||typeof authorizeChapter!=='function'||typeof resolveCanonicalTurnContext!=='function')
  throw new TypeError('Required end-turn authorities unavailable');
 return Object.freeze({async endTurn(identity,runId,input){
  if(!valid(identity?.subject))throw fail('authentication_required',401);
  if(!valid(runId)||!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)
   throw fail('invalid_end_turn',422);
  // The client may submit only its expected revision. All other authority is server-side.
  if(Object.keys(input).some(k=>k!=='expectedRevision'))throw fail('untrusted_end_turn_input',422);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const result=await client.query('SELECT id,owner_subject,revision,state FROM ascension_player_runs WHERE id=$1 FOR UPDATE',[runId]);
   const run=result.rows[0];
   if(!run||run.owner_subject!==identity.subject)throw fail('not_found',404);
   if(Number(run.revision)!==input.expectedRevision)throw fail('stale_revision',409);
   if(await authorizeChapter(identity,run.state,input,client)!==true)throw fail('chapter_denied',403);
   requirePersistedWorld(run.state);
   const context=await resolveCanonicalTurnContext(structuredClone(run.state),{identity,client});
   if(!context||context.authoritative!==true||typeof context.inBounds!=='function'||
      typeof context.syncTaskMarkers!=='function'||typeof context.noteTurn!=='function')
    throw fail('unverified_turn_authority',422);
   const {state,events,moved}=simulateRecoveredEndTurn(run.state,{
    ui:context.ui||{},inBounds:context.inBounds,
    syncTaskMarkers:context.syncTaskMarkers,noteTurn:context.noteTurn
   });
   requirePersistedWorld(state);
   const saved=await client.query('UPDATE ascension_player_runs SET state=$1::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$2 AND owner_subject=$3 AND revision=$4 RETURNING id,revision,state',[JSON.stringify(state),runId,identity.subject,run.revision]);
   if(saved.rows.length!==1)throw fail('stale_revision',409);
   await client.query('COMMIT');
   return {id:saved.rows[0].id,revision:Number(saved.rows[0].revision),state:saved.rows[0].state,events,moved};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 }});
}
