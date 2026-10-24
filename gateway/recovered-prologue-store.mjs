// Persist a bounded recovered opening transition under the run-owner revision lock.
// This does not implement or authorize new gameplay. All rules come from v4 helpers.
import {buildRecoveredPrologueTransition,claimNextRecoveredCutscene,acknowledgeRecoveredCutscene} from './recovered-prologue-transition.mjs';
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const deny=(message,status)=>Object.assign(new Error(message),{status});
export function createRecoveredPrologueStore({pool,afterlifeWorld,authorizeRun}){
 if(!pool?.connect||typeof authorizeRun!=='function'||afterlifeWorld?.id!=='AFTERLIFE')
  throw new Error('Owner-scoped persistence and authoritative Afterlife world required');
 async function transact(identity,runId,expectedRevision,action){
  if(!valid(identity?.subject))throw deny('authentication_required',401);
  if(!valid(runId)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)
   throw deny('invalid_run_request',422);
  const client=await pool.connect();
  let began=false;
  try{
   await client.query('BEGIN');began=true;
   const result=await client.query('SELECT id,owner_subject,revision,state FROM ascension_player_runs WHERE id=$1 FOR UPDATE',[runId]);
   const run=result.rows[0];
   if(!run||run.owner_subject!==identity.subject)throw deny('not_found',404);
   if(Number(run.revision)!==expectedRevision)throw deny('stale_revision',409);
   if(await authorizeRun(identity,run.state,client)!==true)throw deny('run_forbidden',403);
   // No mutation may escape the transaction. Validate all next states.
   const next=action(structuredClone(run.state));
   if(!next||typeof next!=='object'||Array.isArray(next))throw deny('invalid_next_state',422);
   const updated=await client.query('UPDATE ascension_player_runs SET state=$1::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$2 AND owner_subject=$3 AND revision=$4 RETURNING id,revision,state',
     [JSON.stringify(next),runId,identity.subject,run.revision]);
   if(updated.rows.length!==1)throw deny('stale_revision',409);
   await client.query('COMMIT');began=false;
   return {...updated.rows[0],revision:Number(updated.rows[0].revision)};
  }catch(e){if(began)await client.query('ROLLBACK');throw e}finally{client.release()}
 }
 return Object.freeze({
  commitEarthDeath(identity,runId,expectedRevision){
   return transact(identity,runId,expectedRevision,state=>buildRecoveredPrologueTransition(state,afterlifeWorld));
  },
  claimCutscene(identity,runId,expectedRevision){
   return transact(identity,runId,expectedRevision,state=>{
    if(state.currentWorld!=='AFTERLIFE')throw deny('cutscene_unavailable',422);
    return claimNextRecoveredCutscene(state).state;
   });
  },
  acknowledgeCutscene(identity,runId,expectedRevision,key){
   return transact(identity,runId,expectedRevision,state=>acknowledgeRecoveredCutscene(state,key));
  }
 });
}
