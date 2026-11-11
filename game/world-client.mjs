// Main-game controller: server facts only; no domain engine, local saves or fake fallback.
import {normalizeWorldView} from './world-contract.mjs';
export function createWorldGameClient({fetchImpl=fetch,onChange=()=>{},origin='https://ascension-auth.aerovista.us'}={}){
 const parsed=new URL(origin);
 if(origin!==parsed.origin||(origin!=='https://ascension-auth.aerovista.us'&&!(parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname))))throw TypeError('Approved game origin required');
 let csrf=null,generation=0,busy=false;
 let state=Object.freeze({phase:'idle',view:null,message:'Connect to your game.'});
 const show=(phase,message,view=null)=>{state=Object.freeze({phase,message,view});onChange(state);return state;};
 async function request(path,{method='GET',value}={}){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
  try{
   const headers={Accept:'application/json'};
   if(method==='POST'){headers['Content-Type']='application/json';headers['X-Ascension-CSRF']=csrf;}
   const response=await fetchImpl(origin+path,{method,headers,mode:'cors',credentials:'include',cache:'no-store',redirect:'error',signal:abort.signal,
    ...(value===undefined?{}:{body:JSON.stringify(value)})});
   if(!String(response.headers.get('content-type')||'').includes('application/json'))throw Error('unavailable');
   return {status:response.status,body:await response.json()};
  }finally{clearTimeout(timer);}
 }
 function failure(result){
  if(result.status===401){csrf=null;return show('signed_out','Your account session ended. Sign in again.');}
  if(result.status===403){csrf=null;return show('denied','Your account cannot perform this action. Refresh your connection.');}
  if(result.status===409)return show('conflict','Your game changed elsewhere. Reload the saved game before continuing.');
  return show('unavailable','The game server could not confirm this request. Reload before continuing.');
 }
 async function refresh(){
  if(busy)return state;
  const attempt=++generation;busy=true;csrf=null;show('loading','Loading your saved game…');
  try{
   const session=await request('/api/session');
   if(attempt!==generation)return state;
   if(session.status!==200) return failure(session);
   if(session.body?.authenticated===false)return show('signed_out','Sign in with your AeroVista Account.');
   if(session.body?.authenticated!==true||typeof session.body.identity?.id!=='string'||!session.body.identity.id||
    typeof session.body.csrf!=='string'||!/^[A-Za-z0-9_-]{20,128}$/.test(session.body.csrf))throw Error('invalid_session');
   csrf=session.body.csrf;
   const result=await request('/api/game/world');
   if(attempt!==generation)return state;
   if(result.status===404&&result.body?.error==='run_not_found')return show('new_run','Begin Billy’s intake when you are ready.');
   if(result.status!==200)return failure(result);
   return show('ready','Saved game loaded.',normalizeWorldView(result.body?.view));
  }catch{if(attempt===generation){csrf=null;return show('unavailable','The game server is unavailable. Your saved game has not been replaced.');}return state;}
  finally{busy=false;}
 }
 async function submit(kind,actionId){
  if(busy)throw Error('request_pending');
  const creating=kind==='create',previous=state.view;
  if(!csrf||(creating?state.phase!=='new_run':state.phase!=='ready'))throw Error('game_not_ready');
  const action=creating?null:previous.actions.find(a=>a.id===actionId);
  if(!creating&&!action)throw Error('action_not_offered');
  const attempt=++generation;busy=true;show('saving','Committing your action…',previous);
  try{
   const result=await request(creating?'/api/game/world/runs':'/api/game/world/actions',{method:'POST',
    value:creating?{}:{runId:previous.runId,expectedRevision:previous.revision,command:action.command}});
   if(attempt!==generation)return state;
   if(result.status!==(creating?201:200))return failure(result);
   const view=normalizeWorldView(result.body?.view);
   if(creating?view.revision!==0:(view.runId!==previous.runId||view.revision!==previous.revision+1))throw Error('unconfirmed_commit');
   return show('ready','Progress saved.',view);
  }catch{if(attempt===generation){csrf=null;return show('unavailable','The action could not be confirmed. Reload the saved game before continuing.');}return state;}
  finally{busy=false;}
 }
 return Object.freeze({refresh,begin:()=>submit('create'),act:actionId=>submit('action',actionId),snapshot:()=>state,
  clear:()=>{generation++;csrf=null;show('idle','Connect to your game.');}});
}
