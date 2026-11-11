// Server-side adapter for the DEPLOYED Ascension auth bridge.
// Unlike the earlier aa_cards_session handle prototype, this service uses
// its own HttpOnly ascension_avcc_session native AVCC token, Path=/.
// Never import into static GitHub Pages or serialize the native token.
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const validCapability=x=>typeof x==='string'&&/^[A-Za-z0-9:._-]{3,128}$/.test(x);
const COOKIE='ascension_avcc_session';
function readNativeCookie(raw){
 if(typeof raw!=='string'||raw.length>8192)return null;
 const matches=raw.split(';').map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+'='));
 if(matches.length!==1)return null;
 try {
  const rawValue=matches[0].slice(COOKIE.length+1);
  if(!rawValue||rawValue.length>4096)return null;
  const token=decodeURIComponent(rawValue);
  if(!token||token.length>4096||/[\r\n\x00-\x1f\x7f]/.test(token))return null;
  return token;
 }catch{return null;}
}
export function createAscensionBridgeSessionResolver({adapter}={}){
 if(typeof adapter?.auth?.resolveSession!=='function'||
  typeof adapter?.identity?.describe!=='function')
  throw new TypeError('Approved live App Adapter required');
 return Object.freeze({
  async resolveIdentity(req){
   const token=readNativeCookie(req?.headers?.cookie);
   if(!token)return null;
   const session=await adapter.auth.resolveSession(token);
   if(session?.ok!==true||session.authenticated!==true||!validId(session.identityId))return null;
   const description=await adapter.identity.describe(token);
   if(description?.ok!==true||description.authenticated!==true||
      description.identity?.identityId!==session.identityId||
      description.identity.status!=='active')return null;
   return {subject:session.identityId};
  }
 });
}
export function createAscensionBridgeIdentity({adapter,capability}={}){
 if(typeof adapter?.identity?.can!=='function'||!validCapability(capability))
  throw new TypeError('Approved live App Adapter and registered map capability required');
 const session=createAscensionBridgeSessionResolver({adapter});
 return Object.freeze({
  ...session,
  async authorizeMapView(identity){
   if(!validId(identity?.subject))return false;
   const grant=await adapter.identity.can({identityId:identity.subject,capability});
   return grant?.ok===true&&grant.allowed===true;
  }
 });
}

