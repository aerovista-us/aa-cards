// Server-only, read-only gateway for the existing Ascension owner-bound runs.
// No HTTP server is started here; mounting requires a verified AVCC session
// resolver, live game-view entitlement check and approved deployment domain.
// Canonical choices, movement, AP and save writes remain elsewhere.
import {projectOwnedVisibleMap} from './visible-map-projection.mjs';

export class MapSessionError extends Error {
  constructor(status,code){super(code);this.status=status;this.code=code;}
}
const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(x);
const fail=(status,code)=>{throw new MapSessionError(status,code);};
const requireFunction=(value,name)=>{
  if(typeof value!=='function')throw new TypeError(name+' is required (cannot enable map session)');
};

export function createOwnedMapSession({pool,resolveIdentity,authorizeMapView,listVisibleMarkers}={}){
  if(typeof pool?.query!=='function')throw new TypeError('PostgreSQL query authority required');
  requireFunction(resolveIdentity,'resolveIdentity');
  requireFunction(authorizeMapView,'authorizeMapView');
  requireFunction(listVisibleMarkers,'listVisibleMarkers');

  return Object.freeze({
    async getMap(request){
      // This identity MUST derive from a verified server-side app session,
      // never an untrusted request header, JSON body, or query parameter.
      const identity=await resolveIdentity(request);
      if(!validId(identity?.subject))fail(401,'authentication_required');
      if(await authorizeMapView(identity,request)!==true)fail(403,'map_access_denied');

      // Owner condition is a bound SQL parameter; server chooses most recent
      // run. The client supplies neither owner nor arbitrary run identifier.
      const rows=await pool.query(
        'SELECT id, owner_subject, revision, state FROM ascension_player_runs WHERE owner_subject=$1 ORDER BY updated_at DESC, id DESC LIMIT 1',
        [identity.subject]
      );
      const row=rows?.rows?.[0];
      if(!row)fail(404,'run_not_found');
      // PostgreSQL BIGINT is normally returned as a string. Reject overflow
      // instead of losing revision precision in the browser.
      const revision=typeof row.revision==='string'?Number(row.revision):row.revision;
      if(!Number.isSafeInteger(revision)||revision<0)fail(503,'invalid_run_revision');

      // Marker provider must derive visibility from the authorized run/state.
      const visibleMarkers=await listVisibleMarkers(identity,row,request);
      // The projector independently checks DB owner_subject, map shape,
      // discovered flags, authorized markers and whitelist-only output.
      return projectOwnedVisibleMap({
        identity,run:{...row,revision},visibleMarkers
      });
    }
  });
}
