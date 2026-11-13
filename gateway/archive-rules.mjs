// Server-owned Archive of Echoes rules. Nothing here grants placement, stats,
// new spin credits, map discovery or access to the future Veilway realm.
import {ARCHIVE_WORLD,archiveCellEnabled} from './archive-layout.mjs';
const near=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1;
export function enterArchive(state){
 if(state.location!=='afterlife-hallway'||!near(state.player,{x:4,y:1}))
  throw Error('target_not_in_reach');
 if(state.placement!=='memory')throw Error('unsupported_destination');
 if(!state.hallway?.destinationRead||!state.hallway.routeRevealed)
  throw Error('route_not_confirmed');
 state.schemaVersion=4; // additive migration only on first authorized destination entry
 state.archive??={mode:state.consequences.hallway,archivistMet:false,ledgerRead:false,
  echoWitnessed:false,resolution:null,sealIssued:false};
 state.location=ARCHIVE_WORLD.id;Object.assign(state.player,ARCHIVE_WORLD.start);
 return {type:'area_entered',text:'Billy enters the Archive of Echoes. The shelves hum with things the Placement Office claimed to have misplaced.'};
}
export function applyArchiveAction(state,command){
 const p=state.player,a=state.archive;
 const object=target=>{
  const o=Object.hasOwn(ARCHIVE_WORLD.objects,target)?ARCHIVE_WORLD.objects[target]:null;
  if(!o||!near(p,o))throw Error('target_not_in_reach');
  return o;
 };
 switch(command.type){
  case 'move':{
   if(!Number.isInteger(command.dx)||!Number.isInteger(command.dy)||
      Math.abs(command.dx)+Math.abs(command.dy)!==1)throw Error('invalid_move');
   if(!archiveCellEnabled(p.x+command.dx,p.y+command.dy))throw Error('blocked');
   p.x+=command.dx;p.y+=command.dy;
   return {type:'moved',text:'Billy follows the hum of a memory he cannot quite place.'};
  }
  case 'travel':{
   if(command.target!=='return')throw Error('unsupported_destination');
   object('return');state.location='afterlife-hallway';Object.assign(p,{x:4,y:1});
   return {type:'area_entered',text:'Billy returns to the Hallway. The Archive keeps his decision on file.'};
  }
  case 'talk':{
   if(command.target!=='archivist'||command.topic!=='introduction'||
      !near(p,ARCHIVE_WORLD.npcs.archivist))throw Error('npc_not_in_reach');
   a.archivistMet=true;
   return {type:'archive_spoke',text:a.mode==='assistance'?
    'The Archivist sees the help note: Your file came with a warning and an invitation. Read the ledger, witness the echo, then decide what to keep.':
    'The Archivist checks the watch note twice: Scrutiny does not erase a memory, Billy. Read the ledger, witness the echo, and sign for your choice.'};
  }
  case 'inspect':{
   const o=object(command.target);
   if(command.target==='ledger'){a.ledgerRead=true;
    return {type:'archive_inspected',text:'The Echo Ledger lists a memory without an owner. Its last entry reads: NOT EVERYTHING LOST SHOULD BE DELETED.'};}
   if(command.target==='echo'){a.echoWitnessed=true;
    return {type:'archive_inspected',text:'An unfiled echo plays: a door closing, a name repeated, someone choosing to remain. No destination is chosen here.'};}
   if(command.target==='seal')return {type:'archive_inspected',text:a.sealIssued?
    'The Archive Seal confirms Billy’s '+a.resolution+' decision. The entry is immutable.':
    'The Archive Seal awaits a decision about the echo. It cannot sign an empty form.'};
   return {type:'archive_inspected',text:o.description};
  }
  case 'choose':{
   object('echo');
   if(command.target!=='echo'||!['preserve','release'].includes(command.choice))throw Error('unsupported_choice');
   if(a.resolution!==null)throw Error('archive_choice_already_recorded');
   if(!a.archivistMet||!a.ledgerRead||!a.echoWitnessed)throw Error('archive_prerequisites');
   a.resolution=command.choice;
   return {type:'archive_choice',text:command.choice==='preserve'?
    'Billy preserves the unfiled echo. The Archivist stamps KEEP, WITH CONTEXT. The memory remains for a future life.':
    'Billy releases the unfiled echo. The Archivist stamps RELEASED BY CHOICE. The memory leaves without changing his destination.'};
  }
  case 'use':{
   object('seal');
   if(command.target!=='seal')throw Error('unsupported_action');
   if(a.resolution===null)throw Error('archive_prerequisites');
   if(a.sealIssued)throw Error('archive_seal_already_recorded');
   a.sealIssued=true;
   return {type:'archive_sealed',text:'The Archive Seal is filed. Billy has finished the first Echo record. The rest of the Archive remains under review.'};
  }
  default:throw Error('unsupported_action');
 }
}
