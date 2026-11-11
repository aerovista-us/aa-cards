import {createWorldGameClient} from './world-client.mjs';
import {nextOfficeMove} from './office-navigation.mjs';
import {createOfficePresentation} from './office-scene.mjs';
const $=id=>document.getElementById(id);
let navigation=0,lastSnapshot={phase:'idle',view:null,message:'Connecting…'};
const reduced=$('reduce-motion');reduced.checked=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const local=['127.0.0.1','localhost'].includes(location.hostname);
// A loopback fixture can serve UI and API on separate origins, as deployment does.
const origin=local?(document.querySelector('meta[name=ascension-api-origin]')?.content||location.origin):'https://ascension-auth.aerovista.us';
if(local)$('build-scope').textContent='Isolated development environment · test identity · no production game data';
const presentation=createOfficePresentation({parent:$('office-scene'),onMove:(x,y)=>navigate({x,y}),
 onAnimation:()=>updateEnabled(),onUnavailable:()=>{$('scene-warning').hidden=false;},reduceMotion:()=>reduced.checked});
const client=createWorldGameClient({origin,onChange:render});
function canInput(){return lastSnapshot.phase==='ready'&&!presentation.animating;}
function updateEnabled(){
 const enabled=canInput(),view=lastSnapshot.view;
 for(const button of document.querySelectorAll('[data-direction]'))button.disabled=!enabled||!view?.actions.some(a=>a.id==='move-'+button.dataset.direction);
 for(const button of $('interaction-actions').querySelectorAll('button'))button.disabled=!enabled;
 for(const button of $('accessible-map').querySelectorAll('button'))button.disabled=!enabled||button.dataset.walkable!=='true';
 $('reload-game').disabled=['loading','saving'].includes(lastSnapshot.phase);
}
function render(current){
 lastSnapshot=current;const view=current.view,ready=current.phase==='ready';
 $('connection-status').textContent=current.message;
 $('connection-dot').classList.toggle('ready',ready);
 $('save-revision').textContent=view?'Saved revision '+view.revision:'';
 $('office-scene').dataset.phase=current.phase;
 $('scene-cover').hidden=!!view;
 $('cover-message').textContent=current.message;
 $('begin-game').hidden=current.phase!=='new_run';
 $('sign-in').hidden=current.phase!=='signed_out';
 $('position').textContent=view?'Billy · '+view.player.x+', '+view.player.y:'Awaiting your case file';
 $('position').dataset.x=view?String(view.player.x):'';$('position').dataset.y=view?String(view.player.y):'';
 $('intake-complete').hidden=!view?.mission.complete;
 $('mission-progress').textContent=view?view.mission.steps.filter(s=>s.complete).length+' / '+view.mission.steps.length+' filed':'Waiting for saved progress';
 const steps=$('mission-steps');steps.replaceChildren();
 for(const step of view?.mission.steps||[]){const item=document.createElement('li');item.textContent=step.label;item.classList.toggle('done',step.complete);steps.append(item);}
 const f=view?.caseFile;
 $('resonance').textContent=f?.assessment?f.assessment.resonance+' / 20':'—';
 $('trait').textContent=f?.assessment?.trait||'Not assessed';
 $('trait-effect').textContent=f?.assessment?.glitchInsight?'Echo Attuned: concealing a Glitch generates 1 less heat.':f?.assessment?'Assessment filed. Your destination remains your choice.':'';
 $('placement').textContent=f?.placement?.label||'Awaiting approval';
 $('glitch-status').textContent=f?((f.glitch.resolution==='report'?'Reported':f.glitch.resolution==='conceal'?'Concealed':f.glitch.observed?'Anomaly observed':'No anomaly recorded')+' · Heat '+f.glitch.heat):'Unrecorded';
 const inventory=$('inventory');inventory.replaceChildren();
 for(const item of f?.inventory||[]){const el=document.createElement('li');el.textContent=item.label;el.dataset.item=item.id;inventory.append(el);}
 const journal=$('journal');journal.replaceChildren();
 for(const event of [...(view?.journal||[])].reverse()){const li=document.createElement('li');li.textContent=event.text;journal.append(li);}
 $('latest-event').textContent=view?.journal.at(-1)?.text||'Billy is waiting at intake. Inspect the notice and collect your case file at Records.';
 if(!view)$('latest-event').textContent='Your case file will appear after the server confirms your game.';
 const actions=$('interaction-actions');actions.replaceChildren();
 for(const action of view?.actions.filter(a=>a.command.type!=='move')||[]){
  const button=document.createElement('button');button.type='button';button.textContent=action.label;button.dataset.action=action.id;
  button.addEventListener('click',()=>act(action.id));actions.append(button);
 }
 const map=$('accessible-map');map.replaceChildren();
 if(view){
  map.style.gridTemplateColumns='repeat('+view.world.width+', minmax(44px,1fr))';
  for(let y=0;y<view.world.height;y++)for(let x=0;x<view.world.width;x++){
   const cell=view.world.cells[y*view.world.width+x],marker=view.markers.find(m=>m.x===x&&m.y===y),player=view.player.x===x&&view.player.y===y;
   const button=document.createElement('button');button.type='button';button.dataset.walkable=String(cell.walkable);
   button.setAttribute('aria-label',marker?'Walk to '+marker.label:!cell.walkable?'Wall '+x+', '+y:'Walk to '+x+', '+y);
   button.textContent=player?'Billy':marker?marker.label:cell.walkable?'·':'';button.classList.toggle('occupied',player);
   if(marker)button.dataset.marker=marker.id;
   button.addEventListener('click',()=>navigate({x,y}));map.append(button);
  }
 }
 updateEnabled();
 void presentation.update(current).catch(()=>{$('scene-warning').hidden=false;});
}
async function act(id){
 navigation++;if(!canInput())return;
 try{await client.act(id);await presentation.whenSettled();}
 catch{$('connection-status').textContent='That action is no longer available. Reload your saved game.';}
}
async function navigate(target){
 if(!canInput())return;
 const ticket=++navigation;
 for(let steps=0;steps<128&&ticket===navigation;steps++){
  const current=client.snapshot();if(current.phase!=='ready')return;
  if(current.view.player.x===target.x&&current.view.player.y===target.y){$('interaction-actions').querySelector('button')?.focus();return;}
  const move=nextOfficeMove(current.view,target);
  if(!move){$('connection-status').textContent='That tile is not reachable from here.';return;}
  try{await client.act(move.id);await presentation.whenSettled();}catch{return;}
 }
}
for(const button of document.querySelectorAll('[data-direction]'))button.addEventListener('click',()=>act('move-'+button.dataset.direction));
$('reload-game').addEventListener('click',()=>{navigation++;void client.refresh();});
$('begin-game').addEventListener('click',()=>{if(client.snapshot().phase==='new_run')void client.begin();});
document.addEventListener('keydown',event=>{
 if(['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName))return;
 if(event.key==='Escape'){navigation++;return;}
 const direction={ArrowUp:'north',ArrowDown:'south',ArrowLeft:'west',ArrowRight:'east',w:'north',s:'south',a:'west',d:'east'}[event.key];
 if(direction){event.preventDefault();void act('move-'+direction);}
 if(event.key.toLowerCase()==='e')$('interaction-actions').querySelector('button:not(:disabled)')?.focus();
});
window.addEventListener('pagehide',()=>{navigation++;client.clear();});
window.addEventListener('pageshow',event=>{if(event.persisted)void client.refresh();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)navigation++;else if(client.snapshot().phase==='ready')void client.refresh();});
void client.refresh();
