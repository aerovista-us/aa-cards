// Server-only AVCC App Adapter identity bridge for Ascension's map-read route.
// Adapter source contract inspected: auth.resolveSession(token) => {ok,
// authenticated,identityId}; identity.describe(token) => {ok,authenticated,
// identity:{identityId,status}}; identity.can({identityId,capability}) =>
// {ok,allowed}. This module DOES NOT register the application, construct
// credentials, mint tokens or assume an entitlement exists.
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const validCapability=x=>typeof x==='string'&&/^[A-Za-z0-9:._-]{3,128}$/.test(x);
const deny=()=>null;
const COOKIE='aa_cards_session';
function cookieHandle(raw){
 if(typeof raw!=='string')return null;
 const entries=raw.split(';').map(part=>part.trim()).filter(Boolean)
  .filter(entry=>entry.startsWith(COOKIE+'='));
 if(entries.length!==1)return null; // reject duplicate cookies and ambiguity
 const handle=entries[0].slice(COOKIE.length+1);
 // Created by crypto.randomBytes(32).toString('base64url').
 return /^[A-Za-z0-9_-]{43}$/.test(handle)?handle:null;
}
export function createAvccMapIdentity({adapter,sessions,capability}={}){
 if(typeof adapter?.auth?.resolveSession!=='function' ||
    typeof adapter?.identity?.describe!=='function' ||
    typeof adapter?.identity?.can!=='function' ||
    typeof sessions?.get!=='function' || !validCapability(capability))
   throw new TypeError('Verified App Adapter, session store and approved capability required');
 const getSession=async req=>{
   const handle=cookieHandle(req?.headers?.cookie);
   if(!handle)return null;
   const stored=await sessions.get(handle);
   if(typeof stored?.token!=='string'||!stored.token)return null;
   const resolved=await adapter.auth.resolveSession(stored.token);
   if(resolved?.ok!==true||resolved.authenticated!==true||!validId(resolved.identityId))
     return null;
   const described=await adapter.identity.describe(stored.token);
   if(described?.ok!==true||described.authenticated!==true||
      described.identity?.identityId!==resolved.identityId||
      described.identity.status!=='active')
     return null;
   return {subject:resolved.identityId};
 };
 return Object.freeze({
  resolveIdentity:getSession,
  async authorizeMapView(identity){
    if(!validId(identity?.subject))return false;
    const decision=await adapter.identity.can({identityId:identity.subject,capability});
    return decision?.ok===true&&decision.allowed===true;
  }
 });
}
