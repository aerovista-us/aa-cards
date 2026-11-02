// Staging-only composition of the deployed Ascension auth-bridge contract.
// No side effects, no global server, no secret loading, no production mounting.
// Caller must provide a real App Adapter, verified capability and owner DB.
import {createAscensionBridgeIdentity} from './ascension-bridge-identity.mjs';
import {createOwnedMapSession} from './owned-map-session.mjs';
import {createMapSessionHttpHandler} from './map-session-http.mjs';
export const AUTH_ORIGIN='https://ascension-auth.aerovista.us';
export const UI_ORIGIN='https://ascension.aerovista.us';
export function createPreparedBridgeMapHandler({adapter,pool,capability,listVisibleMarkers}={}){
 const identity=createAscensionBridgeIdentity({adapter,capability});
 const service=createOwnedMapSession({
  pool,...identity,listVisibleMarkers
 });
 return createMapSessionHttpHandler({service,appOrigin:AUTH_ORIGIN,uiOrigin:UI_ORIGIN});
}
