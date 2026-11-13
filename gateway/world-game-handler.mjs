// Unmounted main-game API. Exporting this factory never starts a server or loads secrets.
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {createAscensionBridgeSessionResolver} from './ascension-bridge-identity.mjs';
import {normalizeWorldCommand} from '../game/world-contract.mjs';
import {projectWorldGame} from './world-game-view.mjs';
const ROUTES=new Set(['/api/game/world','/api/game/world/runs','/api/game/world/actions']);
const KNOWN=new Set(['authentication_required','world_denied','not_found','run_exists','stale_revision','invalid_run','invalid_action',
 'blocked','invalid_move','target_not_in_reach','already_open','not_openable','npc_not_in_reach','unsupported_topic','unsupported_action',
 'already_taken','assessment_already_recorded','intake_prerequisites','placement_not_authorized','placement_already_recorded',
 'unsupported_choice','glitch_not_investigated','glitch_already_resolved','intake_incomplete','unsupported_destination','inspection_not_required','inspection_already_recorded',
 'route_not_confirmed','archive_prerequisites','archive_choice_already_recorded','archive_seal_already_recorded']);
const BODY_STATUS=Object.freeze({json_required:415,request_too_large:413,invalid_json:400,request_timeout:408});
const error=(code,status)=>Object.assign(Error(code),{status});
function cookie(raw,name){
 const values=String(raw||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
 if(values.length!==1)return null;
 try{const v=decodeURIComponent(values[0].slice(name.length+1));return /^[A-Za-z0-9_-]{20,128}$/.test(v)?v:null;}catch{return null;}
}
function validCsrf(req){
 const a=cookie(req.headers.cookie,'ascension_csrf'),b=req.headers['x-ascension-csrf'];
 if(!a||typeof b!=='string'||!/^[A-Za-z0-9_-]{20,128}$/.test(b)||a.length!==b.length)return false;
 return timingSafeEqual(Buffer.from(a),Buffer.from(b));
}
async function body(req){
 if(String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json')throw error('json_required',415);
 return new Promise((resolve,reject)=>{
  const chunks=[];let size=0,done=false;
  const fail=e=>{if(done)return;done=true;clearTimeout(timer);chunks.length=0;reject(e);};
  const timer=setTimeout(()=>fail(error('request_timeout',408)),5000);
  req.on('error',()=>fail(error('invalid_json',400)));
  req.on('aborted',()=>fail(error('invalid_json',400)));
  req.on('data',chunk=>{if(done)return;size+=Buffer.byteLength(chunk);if(size>4096)fail(error('request_too_large',413));else chunks.push(Buffer.from(chunk));});
  req.on('end',()=>{
   if(done)return;done=true;clearTimeout(timer);
   try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();resolve(value);}
   catch{reject(error('invalid_json',400));}
  });
 });
}
export function createWorldGameHandler({adapter,store,appOrigin,uiOrigin,newRunId=randomUUID}={}){
 if(!['loadCurrentRun','createRun','commitAction'].every(k=>typeof store?.[k]==='function')||typeof newRunId!=='function')throw TypeError('Authorized owner store required');
 const app=new URL(appOrigin),ui=new URL(uiOrigin);
 if(app.origin!==appOrigin||ui.origin!==uiOrigin||![app,ui].every(x=>x.protocol==='https:'||(['127.0.0.1','localhost'].includes(x.hostname)&&x.protocol==='http:')))throw TypeError('Exact approved origins required');
 const identity=createAscensionBridgeSessionResolver({adapter});
 return async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));return true;};
  let url;try{url=new URL(req.url,appOrigin);}catch{return send(400,{error:'invalid_url'});}
  if(!ROUTES.has(url.pathname))return false;
  res.setHeader('Vary','Origin');
  if(url.origin!==appOrigin||req.headers.host!==app.host||req.headers.origin!==uiOrigin)return send(403,{error:'origin_denied'});
  res.setHeader('Access-Control-Allow-Origin',uiOrigin);res.setHeader('Access-Control-Allow-Credentials','true');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Ascension-CSRF');
  if(url.search)return send(400,{error:'query_not_supported'});
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return true;}
  const read=url.pathname==='/api/game/world';
  if(req.method!==(read?'GET':'POST'))return send(405,{error:'method_not_allowed'});
  if(!read&&!validCsrf(req))return send(403,{error:'csrf_denied'});
  try{
   const who=await identity.resolveIdentity(req);
   if(!who)return send(401,{error:'authentication_required'});
   let run;
   if(read){run=await store.loadCurrentRun(who);if(!run)return send(404,{error:'run_not_found'});}
   else{
    const input=await body(req);
    if(url.pathname.endsWith('/runs')){
     if(Object.keys(input).length)return send(422,{error:'invalid_action'});
     run=await store.createRun(who,newRunId());
    }else{
     if(Object.keys(input).length!==3||!['runId','expectedRevision','command'].every(k=>Object.hasOwn(input,k)))return send(422,{error:'invalid_action'});
     let command;try{command=normalizeWorldCommand(input.command);}catch{return send(422,{error:'invalid_action'});}
     run=await store.commitAction(who,input.runId,{expectedRevision:input.expectedRevision,command});
    }
   }
   return send(read?200:url.pathname.endsWith('/runs')?201:200,{view:projectWorldGame(who,run)});
  }catch(e){return KNOWN.has(e?.message)&&[401,403,404,409,422].includes(e.status)
   ?send(e.status,{error:e.message}):Object.hasOwn(BODY_STATUS,e?.message)&&e.status===BODY_STATUS[e.message]
   ?send(e.status,{error:e.message}):send(503,{error:'world_unavailable'});}
 };
}
