// Server-only HTTP controller: authentication and canonical context are required.
// All request identity/context fields are ignored; only utterance is accepted.
export function createNpcHttpHandler({resolveSession,loadOwnedRun,visibleNpcContext,verifyCsrf,dialogue,origin,maxBodyBytes=2048}){
 for(const [name,fn] of Object.entries({resolveSession,loadOwnedRun,visibleNpcContext,verifyCsrf}))
  if(typeof fn!=='function')throw new Error('Missing NPC handler dependency: '+name);
 if(typeof dialogue?.talk!=='function'||typeof origin!=='string'||!origin.startsWith('https://'))
  throw new Error('Secure NPC dialogue service and origin required');
 const reply=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload))};
 return async function handleNpc(req,res){
  if(req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
  if(req.headers.origin!==origin)return reply(res,403,{error:'invalid_origin'});
  if(await verifyCsrf(req)!==true)return reply(res,403,{error:'invalid_csrf'});
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return reply(res,415,{error:'json_required'});
  let body='';
  try{
   for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>maxBodyBytes)return reply(res,413,{error:'request_too_large'})}
   const input=JSON.parse(body);
   if(!input||typeof input!=='object'||Array.isArray(input)||
      typeof input.utterance!=='string'||!input.utterance.trim()||input.utterance.length>750)
     return reply(res,422,{error:'invalid_utterance'});
   const identity=await resolveSession(req);
   if(!identity?.subject)return reply(res,401,{error:'authentication_required'});
   const run=await loadOwnedRun(identity);
   if(!run)return reply(res,404,{error:'run_not_found'});
   // visibleNpcContext MUST validate this NPC is present and return exclusively
   // server-authorized facts and memory; never trust request-supplied context.
   const context=await visibleNpcContext(identity,run);
   if(!context||!context.npcId||!context.sceneId)return reply(res,403,{error:'npc_unavailable'});
   const result=await dialogue.talk({playerId:identity.subject,npcId:context.npcId,
     sceneId:context.sceneId,utterance:input.utterance,facts:context.facts,
     memory:context.memory,sessionAuthorized:true});
   return reply(res,200,{text:result.text,provider:result.provider,cached:result.cached===true});
  }catch{return reply(res,503,{error:'npc_service_unavailable'})}
 };
}
