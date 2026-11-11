// Authored main-game intake rules. This is not a recovered-v4 parity claim.
import {randomBytes} from 'node:crypto';
import {OFFICE_WORLD,officeCellEnabled,TOPICS,PLACEMENTS,ITEMS,assessmentFor} from './office-layout.mjs';
import {HALLWAY_WORLD,hallwayCellEnabled} from './hallway-layout.mjs';
import {enterHallway,applyHallwayAction} from './hallway-rules.mjs';
import {createPersistentRng} from './persistent-rng.mjs';
const copy=x=>structuredClone(x);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const near=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1;
const EVENTS=new Set(['moved','inspected','npc_spoke','records_taken','assessment_completed','placement_selected','glitch_observed','glitch_resolved','area_entered','hallway_spoke','file_inspected']);
export function intakeSteps(s){return [
 {id:'notice',label:'Read the intake notice',complete:s.objectState.notice.read},
 {id:'records',label:'Collect your case file at Records',complete:s.objectState.records.taken},
 {id:'caseworker',label:'Meet the Case Worker',complete:s.npcMemory.caseworker.met},
 {id:'assessment',label:'Complete the Stat Generator assessment',complete:s.stat.assessment!==null},
 {id:'placement',label:'Get approval and choose a Rolodex placement',complete:s.placement!==null},
 {id:'glitch',label:'Decide what to do with the first Glitch',complete:s.glitch.resolution!==null}
];}
export function createOfficeRun({ownerId,runId,seedString=randomBytes(16).toString('hex')}={}){
 if(!id(ownerId)||!id(runId)||!id(seedString))throw Error('owner_and_run_required');
 return {schemaVersion:3,ownerId,runId,revision:0,location:OFFICE_WORLD.id,
  player:{...OFFICE_WORLD.start,name:'Billy'},objectState:{notice:{read:false},records:{read:false,taken:false}},
  inventory:{},stat:{assessment:null},placementAuthorized:false,placement:null,
  glitch:{observed:false,inspected:false,resolution:null},heat:0,
  rng:{seedString,rngDraws:0},npcMemory:{caseworker:{met:false,topics:[],suspicion:0}},
  consequences:{hallway:null},hallway:null,events:[]};
}
export function applyWorldAction(saved,command){
 const state=restoreOfficeRun(JSON.stringify(saved),{ownerId:saved?.ownerId}),p=state.player;
 if(!command||typeof command!=='object')throw Error('invalid_action');
 let event;
 const object=target=>{
  const o=Object.hasOwn(OFFICE_WORLD.objects,target)?OFFICE_WORLD.objects[target]:null;
  if(!o||!near(p,o))throw Error('target_not_in_reach');return o;
 };
 if(state.location===HALLWAY_WORLD.id)event=applyHallwayAction(state,command);
 else switch(command.type){
  case 'travel':{
   if(command.target!=='exit')throw Error('unsupported_destination');
   event=enterHallway(state,intakeSteps(state).every(s=>s.complete));break;
  }
  case 'move':{
   const {dx,dy}=command;
   if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)throw Error('invalid_move');
   if(!officeCellEnabled(p.x+dx,p.y+dy))throw Error('blocked');
   p.x+=dx;p.y+=dy;event={type:'moved',text:'Billy follows the intake floor markings.'};break;
  }
  case 'inspect':{
   const o=object(command.target);let text=o.description;
   if(command.target==='notice')state.objectState.notice.read=true;
   if(command.target==='records')state.objectState.records.read=true;
   if(command.target==='rolodex'&&state.glitch.observed&&!state.glitch.inspected){
    state.glitch.inspected=true;
    event={type:'glitch_observed',text:'Billy’s name appears on both cards. THE MITCH’s stamp flickers underneath. Report the discrepancy, or conceal it and accept the heat.'};
   }else{
    if(command.target==='exit'&&intakeSteps(state).every(s=>s.complete))text='Intake complete. Your '+PLACEMENTS[state.placement]+' pass is ready. Your Hallway route is available through the Placement Door.';
    event={type:'inspected',target:command.target,text};
   }
   break;
  }
  case 'take':{
   if(command.target!=='records')throw Error('unsupported_action');object('records');
   if(state.objectState.records.taken)throw Error('already_taken');
   state.objectState.records={read:true,taken:true};state.inventory['case-file']=1;state.inventory['queue-ticket']=1;
   event={type:'records_taken',text:'Billy collects his case file and queue ticket. Both have his name. They disagree on the punctuation.'};break;
  }
  case 'use':{
   if(command.target!=='stat')throw Error('unsupported_action');object('stat');
   if(state.stat.assessment)throw Error('assessment_already_recorded');
   if(!state.objectState.records.taken||!state.npcMemory.caseworker.met)throw Error('intake_prerequisites');
   const rng=createPersistentRng(state.rng),roll=1+Math.floor(rng.next()*20);
   state.stat.assessment=assessmentFor(roll);state.rng=rng.checkpoint();
   event={type:'assessment_completed',text:'Assessment filed: resonance '+roll+' / 20; '+state.stat.assessment.trait+'. This changes your assessment, not your destination.'};break;
  }
  case 'talk':{
   if(command.target!=='caseworker'||!near(p,OFFICE_WORLD.npcs.caseworker))throw Error('npc_not_in_reach');
   if(!TOPICS.includes(command.topic))throw Error('unsupported_topic');
   const memory=state.npcMemory.caseworker;memory.met=true;
   if(!memory.topics.includes(command.topic))memory.topics.push(command.topic);
   let text;
   if(command.topic==='introduction')text='Billy. Collect your file at Records, complete the Stat Generator assessment, then bring both back. I authorize placement; the Rolodex records your choice.';
   if(command.topic==='cabinet')text=state.objectState.records.taken?'Your case file is in order. Please keep it that way.':'Records has your file. Do not take someone else’s existential crisis.';
   if(command.topic==='placement'){
    if(state.objectState.records.taken&&state.stat.assessment){state.placementAuthorized=true;
     text=state.placement?'Your '+PLACEMENTS[state.placement]+' selection is recorded.':'Assessment verified. You may choose Memory Annex or Present Hall at the Rolodex. The score does not choose for you.';
    }else text='I need your case file and completed assessment before I can authorize the Rolodex.';
   }
   if(command.topic==='glitch')text=state.glitch.resolution==='report'?'Your discrepancy report is attached. Someone in the Hallway may help. Officially, this conversation was entirely ordinary.':
    state.glitch.resolution==='conceal'?'Your file feels unusually warm. The Hallway will be paying attention.':
    state.glitch.observed?'Decide whether to report the discrepancy at the Rolodex. I cannot file an undecided anomaly.':'No discrepancy has been entered in your file.';
   event={type:'npc_spoke',npc:'caseworker',topic:command.topic,text};break;
  }
  case 'choose':{
   object('rolodex');
   if(command.target==='rolodex'){
    if(!Object.hasOwn(PLACEMENTS,command.choice))throw Error('unsupported_choice');
    if(!state.placementAuthorized)throw Error('placement_not_authorized');
    if(state.placement)throw Error('placement_already_recorded');
    state.placement=command.choice;state.glitch.observed=true;
    event={type:'placement_selected',text:PLACEMENTS[command.choice]+' selected. The cards stutter: Billy is listed twice. An impossible stamp appears under the routing line.'};
   }else if(command.target==='glitch'){
    if(!['report','conceal'].includes(command.choice))throw Error('unsupported_choice');
    if(!state.glitch.inspected)throw Error('glitch_not_investigated');
    if(state.glitch.resolution)throw Error('glitch_already_resolved');
    state.glitch.resolution=command.choice;state.inventory['placement-pass']=1;
    if(command.choice==='conceal'){
     state.heat=2-state.stat.assessment.glitchInsight;state.npcMemory.caseworker.suspicion=1;
     state.consequences.hallway='scrutiny';
    }else state.consequences.hallway='assistance';
    event={type:'glitch_resolved',text:command.choice==='report'?'Discrepancy reported. A help note follows your file; your placement pass is issued.':
     'Discrepancy concealed. Heat rises to '+state.heat+'; a watch note follows your file. Your placement pass is issued.'};
   }else throw Error('unsupported_choice');
   break;
  }
  default:throw Error('unsupported_action');
 }
 if(!Number.isSafeInteger(state.revision+1))throw Error('invalid_world_state');
 state.revision++;state.events.push({revision:state.revision,...event});state.events=state.events.slice(-128);
 // Validate mechanics/flags before the owner store can persist the new state.
 return {state:restoreOfficeRun(JSON.stringify(state),{ownerId:state.ownerId}),event};
}
export function serializeOfficeRun(state){return JSON.stringify(state);}
export function restoreOfficeRun(json,{ownerId}={}){
 const s=JSON.parse(json);
 if(!ownerId||s?.ownerId!==ownerId)throw Error('owner_mismatch');
 // Explicit additive upgrade of the prior candidate: retain every Office fact.
 if(s.schemaVersion===2){
  if(s.location!==OFFICE_WORLD.id||Object.hasOwn(s,'hallway'))throw Error('invalid_save');
  s.schemaVersion=3;s.hallway=null;
 }else if(s.schemaVersion!==3)throw Error('unsupported_save_version');
 const memory=s.npcMemory?.caseworker,record=s.objectState?.records,a=s.stat?.assessment,g=s.glitch;
 const bad=!id(s.ownerId)||!id(s.runId)||![OFFICE_WORLD.id,HALLWAY_WORLD.id].includes(s.location)||!Number.isSafeInteger(s.revision)||s.revision<0||
  s.player?.name!=='Billy'||!(s.location===OFFICE_WORLD.id?officeCellEnabled:hallwayCellEnabled)(s.player?.x,s.player?.y)||
  typeof s.objectState?.notice?.read!=='boolean'||typeof record?.read!=='boolean'||typeof record?.taken!=='boolean'||
  !s.inventory||typeof s.inventory!=='object'||Array.isArray(s.inventory)||Object.keys(s.inventory).some(k=>!Object.hasOwn(ITEMS,k)||s.inventory[k]!==1)||
  (s.inventory['case-file']===1)!==record.taken||(s.inventory['queue-ticket']===1)!==record.taken||
  typeof memory?.met!=='boolean'||!Array.isArray(memory.topics)||memory.topics.length>4||new Set(memory.topics).size!==memory.topics.length||
  memory.topics.some(x=>!TOPICS.includes(x))||(!memory.met&&memory.topics.length>0)||![0,1].includes(memory.suspicion)||
  typeof s.placementAuthorized!=='boolean'||(s.placement!==null&&!Object.hasOwn(PLACEMENTS,s.placement))||
  !g||typeof g.observed!=='boolean'||typeof g.inspected!=='boolean'||(g.resolution!==null&&!['report','conceal'].includes(g.resolution))||
  (s.placement!==null)!==g.observed||(g.inspected&&!g.observed)||
  (g.resolution!==null&&!g.inspected)||
  !id(s.rng?.seedString)||![0,1].includes(s.rng.rngDraws)||
  (a!==null&&(!Number.isInteger(a?.resonance)||a.resonance<1||a.resonance>20||Object.keys(a).length!==3||
   a.trait!==assessmentFor(a.resonance).trait||a.glitchInsight!==assessmentFor(a.resonance).glitchInsight))||
  (a!==null)!==(s.rng.rngDraws===1)||(a!==null&&(!record.taken||!memory.met))||
  (s.placementAuthorized&&(!record.taken||!a||!memory.met))||(s.placement!==null&&!s.placementAuthorized)||
  !Number.isInteger(s.heat)||s.heat<0||s.heat>2||memory.suspicion!==(g.resolution==='conceal'?1:0)||
  s.heat!==(g.resolution==='conceal'?2-a.glitchInsight:0)||
  (s.inventory['placement-pass']===1)!==(g.resolution!==null)||
  s.consequences?.hallway!==(g.resolution==='conceal'?'scrutiny':g.resolution==='report'?'assistance':null)||
  !Array.isArray(s.events)||s.events.length>128||s.events.some(e=>!Number.isSafeInteger(e?.revision)||e.revision<1||e.revision>s.revision||!EVENTS.has(e.type)||typeof e.text!=='string'||e.text.length>512);
 if(bad)throw Error('invalid_save');
 const h=s.hallway;
 if(h!==null){
  if(!h||typeof h!=='object'||Array.isArray(h)||Object.keys(h).length!==5||
   h.mode!==s.consequences.hallway||!['assistance','scrutiny'].includes(h.mode)||
   ['attendantMet','inspectionComplete','routeRevealed','destinationRead'].some(k=>typeof h[k]!=='boolean')||
   !intakeSteps(s).every(step=>step.complete)||(h.inspectionComplete&&(h.mode!=='scrutiny'||!h.attendantMet))||
   (h.routeRevealed&&(!h.attendantMet||(h.mode==='scrutiny'&&!h.inspectionComplete)))||
   (h.mode==='assistance'&&h.attendantMet!==h.routeRevealed)||(h.destinationRead&&!h.routeRevealed))throw Error('invalid_save');
 }else if(s.location===HALLWAY_WORLD.id)throw Error('invalid_save');
 return copy(s);
}
