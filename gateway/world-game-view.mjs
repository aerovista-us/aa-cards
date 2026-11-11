// Public projection of committed intake facts; private seeds, memory and future hooks stay server-side.
import {OFFICE_WORLD,restoreOfficeRun,intakeSteps} from './world-interaction-engine.mjs';
import {ITEMS,PLACEMENTS} from './office-layout.mjs';
import {normalizeWorldView} from '../game/world-contract.mjs';
const nearby=(p,t)=>Math.abs(p.x-t.x)+Math.abs(p.y-t.y)<=1;
export function projectWorldGame(identity,run){
 if(!identity?.subject)throw Object.assign(Error('authentication_required'),{status:401});
 if(run?.state?.ownerId!==identity.subject)throw Object.assign(Error('not_found'),{status:404});
 const s=restoreOfficeRun(JSON.stringify(run.state),{ownerId:identity.subject});
 if(run.id!==s.runId||run.revision!==s.revision)throw Error('corrupt_revision');
 const w=OFFICE_WORLD,p=s.player,actions=[];
 const add=(id,label,command)=>actions.push({id,label,command});
 for(const [name,dx,dy]of [['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]]){
  const x=p.x+dx,y=p.y+dy;
  if(x>=0&&y>=0&&x<w.width&&y<w.height&&!w.blocked.includes(x+','+y))add('move-'+name,'Move '+name,{type:'move',dx,dy});
 }
 for(const [target,o]of Object.entries(w.objects))if(nearby(p,o)){
  add('inspect-'+target,target==='rolodex'&&s.glitch.observed&&!s.glitch.inspected?'Examine the Glitch':'Inspect '+o.label,{type:'inspect',target});
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
 const steps=intakeSteps(s),complete=steps.every(x=>x.complete);
 return normalizeWorldView({schema:'ascension.world-view.v2',runId:run.id,revision:run.revision,
  world:{id:w.id,label:'Afterlife Placement Office',width:w.width,height:w.height,
   cells:Array.from({length:w.width*w.height},(_,i)=>({walkable:!w.blocked.includes((i%w.width)+','+Math.floor(i/w.width))}))},
  player:p,markers:[...Object.entries(w.objects).map(([id,o])=>({id,label:o.label,kind:o.kind,x:o.x,y:o.y})),
   {id:'caseworker',...w.npcs.caseworker}],actions,
  mission:{title:'Complete your Afterlife intake',complete,steps},
  journal:s.events.slice(-8).map(e=>({revision:e.revision,text:e.text.slice(0,256)})),
  caseFile:{inventory:Object.entries(s.inventory).map(([id,quantity])=>({id,label:ITEMS[id],quantity})),assessment:s.stat.assessment,
   placement:s.placement?{id:s.placement,label:PLACEMENTS[s.placement]}:null,
   glitch:{...s.glitch,heat:s.heat},departureReady:complete}});
}
