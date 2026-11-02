// FAKE, already-committed sample snapshots for renderer contract acceptance.
// NOT from a real user, API, account, or production game save.
import {OFFICE,cellEnabled} from '../office-model.mjs';
function assemble(revision,position,revealed,markers,turn){
 const seen=new Set(revealed.map(p=>p.x+','+p.y));
 const cells=Array.from({length:OFFICE.width*OFFICE.height},(_,i)=>{
  const x=i%OFFICE.width,y=Math.floor(i/OFFICE.width);
  return seen.has(x+','+y)?{visible:true,walkable:cellEnabled(x,y)}:{visible:false};
 });
 return Object.freeze({
  schema:'ascension.map-view.v1',sessionId:'synthetic-office',revision,
  world:'AFTERLIFE',turn,map:{width:OFFICE.width,height:OFFICE.height,cells},
  player:position,markers
 });
}
const p=(x,y)=>({x,y});
const reveal=pos=>{
 const s=new Map();
 for(const point of pos){
  for(const [dx,dy] of [[0,0],[0,-1],[0,1],[1,0],[-1,0]]){
   const x=point.x+dx,y=point.y+dy;
   if(x>=0&&x<OFFICE.width&&y>=0&&y<OFFICE.height)s.set(x+','+y,{x,y});
  }
 }
 return [...s.values()];
};
const steps=[p(4,4),p(4,3),p(4,2),p(4,3),p(5,3),p(6,3)];
const markers=[
 {id:'caseworker',kind:'npc',label:'Case Worker',x:4,y:2},
 {id:'rolodex',kind:'service',label:'Rolodex',x:6,y:3}
];
export const SAMPLE_SNAPSHOTS=Object.freeze(steps.map((at,i)=>{
 const visible=reveal(steps.slice(0,i+1));
 const s=new Set(visible.map(p=>p.x+','+p.y));
 return assemble(i,at,visible,markers.filter(m=>s.has(m.x+','+m.y)),i<3?0:1);
}));
