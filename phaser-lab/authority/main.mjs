import {SAMPLE_SNAPSHOTS} from './sample-snapshots.mjs';
import {createProjectionPlayback} from './view-contract.mjs';

const $=id=>document.getElementById(id);
const W=900,H=590,C=67,L=147,T=49;
const playback=createProjectionPlayback(SAMPLE_SNAPSHOTS);
let currentScene=null;
const center=(x,y)=>({x:L+x*C+C/2,y:T+y*C+C/2});

function setText(frame){
 $('revision').textContent=String(frame.revision);
 $('turn').textContent=String(frame.turn);
 $('position').textContent=frame.player.x+','+frame.player.y;
 $('world').textContent=frame.world;
 $('revealed').textContent=frame.map.cells.filter(c=>c.visible).length+' / '+frame.map.cells.length;
 const progress=playback.progress();
 $('frame').textContent=progress.at+' / '+progress.total;
 $('next').disabled=!playback.hasNext();
 $('status').textContent=progress.at===1?'Original sanitized projection: Billy is in Intake.'
 :progress.at===progress.total?'Recorded frames completed. No game turn was submitted.'
 :'Showing a recorded, server-shaped revision '+frame.revision+'.';
}
function createScene(){
 return class AuthorityScene extends window.Phaser.Scene{
  constructor(){super('AuthorizedProjection');this.drawing=false;}
  create(){
   currentScene=this;
   this.cameras.main.setBackgroundColor('#09121e');
   this.grid=this.add.graphics();
   this.player=this.add.container(0,0).setDepth(90);
   const drop=this.add.ellipse(0,21,34,10,0x000913,0.7);
   const coat=this.add.ellipse(0,8,26,31,0x327e9f).setStrokeStyle(2,0xb6f4f8);
   const head=this.add.circle(0,-10,12,0xdeb699).setStrokeStyle(2,0x493b3b);
   const cap=this.add.arc(0,-13,12,188,356,false,0x473439);
   this.player.add([drop,coat,head,cap]);
   this.captions=[];
   this.redraw(playback.current(),false);
  }
  redraw(frame,animate){
   if(this.drawing)return;
   this.grid.clear();
   this.grid.fillStyle(0x111f2f,1);
   this.grid.fillRoundedRect(L-15,T-15,frame.map.width*C+30,frame.map.height*C+30,14);
   this.grid.lineStyle(2,0xa9a387,0.55);
   this.grid.strokeRoundedRect(L-15,T-15,frame.map.width*C+30,frame.map.height*C+30,14);
   for(let i=0;i<frame.map.cells.length;i++){
    const x=i%frame.map.width,y=Math.floor(i/frame.map.width);
    const p=center(x,y),cell=frame.map.cells[i];
    const tileColor=cell.visible?(cell.walkable?(x+y)%2?0x2b4354:0x315065:0x172331):0x07101b;
    this.grid.fillStyle(tileColor,1);
    this.grid.fillRoundedRect(p.x-C/2+2,p.y-C/2+2,C-4,C-4,4);
    this.grid.lineStyle(1,cell.visible?0x546c7d:0x172439,0.7);
    this.grid.strokeRoundedRect(p.x-C/2+2,p.y-C/2+2,C-4,C-4,4);
    if(!cell.visible){
      this.grid.fillStyle(0x26384c,0.8);
      for(let dot=0;dot<3;dot++)this.grid.fillCircle(p.x-8+dot*8,p.y,2);
    }
   }
   for(const text of this.captions)text.destroy();
   this.captions=[];
   for(const marker of frame.markers){
    const p=center(marker.x,marker.y);
    const clr=marker.kind==='npc'?0xf2ce8e:0xc0a0f2;
    this.grid.fillStyle(clr,0.2);this.grid.fillCircle(p.x,p.y,22);
    this.grid.lineStyle(2,clr,0.85);this.grid.strokeCircle(p.x,p.y,21);
    const icon=this.add.text(p.x,p.y-1,marker.kind==='npc'?'C':'R',
      {fontFamily:'Georgia,serif',fontSize:'21px',color:'#ffe4bd'}).setOrigin(.5).setDepth(40);
    const label=this.add.text(p.x,p.y+24,marker.label.toUpperCase(),
      {fontFamily:'monospace',fontSize:'8px',color:'#edd1a4',backgroundColor:'#0b1723'})
      .setOrigin(.5).setDepth(41);
    this.captions.push(icon,label);
   }
   const p=center(frame.player.x,frame.player.y);
   if(animate){
    this.drawing=true;
    this.tweens.add({targets:this.player,x:p.x,y:p.y,duration:280,ease:'Sine.easeInOut',
      onComplete:()=>{this.drawing=false;setText(frame);}});
   }else{
    this.player.setPosition(p.x,p.y);
    setText(frame);
   }
   this.cameras.main.setBounds(0,0,W,H);
   this.add.text(32,22,'DPA / AUTHORIZED VIEW PROJECTION',
     {fontFamily:'monospace',fontSize:'11px',color:'#c6aa74'});
  }
  advance(){
   if(this.drawing||!playback.hasNext())return;
   this.redraw(playback.next(),true);
  }
  restart(){
   if(this.drawing)return;
   this.redraw(playback.reset(),false);
  }
 };
}
function connectControls(){
 $('next').addEventListener('click',()=>currentScene?.advance());
 $('restart').addEventListener('click',()=>currentScene?.restart());
}
async function loadPhaser(){
 if(window.Phaser)return;
 for(const src of ['https://cdnjs.cloudflare.com/ajax/libs/phaser/4.2.1/phaser.min.js','https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js']){
  const okay=await new Promise(resolve=>{
   const script=document.createElement('script');script.src=src;script.crossOrigin='anonymous';
   const timeout=setTimeout(()=>{script.remove();resolve(false)},12000);
   script.onload=()=>{clearTimeout(timeout);resolve(!!window.Phaser)};
   script.onerror=()=>{clearTimeout(timeout);script.remove();resolve(false)};
   document.head.append(script);
  });
  if(okay)return;
 }
 throw new Error('Could not load the pinned Phaser 4 renderer.');
}
try{
 await loadPhaser();
 connectControls();
 const SceneClass=createScene();
 new window.Phaser.Game({type:window.Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#09121e',
  scale:{mode:window.Phaser.Scale.FIT,autoCenter:window.Phaser.Scale.CENTER_BOTH},
  scene:[SceneClass]});
 $('loading').hidden=true;
}catch(error){
 $('loading').textContent='Preview unavailable: '+error.message;
 $('loading').classList.add('failure');
}
