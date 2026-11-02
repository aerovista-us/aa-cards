// Mount ONLY at a trusted, TLS-terminated, same-origin app server.
// No CORS, no proxy authentication fallback and no browser-supplied identity.
// This is a staging handler; it does not start a service or enable gameplay.
import {MapSessionError} from './owned-map-session.mjs';

function writeJson(res,status,payload,extra={}){
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, private, max-age=0',
    'Pragma':'no-cache',
    'Vary':'Cookie',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
    ...extra
  });
  res.end(JSON.stringify(payload));
}
export function createMapSessionHttpHandler({service,appOrigin,uiOrigin=appOrigin}={}){
  if(typeof service?.getMap!=='function')throw new TypeError('Owner-scoped map session service required');
  let url;
  try{url=new URL(appOrigin);}
  catch{throw new TypeError('Approved HTTPS app origin required');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||
     url.origin!==appOrigin||!url.hostname)
    throw new TypeError('App origin must be an exact HTTPS origin');
  const expectedUi=new URL(uiOrigin);
  if(expectedUi.protocol!=='https:'||expectedUi.origin!==uiOrigin||expectedUi.pathname!=='/'||expectedUi.search||expectedUi.hash)
    throw new TypeError('Approved exact HTTPS UI origin required');
  const crossOrigin=uiOrigin!==appOrigin;
  const trustedCors=crossOrigin?{'Access-Control-Allow-Origin':uiOrigin,'Access-Control-Allow-Credentials':'true','Vary':'Cookie, Origin'}:{};
  // Node's raw incoming Host is checked so a misrouted deployment fails shut.
  // Upstream proxy MUST enforce HTTPS and preserve the approved original Host.
  return async function handleMapSession(req,res){
    const requestUrl=new URL(req.url||'/',appOrigin);
    if(requestUrl.pathname!=='/api/game/map')return writeJson(res,404,{error:'not_found'});
    if(req.method!=='GET')return writeJson(res,405,{error:'method_not_allowed'},{Allow:'GET'});
    if(requestUrl.search||requestUrl.hash)return writeJson(res,400,{error:'query_not_supported'});
    if(req.headers.host!==url.host ||
      (crossOrigin?req.headers.origin!==uiOrigin:
        (req.headers.origin!==undefined&&req.headers.origin!==appOrigin)))
      return writeJson(res,403,{error:'origin_rejected'});
    try{
      const frame=await service.getMap(req);
      return writeJson(res,200,frame,trustedCors);
    }catch(error){
      const status=error instanceof MapSessionError?error.status:503;
      const code=error instanceof MapSessionError?error.code:'map_service_unavailable';
      // No SQL, session token, state, stacktrace or internal exception messages
      // are returned from unrecognized service failures.
      return writeJson(res,status,{error:code},trustedCors);
    }
  };
}
