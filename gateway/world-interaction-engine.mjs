// M19 foundation: deterministic world interaction rules; no AI or network authority.
// Existing recovered files are reference concepts, not required runtime dependencies.
export const OFFICE_WORLD = Object.freeze({
  id:'afterlife-placement-office',
  width:5,height:4,
  blocked:['1,1','3,2'],
  objects:{
    cabinet:{x:3,y:1,kind:'container',description:'A locked filing cabinet marked RESTRICTED.'},
    notice:{x:1,y:0,kind:'inspectable',description:'A notice reads: YOUR NUMBER WILL BE CALLED EVENTUALLY.'}
  },
  npcs:{
    caseworker:{x:4,y:1,name:'Case Worker',
      greeting:'Your file is open. What would you like to know?'}
  }
});
const key=(x,y)=>x+','+y;
const adjacency=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
const adjacentOrSame=(a,b)=>adjacency(a,b)||(a.x===b.x&&a.y===b.y);
const copy=x=>JSON.parse(JSON.stringify(x));
export function createOfficeRun({ownerId,runId}){
 if(typeof ownerId!=='string'||!ownerId.trim()||typeof runId!=='string'||!runId.trim())throw Error('owner_and_run_required');
 return {schemaVersion:1,ownerId,runId,revision:0,location:OFFICE_WORLD.id,
   player:{x:0,y:0,name:'Billy'},objectState:{cabinet:{open:false},notice:{read:false}},
   npcMemory:{caseworker:{met:false,topics:[]}},events:[]};
}
export function applyWorldAction(saved,command,{world=OFFICE_WORLD}={}){
 if(!saved||saved.schemaVersion!==1||saved.location!==world.id)throw Error('invalid_world_state');
 if(!command||typeof command!=='object')throw Error('invalid_action');
 const state=copy(saved),p=state.player;let event;
 switch(command.type){
  case 'move':{
   const dx=command.dx,dy=command.dy;
   if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)throw Error('invalid_move');
   const x=p.x+dx,y=p.y+dy;
   if(x<0||y<0||x>=world.width||y>=world.height||world.blocked.includes(key(x,y)))throw Error('blocked');
   p.x=x;p.y=y;event={type:'moved',x,y};break;
  }
  case 'inspect':{
   const target=world.objects[command.target];
   if(!target||!adjacentOrSame(p,target))throw Error('target_not_in_reach');
   if(command.target==='notice')state.objectState.notice.read=true;
   event={type:'inspected',target:command.target,text:target.description};break;
  }
  case 'open':{
   if(command.target!=='cabinet')throw Error('not_openable');
   const target=world.objects.cabinet;
   if(!adjacentOrSame(p,target))throw Error('target_not_in_reach');
   if(state.objectState.cabinet.open)throw Error('already_open');
   state.objectState.cabinet.open=true;
   event={type:'object_opened',target:'cabinet',text:'The cabinet opens. Inside is a file bearing Billy’s name.'};break;
  }
  case 'talk':{
   if(command.target!=='caseworker'||!adjacentOrSame(p,world.npcs.caseworker))throw Error('npc_not_in_reach');
   const topic=command.topic;
   if(!['introduction','placement','cabinet'].includes(topic))throw Error('unsupported_topic');
   const memory=state.npcMemory.caseworker;memory.met=true;
   if(!memory.topics.includes(topic))memory.topics.push(topic);
   const replies={
    introduction:'Welcome, Billy. The paperwork is patient. I am less so.',
    placement:'I review the options. The Rolodex shows them. The Stat Generator changes traits, not destinations.',
    cabinet:state.objectState.cabinet.open?'You opened that? The Mitch will demand three explanations.':'Those records are restricted. Please keep your hands visible.'
   };
   event={type:'npc_spoke',npc:'caseworker',topic,text:replies[topic]};break;
  }
  default:throw Error('unsupported_action');
 }
 state.revision++;
 state.events.push({revision:state.revision,...event});
 return {state,event};
}
export function serializeOfficeRun(state){return JSON.stringify(state)}
export function restoreOfficeRun(json,{ownerId}={}){
 const x=JSON.parse(json);
 if(!x||x.schemaVersion!==1||x.location!==OFFICE_WORLD.id||!x.player||
 !x.objectState?.cabinet||!x.npcMemory?.caseworker||
 !Array.isArray(x.events)||!Number.isSafeInteger(x.revision))throw Error('invalid_save');
 if(!ownerId||x.ownerId!==ownerId)throw Error('owner_mismatch');
 return copy(x);
}
