// Presentation only. Every coordinate, marker and consequence comes from a committed view.
const CELL=74,LEFT=127,TOP=58,WIDTH=920,HEIGHT=636;
const point=(x,y)=>({x:LEFT+x*CELL+CELL/2,y:TOP+y*CELL+CELL/2});
let library;
export function loadOfficePhaser(){
 if(window.Phaser)return Promise.resolve(window.Phaser);
 if(library)return library;
 library=(async()=>{
  for(const src of ['https://cdnjs.cloudflare.com/ajax/libs/phaser/4.2.1/phaser.min.js','https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js']){
   const ok=await new Promise(resolve=>{
    const script=document.createElement('script');script.src=src;script.crossOrigin='anonymous';
    const timer=setTimeout(()=>{script.remove();resolve(false);},10000);
    script.onload=()=>{clearTimeout(timer);resolve(!!window.Phaser);};
    script.onerror=()=>{clearTimeout(timer);script.remove();resolve(false);};document.head.append(script);
   });
   if(ok)return window.Phaser;
  }
  throw Error('scene_unavailable');
 })();
 return library;
}
export function createOfficePresentation({parent,onMove,onAnimation,onUnavailable,reduceMotion=()=>false}){
 let game=null,scene=null,snapshot=null,epoch=0,animating=false,settled=Promise.resolve();
 const motion=value=>{animating=value;parent.dataset.animating=String(value);onAnimation?.(value);};
 function sceneClass(Phaser){return class extends Phaser.Scene{
  constructor(){super('MainAfterlifeOffice');this.view=null;this.finish=null;}
  create(){scene=this;this.cameras.main.setBackgroundColor('#0a1321');this.apply(snapshot);parent.dataset.sceneReady='true';}
  drawRoom(view){
   const g=this.add.graphics().setDepth(1);
   g.fillStyle(0x182b3c);g.fillRoundedRect(LEFT-14,TOP-14,9*CELL+28,7*CELL+28,18);
   g.lineStyle(2,0x85765b,.9);g.strokeRoundedRect(LEFT-14,TOP-14,9*CELL+28,7*CELL+28,18);
   for(let y=0;y<view.world.height;y++)for(let x=0;x<view.world.width;x++){
    const p=point(x,y),open=view.world.cells[y*view.world.width+x].walkable;
    g.fillStyle(open?((x+y)%2?0x304659:0x2a3e51):0x172332);
    g.fillRoundedRect(p.x-CELL/2+2,p.y-CELL/2+2,CELL-4,CELL-4,3);
    g.lineStyle(1,open?0x506a7b:0x344152,.65);g.strokeRect(p.x-CELL/2+3,p.y-CELL/2+3,CELL-6,CELL-6);
    if(!open&&y>0&&y<6&&(x===2||x===5||x===6)){
     g.fillStyle(0x4b5d68);g.fillRoundedRect(p.x-22,p.y-26,44,52,4);
     for(let row=0;row<3;row++){
      g.fillStyle(0x354a5b);g.fillRect(p.x-18,p.y-21+row*16,36,12);
      g.fillStyle(0xcfbb92);g.fillRect(p.x-7,p.y-18+row*16,14,3);
     }
    }
   }
   for(const x of [1,7]){
    const a=point(x,3),b=point(x,4);g.lineStyle(5,0xac8b5a,.7);g.lineBetween(a.x-26,a.y-27,b.x-26,b.y+27);
    g.fillStyle(0xdfc592);g.fillCircle(a.x-26,a.y-27,5);g.fillCircle(b.x-26,b.y+27,5);
   }
   this.add.text(WIDTH/2,31,'DEPARTMENT OF POSTHUMOUS AFFAIRS',{fontFamily:'monospace',fontSize:'13px',color:'#e6c992'}).setOrigin(.5);
   this.add.text(28,HEIGHT-20,'AFTERLIFE / PLACEMENT OFFICE',{fontFamily:'monospace',fontSize:'11px',color:'#95b3c2'});
   this.add.text(WIDTH-28,HEIGHT-20,'9 × 7',{fontFamily:'monospace',fontSize:'11px',color:'#95b3c2'}).setOrigin(1,0);
   this.markerArt=new Map();
   const styles={records:[0xdcc99f,'▤'],stat:[0x82ded5,'◇'],rolodex:[0xc1a0ef,'R'],exit:[0xf1b293,'↟'],notice:[0x9ab8cc,'!'],caseworker:[0xf1d18b,'C']};
   for(const marker of view.markers){
    const p=point(marker.x,marker.y),[color,glyph]=styles[marker.id]||[0xdcc99f,'·'];
    const halo=this.add.circle(p.x,p.y,30,color,.14).setStrokeStyle(1,color,.8).setDepth(20);
    if(marker.id==='caseworker'){
     this.add.ellipse(p.x,p.y+8,29,30,0xcab897).setStrokeStyle(2,0x6c5261).setDepth(21);
     this.add.circle(p.x,p.y-14,12,0xd8b293).setStrokeStyle(2,0x403637).setDepth(22);
     this.add.rectangle(p.x+11,p.y+6,16,22,0xf2e0b5).setAngle(-9).setDepth(23);
    }else{
     const plate=this.add.rectangle(p.x,p.y,45,33,0x192a3a).setStrokeStyle(2,color).setDepth(21);
     this.add.text(p.x,p.y,glyph,{fontFamily:'Georgia,serif',fontSize:'24px',color:'#f6e5c5'}).setOrigin(.5).setDepth(22);
     if(marker.id==='stat')this.add.rectangle(p.x,p.y-23,39,5,color,.6).setDepth(21);
     if(marker.id==='records')for(let i=0;i<3;i++)this.add.rectangle(p.x-12+i*10,p.y-5,10,19,0xe0cba3).setAngle(-7+i*7).setDepth(22);
     if(marker.id==='rolodex')for(let i=0;i<4;i++)this.add.rectangle(p.x-14+i*9,p.y-9,7,18,0xc4afd8).setDepth(22);
     this.markerArt.set(marker.id,{halo,plate});
    }
    this.add.text(p.x,p.y+32,marker.label.toUpperCase(),{fontFamily:'monospace',fontSize:'8px',color:'#e3dccb',backgroundColor:'#101e2d'}).setOrigin(.5).setDepth(24);
   }
   const p=point(view.player.x,view.player.y);
   this.shadow=this.add.ellipse(p.x,p.y+23,33,10,0x030b13,.7).setDepth(90);
   const coat=this.add.ellipse(0,8,26,30,0x3398b4).setStrokeStyle(2,0x9fe8ec);
   const head=this.add.circle(0,-12,12,0xe4b798).setStrokeStyle(2,0x513c38);
   const hair=this.add.arc(0,-17,13,190,349,false,0x4e3934);
   const eyes=[this.add.circle(-4,-12,1.5,0x182634),this.add.circle(4,-12,1.5,0x182634)];
   this.actor=this.add.container(p.x,p.y,[this.add.ellipse(-7,24,9,10,0x18394b),this.add.ellipse(7,24,9,10,0x18394b),coat,head,hair,...eyes,this.add.rectangle(2,9,8,8,0xe5c272)]).setDepth(100);
   this.name=this.add.text(p.x,p.y+39,'BILLY',{fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:'#9fe8ec',backgroundColor:'#101e2d'}).setOrigin(.5).setDepth(101);
   this.input.on('pointerdown',pointer=>{
    if(snapshot?.phase!=='ready'||animating)return;
    const x=Math.floor((pointer.x-LEFT)/CELL),y=Math.floor((pointer.y-TOP)/CELL);
    if(x>=0&&y>=0&&x<this.view.world.width&&y<this.view.world.height&&this.view.world.cells[y*this.view.world.width+x].walkable)onMove(x,y);
   });
  }
  apply(current){
   if(!current?.view)return;
   const next=current.view,previous=this.view;
   if(!previous)this.drawRoom(next);
   this.view=next;
   parent.dataset.sceneRevision=String(next.revision);
   if(previous&&(previous.player.x!==next.player.x||previous.player.y!==next.player.y)){
    this.tweens.killTweensOf([this.actor,this.shadow,this.name]);this.finish?.();
    const p=point(next.player.x,next.player.y);
    if(reduceMotion()){
     this.actor.setPosition(p.x,p.y);this.shadow.setPosition(p.x,p.y+23);this.name.setPosition(p.x,p.y+39);
    }else{
     settled=new Promise(resolve=>{this.finish=()=>{this.finish=null;motion(false);resolve();};});motion(true);
     this.tweens.add({targets:this.shadow,x:p.x,y:p.y+23,duration:160,ease:'Sine.easeInOut'});
     this.tweens.add({targets:this.name,x:p.x,y:p.y+39,duration:160,ease:'Sine.easeInOut'});
     this.tweens.add({targets:this.actor,x:p.x,y:p.y,duration:160,ease:'Sine.easeInOut',onComplete:()=>this.finish?.()});
    }
   }
   if(previous&&!previous.caseFile.glitch.observed&&next.caseFile.glitch.observed&&!reduceMotion()){
    this.cameras.main.shake(180,.003);this.cameras.main.flash(140,112,62,145,false);
   }
   for(const [id,art]of this.markerArt){
    const available=next.actions.some(a=>a.command.target===id);
    art.halo.setAlpha(current.phase==='ready'&&available?1:.4);
    if(id==='rolodex')art.plate.setFillStyle(next.caseFile.glitch.observed?0x4b315d:0x192a3a);
   }
  }
 };}
 return Object.freeze({
  get animating(){return animating;},whenSettled:()=>settled,
  async update(next){
   snapshot=next;
   if(!next.view){epoch++;scene?.finish?.();game?.destroy(true);game=null;scene=null;parent.replaceChildren();delete parent.dataset.sceneReady;delete parent.dataset.sceneRevision;motion(false);return;}
   if(game){scene?.apply(next);return;}
   const ticket=epoch;
   try{
    const Phaser=await loadOfficePhaser();if(ticket!==epoch||!snapshot?.view||game)return;
    game=new Phaser.Game({type:Phaser.AUTO,parent,width:WIDTH,height:HEIGHT,backgroundColor:'#0a1321',
     render:{antialias:true},scene:[sceneClass(Phaser)],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:WIDTH,height:HEIGHT}});
   }catch{if(ticket===epoch)onUnavailable?.();}
  }
 });
}
