// Public projection of committed intake facts; private seeds, memory and future hooks stay server-side.
import {OFFICE_WORLD,HALLWAY_WORLD,hallwaySteps,restoreOfficeRun,intakeSteps} from './world-interaction-engine.mjs';
import {ITEMS,PLACEMENTS} from './office-layout.mjs';
import {normalizeWorldView} from '../game/world-contract.mjs';
const nearby=(p,t)=>Math.abs(p.x-t.x)+Math.abs(p.y-t.y)<=1;
export function projectWorldGame(identity,run){
 if(!identity?.subject)throw Object.assign(Error('authentication_required'),{status:401});
 if(run?.state?.ownerId!==identity.subject)throw Object.assign(Error('not_found'),{status:404});
 const s=restoreOfficeRun(JSON.stringify(run.state),{ownerId:identity.subject});
 if(run.id!==s.runId||run.revision!==s.revision)throw Error('corrupt_revision');
 const inHallway=s.location===HALLWAY_WORLD.id,w=inHallway?HALLWAY_WORLD:OFFICE_WORLD,p=s.player,actions=[];
 const add=(id,label,command)=>actions.push({id,label,command});
 for(const [name,dx,dy]of [['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]]){
  const x=p.x+dx,y=p.y+dy;
  if(x>=0&&y>=0&&x<w.width&&y<w.height&&!w.blocked.includes(x+','+y))add('move-'+name,'Move '+name,{type:'move',dx,dy});
 }
 if(!inHallway){
 for(const [target,o]of Object.entries(w.objects))if(nearby(p,o)){
  add('inspect-'+target,target==='rolodex'&&s.glitch.observed&&!s.glitch.inspected?'Examine the Glitch':'Inspect '+o.label,{type:'inspect',target});
  if(target==='exit'&&intakeSteps(s).every(step=>step.complete))add('enter-hallway','Enter the Hallway',{type:'travel',target:'exit'});
  if(target==='records'&&!s.objectState.records.taken)add('take-records','Take your case file',{type:'take',target});
  if(target==='stat'&&!s.stat.assessment&&s.objectState.records.taken&&s.npcMemory.caseworker.met)add('use-stat','Record your assessment',{type:'use',target});
  if(target==='rolodex'){
   if(s.placementAuthorized&&!s.placement)for(const [choice,label]of Object.entries(PLACEMENTS))add('choose-'+choice,'Choose '+label,{type:'choose',target,choice});
   if(s.glitch.inspected&&!s.glitch.resolution){
    add('resolve-report','Report the Glitch',{type:'choose',target:'glitch',choice:'report'});
    add('resolve-conceal','Conceal the Glitch',{type:'choose',target:'glitch',choice:'conceal'});
   }
  }
 }
 if(nearby(p,w.npcs.caseworker)){
  for(const [topic,label]of [['introduction','Speak with Case Worker'],['placement','Request placement approval'],['cabinet','Ask about your case file'],
   ...(s.glitch.observed?[['glitch','Ask about the Glitch']]:[])])add('talk-'+topic,label,{type:'talk',target:'caseworker',topic});
 }
 }else{
  const h=s.hallway;
  for(const [target,o]of Object.entries(w.objects))if(nearby(p,o)){
   add('inspect-'+target,'Inspect '+o.label,{type:'inspect',target});
   if(target==='return')add('return-office','Return to the Office',{type:'travel',target:'return'});
   if(target==='inspection'&&h.mode==='scrutiny'&&h.attendantMet&&!h.inspectionComplete)add('use-inspection','Submit your flagged file',{type:'use',target});
  }
  if(nearby(p,w.npcs.attendant))add('talk-attendant','Speak with Hallway attendant',{type:'talk',target:'attendant',topic:'introduction'});
 }
 const steps=inHallway?hallwaySteps(s):intakeSteps(s),complete=steps.every(x=>x.complete);
 return normalizeWorldView({schema:'ascension.world-view.v3',runId:run.id,revision:run.revision,
  world:{id:w.id,label:inHallway?'The Hallway':'Afterlife Placement Office',width:w.width,height:w.height,
   cells:Array.from({length:w.width*w.height},(_,i)=>({walkable:!w.blocked.includes((i%w.width)+','+Math.floor(i/w.width))}))},
  player:p,markers:[...Object.entries(w.objects).map(([id,o])=>({id,label:o.label,kind:o.kind,x:o.x,y:o.y})),
   ...Object.entries(w.npcs).map(([id,npc])=>({id,...npc}))],actions,
  hallway:s.hallway,
  mission:{title:inHallway?'Find your way through the Hallway':'Complete your Afterlife intake',complete,steps},
  journal:s.events.filter(e=>e.type!=='moved').slice(-8).map(e=>({revision:e.revision,text:e.text.slice(0,256)})),
  caseFile:{inventory:Object.entries(s.inventory).map(([id,quantity])=>({id,label:ITEMS[id],quantity})),assessment:s.stat.assessment,
   placement:s.placement?{id:s.placement,label:PLACEMENTS[s.placement]}:null,
   glitch:{...s.glitch,heat:s.heat},departureReady:intakeSteps(s).every(step=>step.complete)}});
}
