import {OFFICE_WORLD,createOfficeRun,applyWorldAction,serializeOfficeRun,restoreOfficeRun} from '../gateway/world-interaction-engine.mjs';
const ownerId='local-prototype-only',runId='m19-office';
const storageKey='ascension:m19:office:v1';
const root=document.querySelector('#board'), log=document.querySelector('#events');
const status=document.querySelector('#status'), dialogue=document.querySelector('#dialogue');
const saveStatus=document.querySelector('#save-status');
let state;
function load(){
 try{const raw=localStorage.getItem(storageKey);if(raw)return restoreOfficeRun(raw,{ownerId})}
 catch(e){saveStatus.textContent='Local save could not be read; started a fresh session.'}
 return createOfficeRun({ownerId,runId});
}
function persist(){try{localStorage.setItem(storageKey,serializeOfficeRun(state));saveStatus.textContent='Saved locally on this device · Not an account save';}catch{saveStatus.textContent='Local storage unavailable. Progress is temporary.'}}
function act(command){
 try{const result=applyWorldAction(state,command);state=result.state;persist();render();
  if(result.event.text)dialogue.textContent=result.event.text;
  else dialogue.textContent='Billy moves to a new tile.';
 }catch(e){dialogue.textContent='That action is unavailable: '+e.message;}
}
function tile(x,y){
 const b=document.createElement('button');b.type='button';b.className='tile';
 const blocked=OFFICE_WORLD.blocked.includes(x+','+y);
 const player=state.player.x===x&&state.player.y===y;
 const item=Object.entries(OFFICE_WORLD.objects).find(([,v])=>v.x===x&&v.y===y);
 const npc=Object.entries(OFFICE_WORLD.npcs).find(([,v])=>v.x===x&&v.y===y);
 b.classList.toggle('wall',blocked);b.classList.toggle('player',player);
 b.setAttribute('aria-label',player?'Billy at '+x+','+y:blocked?'Wall at '+x+','+y:item?item[0]:npc?npc[1].name:'Floor at '+x+','+y);
 b.textContent=player?'◆':item?(item[0]==='cabinet'?(state.objectState.cabinet.open?'▣':'▤'):'▧'):npc?'♟':blocked?'':'·';
 if(blocked)b.disabled=true;
 else if(item)b.addEventListener('click',()=>{selected=item[0];renderActions()});
 else if(npc)b.addEventListener('click',()=>{selected=npc[0];renderActions()});
 else b.addEventListener('click',()=>{const dx=x-state.player.x,dy=y-state.player.y;if(Math.abs(dx)+Math.abs(dy)===1)act({type:'move',dx,dy});else dialogue.textContent='Select an adjacent tile to move one step.'});
 return b;
}
let selected=null;
function renderActions(){
 const a=document.querySelector('#actions');a.replaceChildren();
 const actions=[];
 if(selected==='cabinet'){actions.push(['Inspect cabinet',{type:'inspect',target:'cabinet'}],['Open cabinet',{type:'open',target:'cabinet'}]);}
 else if(selected==='notice'){actions.push(['Read notice',{type:'inspect',target:'notice'}]);}
 else if(selected==='caseworker'){actions.push(['Introduce yourself',{type:'talk',target:'caseworker',topic:'introduction'}],['Ask about placement',{type:'talk',target:'caseworker',topic:'placement'}],['Ask about cabinet',{type:'talk',target:'caseworker',topic:'cabinet'}]);}
 for(const [text,command] of actions){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>act(command));a.append(b);}
 document.querySelector('#selection').textContent=selected?'Selected: '+selected:'Select an object or character on the board.';
}
function render(){root.replaceChildren();for(let y=0;y<OFFICE_WORLD.height;y++)for(let x=0;x<OFFICE_WORLD.width;x++)root.append(tile(x,y));
 status.textContent='Billy: '+state.player.x+','+state.player.y+' · Revision '+state.revision;
 log.replaceChildren();for(const e of state.events.slice(-6).reverse()){const li=document.createElement('li');li.textContent=e.revision+' · '+e.type+(e.target?' · '+e.target:'')+(e.npc?' · '+e.npc:'');log.append(li)}renderActions();}
for(const [id,dx,dy] of [['north',0,-1],['south',0,1],['west',-1,0],['east',1,0]])document.getElementById(id).addEventListener('click',()=>act({type:'move',dx,dy}));
document.querySelector('#restart').addEventListener('click',()=>{if(!confirm('Reset this local prototype session?'))return;state=createOfficeRun({ownerId,runId});selected=null;persist();dialogue.textContent='A new case file has been issued.';render()});
state=load();render();persist();
