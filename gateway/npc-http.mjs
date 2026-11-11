// Unmounted optional presentation endpoint. No secret loader, server or game writes.
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const fail=(code,status)=>Object.assign(Error(code),{status});
function readBody(req,limit,timeoutMs){
 return new Promise((resolve,reject)=>{
  let bytes=0,done=false;const chunks=[];
  const endError=e=>{if(done)return;done=true;clearTimeout(timer);chunks.length=0;reject(e);};
  const timer=setTimeout(()=>endError(fail('request_timeout',408)),timeoutMs);
  req.on('error',()=>endError(fail('invalid_json',400)));req.on('aborted',()=>endError(fail('invalid_json',400)));
  req.on('data',chunk=>{if(done)return;bytes+=Buffer.byteLength(chunk);if(bytes>limit)endError(fail('request_too_large',413));else chunks.push(Buffer.from(chunk));});
  req.on('end',()=>{if(done)return;done=true;clearTimeout(timer);try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(fail('invalid_json',400));}});
 });
}
export function createNpcHttpHandler({resolveSession,loadOwnedRun,visibleNpcContext,verifyCsrf,authorizeDialogue,dialogue,origin,appOrigin=origin,maxBodyBytes=2048,bodyTimeoutMs=5000}={}){
 for(const [name,fn] of Object.entries({resolveSession,loadOwnedRun,visibleNpcContext,verifyCsrf,authorizeDialogue}))
  if(typeof fn!=='function')throw TypeError('Missing NPC authority: '+name);
 const ui=new URL(origin),app=new URL(appOrigin);
 if(ui.origin!==origin||app.origin!==appOrigin||ui.protocol!=='https:'||app.protocol!=='https:'||typeof dialogue?.talk!=='function')throw TypeError('Exact HTTPS origins and dialogue service required');
 if(!Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<512||maxBodyBytes>8192||!Number.isSafeInteger(bodyTimeoutMs)||bodyTimeoutMs<250||bodyTimeoutMs>10000)throw TypeError('Bounded request configuration required');
 const reply=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));return true;};
 return async(req,res)=>{
  let url;try{url=new URL(req.url,appOrigin);}catch{return reply(res,400,{error:'invalid_url'});}
  if(url.pathname!=='/api/game/npc')return false;
  if(url.origin!==appOrigin||req.headers.host!==app.host||req.headers.origin!==origin)return reply(res,403,{error:'invalid_origin'});
  res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Ascension-CSRF');
  if(url.search)return reply(res,400,{error:'query_not_supported'});
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return true;}
  if(req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
  try{
   const identity=await resolveSession(req);if(!valid(identity?.subject))return reply(res,401,{error:'authentication_required'});
   if(await verifyCsrf(req)!==true)return reply(res,403,{error:'invalid_csrf'});
   if(String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json')return reply(res,415,{error:'json_required'});
   const input=await readBody(req,maxBodyBytes,bodyTimeoutMs);
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!Object.hasOwn(input,'utterance')||typeof input.utterance!=='string'||!input.utterance.trim()||input.utterance.length>750)return reply(res,422,{error:'invalid_utterance'});
   const run=await loadOwnedRun(identity);if(!run)return reply(res,404,{error:'run_not_found'});
   if(!valid(run.id)||run.state?.ownerId!==identity.subject)return reply(res,404,{error:'run_not_found'});
   const context=await visibleNpcContext(identity,run);
   if(!context||!context.npcId||!context.sceneId)return reply(res,403,{error:'npc_unavailable'});
   if(await authorizeDialogue(identity,run,context)!==true)return reply(res,403,{error:'dialogue_denied'});
   const result=await dialogue.talk({playerId:identity.subject,npcId:context.npcId,sceneId:context.sceneId,utterance:input.utterance,facts:context.facts,memory:context.memory,sessionAuthorized:true});
   if(typeof result?.text!=='string'||!result.text.trim()||result.text.length>520||!['groq','gemini','scripted'].includes(result.provider))throw Error('invalid_dialogue');
   return reply(res,200,{text:result.text,provider:result.provider,cached:result.cached===true});
  }catch(e){const statuses={invalid_json:400,request_too_large:413,request_timeout:408};
   if(Object.hasOwn(statuses,e?.message)&&statuses[e.message]===e.status)return reply(res,e.status,{error:e.message});
   return reply(res,503,{error:'npc_service_unavailable'});
  }
 };
}
