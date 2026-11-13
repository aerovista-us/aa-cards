// First authored destination for Memory Annex placements. Veilway stays closed.
export function archiveCellEnabled(x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=7||y<0||y>=7)return false;
 return (x>=1&&x<=5&&[1,3,5].includes(y))||([1,3,5].includes(x)&&y>=1&&y<=5);
}
export const ARCHIVE_WORLD=Object.freeze({
 id:'archive-of-echoes',width:7,height:7,start:Object.freeze({x:3,y:5}),
 blocked:Object.freeze(Array.from({length:49},(_,i)=>({x:i%7,y:Math.floor(i/7)}))
  .filter(({x,y})=>!archiveCellEnabled(x,y)).map(({x,y})=>x+','+y)),
 objects:Object.freeze({
  return:{x:3,y:5,label:'Hallway Door',kind:'object',description:'The return door keeps a copy of every accepted decision. The Hallway does not issue refunds.'},
  ledger:{x:1,y:3,label:'Echo Ledger',kind:'object',description:'A ledger of memories Billy has not yet decided to recognize. The margins are full of suspiciously familiar handwriting.'},
  echo:{x:5,y:3,label:'Unfiled Echo',kind:'object',description:'A memory fragment waits without an owner. The Archivist insists someone must decide whether it belongs here.'},
  seal:{x:3,y:1,label:'Archive Seal',kind:'object',description:'An empty signature plate that records a completed memory disposition, not a new placement or a stat roll.'}
 }),
 npcs:Object.freeze({archivist:{x:3,y:3,label:'The Archivist',kind:'npc'}})
});
export function archiveSteps(s){const a=s.archive;return [
 {id:'archivist',label:'Speak with the Archivist',complete:a.archivistMet},
 {id:'ledger',label:'Inspect the Echo Ledger',complete:a.ledgerRead},
 {id:'witness',label:'Witness the unfiled echo',complete:a.echoWitnessed},
 {id:'resolution',label:'Preserve or release the echo',complete:a.resolution!==null},
 {id:'seal',label:'File the Archive Seal',complete:a.sealIssued}
];}
