// Authored first Hallway checkpoint; later realms remain closed.
export function hallwayCellEnabled(x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=9||y>=7)return false;
 return (x===4&&y>=1&&y<=5)||(y===3&&x>=1&&x<=7)||([2,6].includes(x)&&y>=2&&y<=4);
}
export const HALLWAY_WORLD=Object.freeze({id:'afterlife-hallway',width:9,height:7,start:Object.freeze({x:4,y:5}),
 blocked:Object.freeze(Array.from({length:63},(_,i)=>({x:i%9,y:Math.floor(i/9)})).filter(p=>!hallwayCellEnabled(p.x,p.y)).map(p=>p.x+','+p.y)),
 objects:Object.freeze({
  return:{x:4,y:5,label:'Office Door',kind:'object',description:'The Placement Office is behind you. Your intake file stays with you.'},
  inspection:{x:2,y:3,label:'File Inspection',kind:'object',description:'A lamp scans for unfiled discrepancies. It has never taken a lunch break.'},
  routes:{x:6,y:3,label:'Shifting Sign',kind:'object',description:'Veilway. Archive of Echoes. Oddwyn. Black Market. Rift of Fates. The arrows disagree.'},
  destination:{x:4,y:1,label:'Assigned Door',kind:'object',description:'A shifting destination door. Ask the attendant to read your routing slip.'}
 }),npcs:Object.freeze({attendant:{x:4,y:3,label:'Hallway Attendant',kind:'npc'}})});
export const HALLWAY_DESTINATIONS=Object.freeze({memory:'Archive of Echoes',present:'Veilway'});
export function hallwaySteps(s){const h=s.hallway;return [
 {id:'attendant',label:'Speak with the Hallway attendant',complete:h.attendantMet},
 {id:'checkpoint',label:h.mode==='assistance'?'Receive the filed assistance':'Complete the flagged file inspection',complete:h.routeRevealed},
 {id:'destination',label:'Read your assigned destination door',complete:h.destinationRead}
];}
