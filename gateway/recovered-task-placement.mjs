// Recovered BON Grid v4 source port: app.js lines 5706-5740.
// Deterministic placement only; caller owns canonical candidates, RNG and persistence.
export function placeRecoveredTaskCells({candidates,cells,rand,fixedStation,mobility,isOfficeIntakeWorld,fixtureForCell,tileTagsAt,inBounds}) {
 for(const [name,fn] of Object.entries({rand,fixedStation,mobility,fixtureForCell,tileTagsAt,inBounds}))
  if(typeof fn!=='function')throw new TypeError('Canonical '+name+' callback required');
 if(!Array.isArray(candidates)||!Array.isArray(cells))throw new TypeError('Canonical arrays required');
 const shuffled=cells.map(c=>({...c}));
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const used=new Set(),out=[];
 for(const [index,storylet] of candidates.slice(0,Math.min(candidates.length,shuffled.length)).entries()){
  const counter=fixedStation(storylet?.id);
  let cell;
  if(counter&&inBounds(counter.x,counter.y)){
   used.add(`${counter.x},${counter.y}`);cell={x:counter.x,y:counter.y};
  } else {
   if(mobility(storylet)==='desk'&&isOfficeIntakeWorld){
    const desk=shuffled.find(c=>!used.has(`${c.x},${c.y}`)&&['desk','window','terminal'].includes(fixtureForCell(c.x,c.y)));
    if(desk){used.add(`${desk.x},${desk.y}`);cell=desk;}
   }
   if(!cell){
    const preferred=Array.isArray(storylet.tileTags)?shuffled.find(c=>!used.has(`${c.x},${c.y}`)&&storylet.tileTags.some(tag=>(tileTagsAt(c.x,c.y)||[]).includes(tag))):null;
    cell=preferred||shuffled.find(c=>!used.has(`${c.x},${c.y}`))||shuffled[index%shuffled.length];
    used.add(`${cell.x},${cell.y}`);
   }
  }
  out.push({storylet,cell:{x:cell.x,y:cell.y},counter});
 }
 return out;
}
