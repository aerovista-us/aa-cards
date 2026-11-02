// Read-only diagnostic for the DEPLOYED Ascension auth bridge.
// The running bridge uses ascension_avcc_session (HttpOnly, Path=/) on
// ascension-auth.aerovista.us, NOT the staged aa_cards_session cookie.
// This module never reads browser cookies, tokens, or posts gameplay actions.
// Check is deliberate/user-initiated; an unauthenticated visitor triggers
// no map query. Endpoint origins are constants, not user-input URLs.
import {validateMapView} from './view-contract.mjs';

export const ASCENSION_AUTH_ORIGIN='https://ascension-auth.aerovista.us';

function requestOptions(signal){
 return {
  method:'GET',mode:'cors',credentials:'include',cache:'no-store',
  redirect:'error',headers:{Accept:'application/json'},
  ...(signal?{signal}:{})
 };
}
async function getJson(fetchImpl,path,signal){
 const response=await fetchImpl(ASCENSION_AUTH_ORIGIN+path,requestOptions(signal));
 if(!response||typeof response.status!=='number')throw new Error('invalid_bridge_response');
 if(!String(response.headers?.get?.('content-type')||'').toLowerCase().includes('application/json')){
  throw new Error('invalid_bridge_content_type');
 }
 let body=null;
 try{body=await response.json()}catch{throw new Error('invalid_bridge_json');}
 return {status:response.status,body};
}
const result=(status,detail,extra={})=>Object.freeze({status,detail,...extra});

/**
 * Status-only diagnostic; NEVER enables gameplay or replaces the
 * synthetic state-replay viewer. Production service must independently
 * verify session, capability, run owner and map projection on every request.
 */
export async function probeAscensionBridge({fetchImpl=globalThis.fetch,signal}={}){
 if(typeof fetchImpl!=='function')throw new TypeError('Fetch implementation required');
 let session;
 try {session=await getJson(fetchImpl,'/api/session',signal);}
 catch {
  return result('unreachable','Authentication bridge could not be contacted.');
 }
 if(session.status!==200||!session.body||typeof session.body.authenticated!=='boolean'){
  return result('unavailable','Authentication session contract is unavailable.');
 }
 if(session.body.authenticated===false){
  return result('signed_out','Authentication bridge reachable. No player is signed in.');
 }
 // /api/session contains an identity object, but we do not display or return it.
 if(typeof session.body.identity?.id!=='string'||!session.body.identity.id){
  return result('invalid_session','Bridge session did not identify a verified player.');
 }

 let map;
 try {map=await getJson(fetchImpl,'/api/game/map',signal);}
 catch {
  return result('map_unreachable','Player session found, but the map service is unreachable.');
 }
 if(map.status===404){
  return result('map_not_deployed','Player session found; authoritative map endpoint is not deployed.');
 }
 if(map.status===401){
  return result('expired','Player session expired or was revoked.');
 }
 if(map.status===403){
  return result('denied','Player session is active but map access is not authorized.');
 }
 if(map.status!==200){
  return result('map_unavailable','The authoritative map service is unavailable.');
 }
 try {
  const frame=validateMapView(map.body);
  // Only the already-redacted, public-safe map view crosses this seam.
  return result('map_ready','Authenticated, authorized map projection returned.',{
   frame
  });
 }catch{
  return result('invalid_map','The returned map failed strict display validation.');
 }
}
