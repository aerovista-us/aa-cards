// Player-visible facts only. Saved NPC memory/owner/event internals stay server-side.
import {OFFICE_WORLD,restoreOfficeRun} from './world-interaction-engine.mjs';
import {normalizeWorldView} from '../game/world-contract.mjs';
const nearby=(p,t)=>Math.abs(p.x-t.x)+Math.abs(p.y-t.y)<=1;
const labels={cabinet:'Case-file cabinet',notice:'Intake notice',caseworker:'Case Worker'};
export function projectWorldGame(identity,run){
 if(!identity?.subject)throw Object.assign(Error('authentication_required'),{status:401});
 if(run?.state?.ownerId!==identity.subject)throw Object.assign(Error('not_found'),{status:404});
 const state=restoreOfficeRun(JSON.stringify(run.state),{ownerId:identity.subject});
 if(run.id!==state.runId||run.revision!==state.revision)throw Error('corrupt_revision');
 const w=OFFICE_WORLD,p=state.player,actions=[];
 const add=(id,label,command)=>actions.push({id,label,command});
 for(const [name,dx,dy] of [['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]]){
  const x=p.x+dx,y=p.y+dy;
  if(x>=0&&y>=0&&x<w.width&&y<w.height&&!w.blocked.includes(x+','+y))add('move-'+name,'Move '+name,{type:'move',dx,dy});
 }
 for(const [target,o]of Object.entries(w.objects))if(nearby(p,o)){
  add('inspect-'+target,target==='notice'?'Read intake notice':'Inspect case-file cabinet',{type:'inspect',target});
  if(target==='cabinet'&&!state.objectState.cabinet.open)add('open-cabinet','Open case-file cabinet',{type:'open',target});
 }
 if(nearby(p,w.npcs.caseworker))for(const [topic,label]of [['introduction','Introduce yourself'],['placement','Discuss placement'],['cabinet','Discuss your case file']])
  add('talk-'+topic,label,{type:'talk',target:'caseworker',topic});
 const steps=[
  {id:'notice',label:'Read the intake notice',complete:state.objectState.notice.read},
  {id:'case-file',label:'Find your case file',complete:state.objectState.cabinet.open},
  {id:'placement',label:'Discuss placement with the Case Worker',complete:state.npcMemory.caseworker.topics.includes('placement')}
 ];
 const journal=state.events.slice(-8).map(e=>({revision:e.revision,text:e.type==='moved'?'Moved through the office.':
  e.type==='inspected'?'Inspected '+(labels[e.target]||'an office object')+'.':
  e.type==='object_opened'?'Opened the cabinet and found Billy’s case file.':
  e.type==='npc_spoke'?String(e.text||'The Case Worker answered.').slice(0,256):'Office activity recorded.'}));
 return normalizeWorldView({schema:'ascension.world-view.v1',runId:run.id,revision:run.revision,
  world:{id:w.id,label:'Afterlife Placement Office',width:w.width,height:w.height,
   cells:Array.from({length:w.width*w.height},(_,i)=>({walkable:!w.blocked.includes((i%w.width)+','+Math.floor(i/w.width))}))},
  player:p,markers:[...Object.entries(w.objects).map(([id,o])=>({id,label:labels[id],kind:'object',x:o.x,y:o.y})),
   {id:'caseworker',label:labels.caseworker,kind:'npc',x:w.npcs.caseworker.x,y:w.npcs.caseworker.y}],
  actions,mission:{title:'Open your case',complete:steps.every(s=>s.complete),steps},journal});
}
