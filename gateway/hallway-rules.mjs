import {HALLWAY_WORLD,HALLWAY_DESTINATIONS,hallwayCellEnabled} from './hallway-layout.mjs';
import {enterArchive} from './archive-rules.mjs';
const near=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1;
export function enterHallway(state,intakeComplete){
 if(!near(state.player,{x:4,y:1}))throw Error('target_not_in_reach');
 if(!intakeComplete||state.inventory['placement-pass']!==1)throw Error('intake_incomplete');
 if(!['assistance','scrutiny'].includes(state.consequences.hallway))throw Error('invalid_save');
 state.hallway??={mode:state.consequences.hallway,attendantMet:false,inspectionComplete:false,routeRevealed:false,destinationRead:false};
 state.location=HALLWAY_WORLD.id;Object.assign(state.player,HALLWAY_WORLD.start);
 return {type:'area_entered',text:state.hallway.mode==='assistance'?'Billy enters the Hallway. A blue help note is clipped to the attendant’s copy of his file.':'Billy enters the Hallway. An amber watch lamp follows his file. Someone has noticed the warmth.'};
}
export function applyHallwayAction(state,command){
 const p=state.player,h=state.hallway;
 const object=target=>{const o=Object.hasOwn(HALLWAY_WORLD.objects,target)?HALLWAY_WORLD.objects[target]:null;
  if(!o||!near(p,o))throw Error('target_not_in_reach');return o;};
 switch(command.type){
  case 'move':{
   if(!Number.isInteger(command.dx)||!Number.isInteger(command.dy)||Math.abs(command.dx)+Math.abs(command.dy)!==1)throw Error('invalid_move');
   if(!hallwayCellEnabled(p.x+command.dx,p.y+command.dy))throw Error('blocked');
   p.x+=command.dx;p.y+=command.dy;return {type:'moved',text:'Billy follows the Hallway’s shifting floor lights.'};
  }
  case 'travel':{
   if(command.target==='destination')return enterArchive(state);
   if(command.target!=='return')throw Error('unsupported_destination');object('return');
   state.location='afterlife-placement-office';Object.assign(p,{x:4,y:1});
   return {type:'area_entered',text:'Billy returns to the Placement Office. His assessment, Glitch decision and Hallway record remain filed.'};
  }
  case 'talk':{
   if(command.target!=='attendant'||!near(p,HALLWAY_WORLD.npcs.attendant))throw Error('npc_not_in_reach');
   if(command.topic!=='introduction')throw Error('unsupported_topic');
   h.attendantMet=true;
   if(h.mode==='assistance'){h.routeRevealed=true;return {type:'hallway_spoke',text:'You filed the discrepancy. The Case Worker asked me to help. Your route is '+HALLWAY_DESTINATIONS[state.placement]+'. Follow the assigned door; ignore the arrow selling timeshares.'};}
   if(h.inspectionComplete){h.routeRevealed=true;return {type:'hallway_spoke',text:'Inspection recorded. I remember the flag, Billy. Your route is '+HALLWAY_DESTINATIONS[state.placement]+'. The watch note stays with your file.'};}
   return {type:'hallway_spoke',text:'Your file is flagged. Take it to File Inspection, then return here. Heat is not a substitute for paperwork.'};
  }
  case 'use':{
   if(command.target!=='inspection')throw Error('unsupported_action');object('inspection');
   if(h.mode!=='scrutiny'||!h.attendantMet)throw Error('inspection_not_required');
   if(h.inspectionComplete)throw Error('inspection_already_recorded');
   h.inspectionComplete=true;return {type:'file_inspected',text:'The lamp records the discrepancy and stamps your file: WATCH NOTE RETAINED. Return to the attendant for your route. No heat has been erased.'};
  }
  case 'inspect':{
   const o=object(command.target);let text=o.description;
   if(command.target==='inspection'&&h.mode==='assistance')text='Your filed help note clears this checkpoint. No additional inspection is required.';
   if(command.target==='routes'&&h.routeRevealed)text='Your routing slip points toward '+HALLWAY_DESTINATIONS[state.placement]+'. The other arrows lead to later journeys.';
   if(command.target==='destination'){
    if(h.routeRevealed){h.destinationRead=true;text=HALLWAY_DESTINATIONS[state.placement]+'. Your route is confirmed. '+(state.placement==='memory'?'The Archive door is now open.':'The Veilway door remains closed in this build.');}
    else text='The destination lettering will not settle. Resolve your file with the attendant first.';
   }
   return {type:'inspected',target:command.target,text};
  }
  default:throw Error('unsupported_action');
 }
}
