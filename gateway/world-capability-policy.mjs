// Staged, server-only capability authorizer for the main Office/Hallway store.
// The trusted native-session resolver supplies identity.subject; the existing
// App Adapter identity.can() checks CURRENT grants for the explicit capability.
// This module does not register grants, mount routes or contact live accounts.
import {normalizeWorldCommand} from '../game/world-contract.mjs';

const KEYS=Object.freeze(['load','create','action','travel','map']);
const validKey=x=>typeof x==='string'&&/^[A-Za-z0-9._:-]{3,128}$/.test(x);
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));

function requiredCapabilities(request){
 if(!request||typeof request!=='object'||Array.isArray(request))return null;
 if(request.type==='load'){
  if(!shape(request,request.runId===undefined?['type']:['type','runId'])||
   (request.runId!==undefined&&!validId(request.runId)))return null;
  return ['load'];
 }
 if(request.type==='map'){
  // Existing protected map gateway chooses the owner's latest run server-side.
  if(!shape(request,request.runId===undefined?['type']:['type','runId'])||
   (request.runId!==undefined&&!validId(request.runId)))return null;
  return ['map'];
 }
 if(!validId(request.runId))return null;
 if(request.type==='create'&&shape(request,['type','runId']))return ['create'];
 if(request.type==='action'&&shape(request,['type','runId','command'])){
  let command;
  try{command=normalizeWorldCommand(request.command)}catch{return null}
  return command.type==='travel'?['action','travel']:['action'];
 }
 return null;
}

export function createWorldCapabilityAuthorizer({adapter,capabilityNames}={}){
 if(!shape(capabilityNames,KEYS)||!KEYS.every(k=>validKey(capabilityNames[k]))||
  new Set(KEYS.map(k=>capabilityNames[k])).size!==KEYS.length)
  throw new TypeError('Five distinct approved capability names required');
 if(typeof adapter?.identity?.can!=='function')
  throw new TypeError('Live App Adapter identity.can authority required');
 const names=Object.freeze({...capabilityNames});
 return async function authorizeWorld(identity,request){
  if(!validId(identity?.subject))return false;
  const required=requiredCapabilities(request);
  if(!required)return false;
  for(const operation of required){
   // No role shortcut or cached grant; external adapter must refuse unregistered,
   // disabled, revoked, or unauthorized capabilities.
   const result=await adapter.identity.can({identityId:identity.subject,capability:names[operation]});
   if(result?.ok!==true||result.allowed!==true)return false;
  }
  return true;
 };
}
