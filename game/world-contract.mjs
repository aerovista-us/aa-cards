// Public main-game contract. No domain engine, saved state, identity or RNG here.
const id=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const text=(x,max=256)=>typeof x==='string'&&x.length<=max;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
export function normalizeWorldCommand(command){
 if(!command||typeof command!=='object'||Array.isArray(command))throw Error('invalid_command');
 const shapes={move:['type','dx','dy'],inspect:['type','target'],open:['type','target'],take:['type','target'],use:['type','target'],
  talk:['type','target','topic'],choose:['type','target','choice']};
 const keys=Object.hasOwn(shapes,command.type)?shapes[command.type]:null;
 if(!keys||Object.keys(command).length!==keys.length||!Object.keys(command).every(k=>keys.includes(k)))throw Error('invalid_command');
 if(command.type==='move'){
  if(!Number.isInteger(command.dx)||!Number.isInteger(command.dy)||Math.abs(command.dx)+Math.abs(command.dy)!==1)throw Error('invalid_command');
  return {type:'move',dx:command.dx,dy:command.dy};
 }
 if(!id(command.target))throw Error('invalid_command');
 if(command.type==='talk'){
  if(!['introduction','placement','cabinet','glitch'].includes(command.topic))throw Error('invalid_command');
  return {type:'talk',target:command.target,topic:command.topic};
 }
 if(command.type==='choose'){
  if(!(command.target==='rolodex'&&['memory','present'].includes(command.choice))&&
   !(command.target==='glitch'&&['report','conceal'].includes(command.choice)))throw Error('invalid_command');
  return {type:'choose',target:command.target,choice:command.choice};
 }
 return {type:command.type,target:command.target};
}
export function normalizeWorldView(raw){
 if(raw?.schema!=='ascension.world-view.v2'||!id(raw.runId)||!integer(raw.revision)||
  !id(raw.world?.id)||!text(raw.world?.label,80)||!integer(raw.world?.width)||!integer(raw.world?.height)||
  raw.world.width<1||raw.world.height<1||raw.world.width>64||raw.world.height>64||
  !Array.isArray(raw.world.cells)||raw.world.cells.length!==raw.world.width*raw.world.height||
  !integer(raw.player?.x)||!integer(raw.player?.y)||raw.player.x>=raw.world.width||raw.player.y>=raw.world.height||
  !Array.isArray(raw.markers)||raw.markers.length>24||!Array.isArray(raw.actions)||raw.actions.length>24||
  !Array.isArray(raw.journal)||raw.journal.length>8||!text(raw.mission?.title,80)||
  typeof raw.mission?.complete!=='boolean'||!Array.isArray(raw.mission?.steps)||raw.mission.steps.length>12)throw Error('invalid_view');
 const cells=raw.world.cells.map(c=>{if(typeof c?.walkable!=='boolean')throw Error('invalid_view');return {walkable:c.walkable};});
 if(!cells[raw.player.y*raw.world.width+raw.player.x].walkable)throw Error('invalid_view');
 const markers=raw.markers.map(m=>{
  if(!id(m?.id)||!text(m.label,80)||!['npc','object'].includes(m.kind)||!integer(m.x)||!integer(m.y)||
   m.x>=raw.world.width||m.y>=raw.world.height||!cells[m.y*raw.world.width+m.x].walkable)throw Error('invalid_view');
  return {id:m.id,label:m.label,kind:m.kind,x:m.x,y:m.y};
 });
 const actions=raw.actions.map(a=>{if(!id(a?.id)||!text(a.label,80))throw Error('invalid_view');return {id:a.id,label:a.label,command:normalizeWorldCommand(a.command)};});
 if(new Set(markers.map(m=>m.id)).size!==markers.length||new Set(actions.map(a=>a.id)).size!==actions.length)throw Error('invalid_view');
 const steps=raw.mission.steps.map(s=>{if(!id(s?.id)||!text(s.label,100)||typeof s.complete!=='boolean')throw Error('invalid_view');return {id:s.id,label:s.label,complete:s.complete};});
 if(new Set(steps.map(s=>s.id)).size!==steps.length||raw.mission.complete!==steps.every(s=>s.complete))throw Error('invalid_view');
 const journal=raw.journal.map(e=>{if(!integer(e?.revision)||e.revision>raw.revision||!text(e.text))throw Error('invalid_view');return {revision:e.revision,text:e.text};});
 const f=raw.caseFile,a=f?.assessment,p=f?.placement,g=f?.glitch;
 if(!f||!Array.isArray(f.inventory)||f.inventory.length>3||typeof f.departureReady!=='boolean'||f.departureReady!==raw.mission.complete||
  (a!==null&&(!integer(a?.resonance)||a.resonance<1||a.resonance>20||
   a.trait!==(a.resonance>=15?'Echo Attuned':a.resonance>=8?'Pattern Seeker':'Grounded')||a.glitchInsight!==(a.resonance>=15?1:0)))||
  (p!==null&&(!['memory','present'].includes(p?.id)||p.label!==(p.id==='memory'?'Memory Annex':'Present Hall')))||
  typeof g?.observed!=='boolean'||typeof g?.inspected!=='boolean'||(g.resolution!==null&&!['report','conceal'].includes(g.resolution))||
  !integer(g.heat)||g.heat>2)throw Error('invalid_view');
 const inventory=f.inventory.map(item=>{
  if(!['case-file','queue-ticket','placement-pass'].includes(item?.id)||!text(item.label,80)||item.quantity!==1)throw Error('invalid_view');
  return {id:item.id,label:item.label,quantity:1};
 });
 if(new Set(inventory.map(i=>i.id)).size!==inventory.length)throw Error('invalid_view');
 return {schema:raw.schema,runId:raw.runId,revision:raw.revision,
  world:{id:raw.world.id,label:raw.world.label,width:raw.world.width,height:raw.world.height,cells},
  player:{x:raw.player.x,y:raw.player.y},markers,actions,
  mission:{title:raw.mission.title,complete:raw.mission.complete,steps},journal,
  caseFile:{inventory,assessment:a===null?null:{resonance:a.resonance,trait:a.trait,glitchInsight:a.glitchInsight},
   placement:p===null?null:{id:p.id,label:p.label},glitch:{observed:g.observed,inspected:g.inspected,resolution:g.resolution,heat:g.heat},departureReady:f.departureReady}};
}
