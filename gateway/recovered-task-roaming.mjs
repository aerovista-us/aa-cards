// Source-parity port of recovered app.js lines 5890-5939, extracted for M18.
// Only execute inside an authorized transactional state clone; caller persists
// board, RNG cursor, map markers and turn notes together or rolls back all.
export function moveRecoveredRoamingTasks({board, turn, rand, inBounds, syncTaskMarkers, noteTurn}) {
 if(typeof rand!=='function'||typeof inBounds!=='function'||typeof syncTaskMarkers!=='function'||typeof noteTurn!=='function')
  throw new TypeError('Canonical RNG, bounds, marker synchronization and turn notes are required');
 const tasks=board?.tasks||[];
 if(tasks.length===0)return 0;
 let moved=0;
 const occupied=new Set(tasks.map(task=>`${task.x},${task.y}`));
 for(const task of tasks){
  if(task.completed||task.mobility!=='roam')continue;
  const steps=rand()>0.55?2:1;
  let x=Number(task.x||0),y=Number(task.y||0),changed=false;
  for(let step=0;step<steps;step++){
   const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
   for(let i=dirs.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [dirs[i],dirs[j]]=[dirs[j],dirs[i]];
   }
   const next=dirs.map(([dx,dy])=>({x:x+dx,y:y+dy}))
    .find(cell=>!occupied.has(`${cell.x},${cell.y}`)&&inBounds(cell.x,cell.y));
   if(!next)break;
   occupied.delete(`${x},${y}`);
   x=next.x;y=next.y;
   occupied.add(`${x},${y}`);
   changed=true;
  }
  if(changed){task.x=x;task.y=y;moved+=1;}
 }
 if(moved>0){
  board.lastRoamTurn=Number(turn||0);
  syncTaskMarkers();
  noteTurn('npc',`${moved} roaming NPC signal${moved===1?'':'s'} shifted position.`);
 }
 return moved;
}
