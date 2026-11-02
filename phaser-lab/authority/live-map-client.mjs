// Prepared same-origin read client for an authenticated Ascension app.
// NOT imported by GitHub Pages preview: the service does not exist there.
// This only displays verified state. It does not send movement or choices.
import {validateMapView} from './view-contract.mjs';
export class MapReadError extends Error{
 constructor(status,code){super(code);this.status=status;this.code=code;}
}
export async function fetchOwnedMap({fetchImpl=globalThis.fetch,signal}={}){
 if(typeof fetchImpl!=='function')throw new TypeError('Fetch implementation required');
 const response=await fetchImpl('/api/game/map',{
  method:'GET',mode:'same-origin',credentials:'same-origin',
  cache:'no-store',redirect:'error',
  headers:{Accept:'application/json'},
  ...(signal?{signal}:{})
 });
 if(!response||typeof response.status!=='number')throw new MapReadError(503,'bad_gateway_response');
 if(!response.ok){
   const known={401:'authentication_required',403:'map_access_denied',404:'run_not_found'};
   throw new MapReadError(response.status,known[response.status]||'map_unavailable');
 }
 if(!String(response.headers?.get?.('content-type')||'').toLowerCase().includes('application/json'))
  throw new MapReadError(503,'invalid_map_content_type');
 const payload=await response.json();
 return validateMapView(payload);
}
