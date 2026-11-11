// M19 server-only world-action transaction. Caller MUST supply verified AVCC session identity.
// No browser token, caller-supplied owner ID, or localStorage is accepted as authority.
import {applyWorldAction,createOfficeRun,restoreOfficeRun} from './world-interaction-engine.mjs';
const fail=(message,status)=>Object.assign(new Error(message),{status});
const id=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
export function createOwnerWorldInteractionStore({pool,authorizeWorld}={}){
 if(!pool?.connect||typeof authorizeWorld!=='function')throw new TypeError('Verified pool and world authorization required');
 const requireIdentity=identity=>{
  if(!id(identity?.subject))throw fail('authentication_required',401);
  return identity.subject;
 };
 async function withTransaction(fn){
  const client=await pool.connect();
  let discard;
  try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
  catch(e){try{await client.query('ROLLBACK');}catch(cleanupError){discard=cleanupError;}throw e;}
  finally{client.release(discard);}
 }
 return Object.freeze({
  async loadCurrentRun(identity){
   const owner=requireIdentity(identity),client=await pool.connect();
   try{
    const result=await client.query("SELECT id,revision,state FROM ascension_player_runs WHERE owner_subject=$1 AND state->>'location'='afterlife-placement-office' ORDER BY updated_at DESC,id ASC LIMIT 1",[owner]);
    const row=result.rows[0];
    if(await authorizeWorld(identity,{type:'load',...(row?{runId:row.id}:{})},client)!==true)throw fail('world_denied',403);
    if(!row)return null;
    const state=restoreOfficeRun(JSON.stringify(row.state),{ownerId:owner});
    if(state.runId!==row.id||state.revision!==Number(row.revision))throw fail('corrupt_revision',500);
    return {id:row.id,revision:Number(row.revision),state};
   }finally{client.release();}
  },
  async createRun(identity,runId){
   const owner=requireIdentity(identity);
   if(!id(runId))throw fail('invalid_run',422);
   return withTransaction(async client=>{
    if(await authorizeWorld(identity,{type:'create',runId},client)!==true)throw fail('world_denied',403);
    const state=createOfficeRun({ownerId:owner,runId});
    const saved=await client.query('INSERT INTO ascension_player_runs (id,owner_subject,revision,state) VALUES ($1,$2,0,$3::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id,revision,state',[runId,owner,JSON.stringify(state)]);
    if(saved.rows.length!==1)throw fail('run_exists',409);
    return {id:runId,revision:0,state};
   });
  },
  async loadRun(identity,runId){
   const owner=requireIdentity(identity);
   if(!id(runId))throw fail('invalid_run',422);
   const client=await pool.connect();
   try{
    const result=await client.query('SELECT id,revision,state FROM ascension_player_runs WHERE id=$1 AND owner_subject=$2',[runId,owner]);
    const row=result.rows[0];if(!row)throw fail('not_found',404);
    if(await authorizeWorld(identity,{type:'load',runId},client)!==true)throw fail('world_denied',403);
    const state=restoreOfficeRun(JSON.stringify(row.state),{ownerId:owner});
    if(state.runId!==runId||state.revision!==Number(row.revision))throw fail('corrupt_revision',500);
    return {id:runId,revision:Number(row.revision),state};
   }finally{client.release();}
  },
  async commitAction(identity,runId,input){
   const owner=requireIdentity(identity);
   if(!id(runId)||!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0||!input.command||typeof input.command!=='object')throw fail('invalid_action',422);
   return withTransaction(async client=>{
    const result=await client.query('SELECT id,owner_subject,revision,state FROM ascension_player_runs WHERE id=$1 AND owner_subject=$2 FOR UPDATE',[runId,owner]);
    const row=result.rows[0];if(!row||row.owner_subject!==owner)throw fail('not_found',404);
    if(Number(row.revision)!==input.expectedRevision)throw fail('stale_revision',409);
    if(await authorizeWorld(identity,{type:'action',runId,command:input.command},client)!==true)throw fail('world_denied',403);
    const previous=restoreOfficeRun(JSON.stringify(row.state),{ownerId:owner});
    if(previous.runId!==runId||previous.revision!==Number(row.revision))throw fail('corrupt_revision',500);
    let next;try{next=applyWorldAction(previous,input.command);}catch(e){throw fail(e.message,422);}
    const saved=await client.query('UPDATE ascension_player_runs SET state=$1::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$2 AND owner_subject=$3 AND revision=$4 RETURNING id,revision,state',[JSON.stringify(next.state),runId,owner,row.revision]);
    if(saved.rows.length!==1)throw fail('stale_revision',409);
    return {id:runId,revision:Number(saved.rows[0].revision),state:next.state,event:next.event};
   });
  }
 });
}

