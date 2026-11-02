import {OFFICE,START,FIXTURES,cellEnabled,findPath,fixtureAt} from './office-model.mjs';
import {decorateOffice} from './visuals.mjs';

const $=id=>document.getElementById(id);
const CELL=74, LEFT=127, TOP=41, WIDTH=920, HEIGHT=600;
const position=(x,y)=>({x:LEFT+x*CELL+CELL/2,y:TOP+y*CELL+CELL/2});
const state={pos:{...START},steps:0,visited:new Set(),statUsed:false,placements:false,glitch:false,
 motionEnabled:!(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false)};
const color={bg:0x0b1321,floor:0x26394c,floor2:0x304353,trim:0x687d8b,wall:0x111d2b,wall2:0x233246,blue:0x55c9ea,cream:0xf0deb6};
let scene=null, modal=false, lastAction='Arrived at intake.';

function updateObjectives(){
 const done={
  caseworker:state.placements,stat:state.statUsed,glitch:state.glitch,
  exit:state.placements&&state.statUsed&&state.glitch&&state.visited.has('exit')
 };
 let count=0;
 for(const [key,complete] of Object.entries(done)){
  const el=$('task-'+key);
  if(complete)count++;
  el?.setAttribute?.('data-complete',complete?'true':'false');
 }
 $('objectives-complete')?.setAttribute?.('data-total',String(count));
 const summary=$('objective-summary');
 if(summary)summary.textContent=count+' / 4 resolved';
}
function setStatus(message){
 updateObjectives();
 lastAction=message;
 $('activity').textContent=message;
 $('steps').textContent=String(state.steps);
 $('progress').textContent=String(state.visited.size)+' / '+FIXTURES.length;
 $('stat-state').textContent=state.statUsed?'Checked':'Ready';
}
function updateHint(text){$('hint').textContent=text;}
function hidePanel(){$('story-panel').hidden=true;modal=false;if(scene)scene.refreshHighlights();}
function panel(title,location,body,actions){
 $('panel-location').textContent=location.toUpperCase();
 $('panel-title').textContent=title;
 $('panel-body').textContent=body;
 const box=$('panel-actions');box.replaceChildren();
 for(const a of actions){
  const button=document.createElement('button');
  button.type='button';button.className=a.secondary?'outline':'gold';
  button.textContent=a.label;
  button.addEventListener('click',()=>{hidePanel();if(a.action)a.action();});
  box.appendChild(button);
 }
 if(!actions.length){
  const button=document.createElement('button');button.textContent='Close';button.className='gold';
  button.addEventListener('click',hidePanel);box.appendChild(button);
 }
 $('story-panel').hidden=false;modal=true;setTimeout(()=>{const btn=box.querySelector('button');if(btn)btn.focus();},0);
}
function actionFor(id){
 state.visited.add(id);
 if(id==='caseworker'){
  setStatus('Case Worker interview opened (visual sample).');
  panel('We have been expecting you.','Placement desk',
    'The Case Worker turns the ledger around. “Billy? Your file is technically here. The department is still deciding which version of here.” Available placements are filed in the Rolodex.',
    [{label:'Ask for authorized placements',action:()=>{state.placements=true;setStatus('Placement options have been released for this sample.');}},
     {label:'Not yet',secondary:true}]);
 }
 if(id==='stat'){
  if(state.statUsed){
   setStatus('Stat Generator has already been checked.');
   panel('Your number is on file.','Stat Generator',
    'The machine is cooling down. In the real game, spin availability is decided by the authoritative visit and saved state—not by this visual prototype.',[]);
  }else{
   setStatus('Stat Generator is waiting.');
   panel('One free spin. Probably.','Stat Generator',
    'The brass machine rattles with bureaucratic optimism. This sandbox displays a cosmetic number only; it cannot affect your real character, destination, or account.',
    [{label:'Try sample spin',action:()=>{
      state.statUsed=true;
      const sample=1+Math.floor(Math.random()*20);
      setStatus('Cosmetic test spin: '+sample+' (not saved).');
      panel('Sample result: '+sample,'Local visual sample','No canonical stats, rolls, or placements were changed. This is only a UI interaction test.',[]);
     }},{label:'Later',secondary:true}]);
  }
 }
 if(id==='rolodex'){
  if(!state.placements){
   setStatus('Rolodex is awaiting Case Worker authorization.');
   panel('Authorization required.','Afterlife Rolodex',
    'The cards refuse to move. The Case Worker must first identify which placements are available. Ascension does not let the interface invent a destination.',[]);
  }else{
   setStatus('Rolodex opened; a small reality anomaly observed.');
   panel('The cards are out of order.','Afterlife Rolodex',
    'A row of destination cards flickers. One is stamped PENDING. A name—THE MITCH—appears in the margin and vanishes before anyone can explain it.',
    [{label:'Examine the glitch',action:()=>{
      state.glitch=true;scene.flashGlitch();setStatus('A glitch was observed. The paperwork disagrees.');
      panel('A clerical impossibility.','First Glitch',
        'For half a second, the office bends around Billy. This is a presentation effect only; NPC memory, RNG, and delayed consequences remain server-owned in the real game.',[]);
    }},{label:'Back away',secondary:true}]);
  }
 }
 if(id==='records'){
  setStatus('Records Desk inspected.');
  panel('Do not remove the stapler.','Records Desk',
    'On the blotter: a queue ticket, a memo marked RETURN TO SENDER, and a note that reads “THE SYSTEM IS UNDER REVIEW.” Your original game will determine any actual discovery.',[]);
 }
 if(id==='exit'){
  const done=state.placements&&state.statUsed&&state.glitch;
  setStatus(done?'First scene is visually complete.':'Placement Door: more intake tasks remain.');
  panel(done?'Beyond the placement door…':'Placement pending.','Placement Door',
    done?'You found the Case Worker, tested the Stat Generator, opened the Rolodex and witnessed the first glitch. The visual slice is complete; persistent gameplay is not connected.':'Complete intake: speak with the Case Worker, visit the Stat Generator, and inspect the Rolodex glitch. This door is intentionally gated in the local demo.',
    [{label:'Return to office'}]);
 }
 scene.refreshHighlights();
}
// Construct the Scene class only after the Phaser UMD script has loaded.
// A top-level `extends window.Phaser.Scene` crashes while Phaser is still undefined.
function createAfterlifeSceneClass(){
 return class AfterlifeScene extends window.Phaser.Scene{
 constructor(){super('AfterlifeOffice');this.path=[];this.walking=false;}
 create(){
  scene=this;
  this.cameras.main.setBackgroundColor('#09111d');
  this.drawRoom();
  this.environment=decorateOffice(this,{at:position,cell:CELL,reduceMotion:!state.motionEnabled});
  this.drawFixtures();
  this.drawBilly();
  this.input.on('pointerdown',(pointer,targets)=>{
   if(modal)return;
   if(targets&&targets.length&&targets.some(x=>x.getData&&x.getData('interactive-fixture')))return;
   const x=Math.floor((pointer.x-LEFT)/CELL),y=Math.floor((pointer.y-TOP)/CELL);
   this.walkTo(x,y);
  });
  this.input.keyboard.on('keydown',(e)=>{
   if(e.key==='Escape'){hidePanel();return;}
   if(modal||this.walking)return;
   const key=e.key.toLowerCase();
   const move={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]}[key];
   if(move){e.preventDefault();this.walkTo(state.pos.x+move[0],state.pos.y+move[1]);}
   if(key==='e'||key==='enter'){this.interactNearby();}
  });
  this.refreshHighlights();
  setStatus('Welcome to Intake. Move Billy toward a highlighted station.');
  updateHint('Use arrow keys / WASD, tap a reachable tile, or use the D-pad. Press E near a station.');
 }
 drawRoom(){
  const bg=this.add.graphics();
  bg.fillStyle(0x0b1321,1);bg.fillRect(0,0,WIDTH,HEIGHT);
  bg.fillStyle(0x172638,1);bg.fillRoundedRect(LEFT-13,TOP-14,OFFICE.width*CELL+26,OFFICE.height*CELL+28,20);
  bg.lineStyle(2,0x677e92,0.75);bg.strokeRoundedRect(LEFT-13,TOP-14,OFFICE.width*CELL+26,OFFICE.height*CELL+28,20);
  for(let y=0;y<OFFICE.height;y++)for(let x=0;x<OFFICE.width;x++){
   const here=position(x,y),open=cellEnabled(x,y);
   const tile=this.add.rectangle(here.x,here.y,CELL-3,CELL-3,open?((x+y)%2?color.floor:color.floor2):color.wall);
   tile.setStrokeStyle(1,open?0x4a6577:0x2f3a4a,open?0.9:0.55);
   if(open){
    this.add.rectangle(here.x,here.y-29,CELL-16,1,0x617788,0.4);
    if((x+y)%4===0)this.add.circle(here.x+24,here.y+22,2,0x8299a9,0.42);
   }else{
    this.add.rectangle(here.x,here.y,CELL-14,CELL-14,0x1b2a3b,0.8);
    if(y===0||y===OFFICE.height-1)this.add.rectangle(here.x,here.y,CELL-12,7,0x3b4550,0.8);
    else if(y===1&&x>=2&&x<=6&&x!==3&&x!==4){
      this.add.rectangle(here.x,here.y,CELL-18,18,0x735b48,0.9).setStrokeStyle(1,0xc0a277);
    }
   }
  }
  const pos=position(4,0);
  this.add.text(pos.x,pos.y-7,'DEPARTMENT OF',{fontFamily:'monospace',fontSize:'11px',color:'#e3bc75'}).setOrigin(0.5);
  this.add.text(pos.x,pos.y+9,'POSTHUMOUS AFFAIRS',{fontFamily:'monospace',fontSize:'11px',color:'#f6dda4'}).setOrigin(0.5);
  this.add.text(34,31,'DPA / INTAKE', {fontFamily:'monospace',fontSize:'11px',color:'#91a4b7',letterSpacing:1});
  this.add.text(34,555,'VISUAL LAB • NO SAVES', {fontFamily:'monospace',fontSize:'11px',color:'#93a2b5'});
  this.add.text(792,555,'9 × 7 / OFFICE', {fontFamily:'monospace',fontSize:'11px',color:'#93a2b5'});
 }
 drawFixtures(){
  this.markers=new Map();
  FIXTURES.forEach(f=>{
   const p=position(f.x,f.y);
   const halo=this.add.circle(p.x,p.y,29,f.color,0.13).setStrokeStyle(1,f.color,0.62).setDepth(40);
   const plate=this.add.rectangle(p.x,p.y+6,38,26,0x172437).setStrokeStyle(1,f.color,0.82).setDepth(41);
   const glyph=this.add.text(p.x,p.y+4,f.glyph,{fontFamily:'Georgia,serif',fontSize:'20px',fontStyle:'bold',color:'#f2e6d4'}).setOrigin(0.5).setDepth(42);
   this.add.text(p.x,p.y+27,f.label.toUpperCase(),{fontFamily:'monospace',fontSize:'8px',color:'#d7dfec',backgroundColor:'#0c1622'}).setOrigin(0.5).setDepth(43);
   halo.setInteractive({useHandCursor:true}).setData('interactive-fixture',true);
   halo.on('pointerdown',()=>{if(!modal)this.walkTo(f.x,f.y);});
   this.markers.set(f.id,{halo,plate,glyph});
   if(state.motionEnabled)this.tweens.add({targets:halo,alpha:{from:0.68,to:1},scale:{from:0.96,to:1.055},duration:1500+f.x*140,yoyo:true,repeat:-1});
  });
 }
 drawBilly(){
  const p=position(state.pos.x,state.pos.y);
  this.shadow=this.add.ellipse(p.x,p.y+18,33,10,0x020811,0.75);
  this.billy=this.add.container(p.x,p.y);
  this.footLeft=this.add.ellipse(-8,21,9,13,0x1d3342).setStrokeStyle(1,0x80d5dd);
  this.footRight=this.add.ellipse(8,21,9,13,0x1d3342).setStrokeStyle(1,0x80d5dd);
  const coat=this.add.ellipse(0,8,25,28,0x3c98b8).setStrokeStyle(2,0x9debfb,0.7);
  const head=this.add.circle(0,-10,12,0xe2b99e).setStrokeStyle(2,0x3e3030);
  const hair=this.add.arc(0,-14,13,195,348,false,0x533e39);
  const eyes=this.add.circle(-4,-10,1.6,0x14253a);
  const eye2=this.add.circle(4,-10,1.6,0x14253a);
  const badge=this.add.rectangle(0,10,8,7,0xe4be76);
  this.avatarBody=this.add.container(0,0,[this.footLeft,this.footRight,coat,head,hair,eyes,eye2,badge]);
  this.billy.add(this.avatarBody);
  this.billy.setDepth(100);
  this.shadow.setDepth(98);
  this.add.text(p.x,p.y+35,'BILLY',{fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:'#b3f4ff',backgroundColor:'#0c1622'}).setOrigin(0.5).setDepth(101);
  this.nameplate=this.children.list[this.children.list.length-1];
  if(state.motionEnabled)this.tweens.add({targets:badge,alpha:{from:0.4,to:1},duration:800,yoyo:true,repeat:-1});
 }
 refreshHighlights(){
  if(!this.markers)return;
  for(const [id,m] of this.markers.entries()){
   m.plate.setFillStyle(state.visited.has(id)?0x284d47:0x172437);
  }
 }
 startGait(next){
  if(!this.avatarBody)return; // scene constructed without rendering in contract tests
  if(next.x!==state.pos.x)this.billy.scaleX=next.x<state.pos.x?-1:1;
  if(!state.motionEnabled||this.gaitTween)return;
  this.gaitTween=this.tweens.add({targets:this.avatarBody,y:-3,duration:110,yoyo:true,repeat:-1});
  this.leftFootTween=this.tweens.add({targets:this.footLeft,y:5,duration:120,yoyo:true,repeat:-1});
  this.rightFootTween=this.tweens.add({targets:this.footRight,y:-5,duration:120,yoyo:true,repeat:-1,delay:120});
 }
 stopGait(){
  for(const t of [this.gaitTween,this.leftFootTween,this.rightFootTween])t?.remove?.();
  this.gaitTween=null;this.leftFootTween=null;this.rightFootTween=null;
  if(this.avatarBody)this.avatarBody.y=0;
  if(this.footLeft)this.footLeft.y=0;
  if(this.footRight)this.footRight.y=0;
 }
 setAmbientMotion(enabled){
  state.motionEnabled=!!enabled;
  this.environment?.setMotion?.(state.motionEnabled);
  for(const m of this.markers?.values?.()||[]){
   this.tweens.killTweensOf(m.halo);
   m.halo.setAlpha(1).setScale(1);
   if(state.motionEnabled)this.tweens.add({targets:m.halo,alpha:{from:.68,to:1},scale:{from:.96,to:1.055},duration:1700,yoyo:true,repeat:-1});
  }
  if(!state.motionEnabled)this.stopGait();
  const btn=$('motion-toggle');
  btn?.setAttribute?.('aria-pressed',String(state.motionEnabled));
  if(btn)btn.textContent=state.motionEnabled?'Motion: On':'Motion: Off';
 }
 moveDirection(dx,dy){
  if(modal||this.walking)return;
  this.walkTo(state.pos.x+dx,state.pos.y+dy);
 }
 walkTo(x,y){
  if(modal||this.walking)return;
  if(!cellEnabled(x,y)){setStatus('That office tile is not accessible.');return;}
  const path=findPath(state.pos,{x,y});
  if(path.length===0){const f=fixtureAt(x,y);if(f)actionFor(f.id);return;}
  this.path=path;
  this.advance();
 }
 advance(){
  if(!this.path.length){this.walking=false;this.stopGait();this.onArrival();return;}
  const to=this.path.shift();
  if(!cellEnabled(to.x,to.y)){this.path=[];this.walking=false;return;}
  this.walking=true;
  const p=position(to.x,to.y);
  this.startGait(to);
  // Sprites have different vertical offsets; animate each to its own target.
  // Shared x-only movement kept Billy visually stuck on the original row.
  this.tweens.add({targets:this.shadow,x:p.x,y:p.y+18,
   duration:185,ease:'Sine.easeInOut'});
  this.tweens.add({targets:this.nameplate,x:p.x,y:p.y+35,
   duration:185,ease:'Sine.easeInOut'});
  this.tweens.add({targets:this.billy,x:p.x,y:p.y,
   duration:185,ease:'Sine.easeInOut',onComplete:()=>{
    state.pos={x:to.x,y:to.y};state.steps++;
    setStatus('Billy moved to ('+to.x+', '+to.y+').');
    this.walking=false;this.advance();
   }});
 }
 onArrival(){
  const f=fixtureAt(state.pos.x,state.pos.y);
  if(f)actionFor(f.id);
  else updateHint('Keep exploring. The glowing stations are available to inspect.');
 }
 interactNearby(){
  if(modal)return;
  const target=FIXTURES.find(f=>Math.abs(f.x-state.pos.x)+Math.abs(f.y-state.pos.y)<=1);
  if(target) this.walkTo(target.x,target.y);
  else setStatus('No station is close enough to inspect.');
 }
 flashGlitch(){
  this.cameras.main.shake(240,0.006);
  this.cameras.main.flash(150,117,49,156,false);
 }
 resetLab(){
  this.path=[];this.walking=false;
  this.tweens.killTweensOf?.([this.billy,this.shadow,this.nameplate]);
  this.stopGait();
  state.pos={...START};state.steps=0;state.visited.clear();state.statUsed=false;
  state.placements=false;state.glitch=false;
  const p=position(state.pos.x,state.pos.y);
  this.billy.setPosition(p.x,p.y);this.shadow.setPosition(p.x,p.y+18);this.nameplate.setPosition(p.x,p.y+35);
  this.refreshHighlights();setStatus('Sandbox reset. No account data was changed.');
 }
 };
}
function installUI(){
 const sceneClass=createAfterlifeSceneClass();
 const cfg={type:window.Phaser.AUTO,parent:'game',width:WIDTH,height:HEIGHT,
  backgroundColor:'#0b1321',render:{antialias:true,pixelArt:false},scene:[sceneClass],
  scale:{mode:window.Phaser.Scale.FIT,autoCenter:window.Phaser.Scale.CENTER_BOTH,width:WIDTH,height:HEIGHT}};
 new window.Phaser.Game(cfg);
 document.querySelectorAll('[data-move]').forEach(el=>el.addEventListener('click',()=>{
  const dir=el.getAttribute('data-move');const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};const d=dirs[dir];
  if(scene&&d)scene.moveDirection(d[0],d[1]);
 }));
 $('interact').addEventListener('click',()=>{if(scene)scene.interactNearby();});
 $('motion-toggle')?.addEventListener?.('click',()=>{if(scene)scene.setAmbientMotion(!state.motionEnabled);});
 $('reset').addEventListener('click',()=>{hidePanel();if(scene)scene.resetLab();});
 $('close-panel').addEventListener('click',hidePanel);
 $('story-panel').addEventListener('click',e=>{if(e.target===$('story-panel'))hidePanel();});
}
async function loadLibrary(){
 if(window.Phaser)return;
 const urls=['https://cdnjs.cloudflare.com/ajax/libs/phaser/4.2.1/phaser.min.js',
  'https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js'];
 for(const src of urls){
  const ok=await new Promise(resolve=>{
   const script=document.createElement('script');script.src=src;script.crossOrigin='anonymous';
   const timeout=setTimeout(()=>{script.remove();resolve(false);},12500);
   script.onload=()=>{clearTimeout(timeout);resolve(!!window.Phaser);};
   script.onerror=()=>{clearTimeout(timeout);script.remove();resolve(false);};
   document.head.appendChild(script);
  });
  if(ok)return;
 }
 throw new Error('Phaser library could not be loaded. Check your connection or content blocker.');
}
try{await loadLibrary();installUI();$('loading').hidden=true;}
catch(e){$('loading').textContent='Unable to start visual lab: '+e.message+'  ·  Reload when online.';$('loading').classList.add('error');}
