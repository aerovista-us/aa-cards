// Browser-side read-only contract. Never turns a requested movement into
// game state; it accepts only already-committed, sanitized gateway frames.
const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(x);
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const safeLabel=x=>typeof x==='string'&&x.length>0&&x.length<=80&&/^[\p{L}\p{N} _.,:'-]+$/u.test(x);
const kinds=new Set(['npc','service','object','door']);
const reject=m=>{throw new TypeError(m);};
export function validateMapView(input){
 if(!input||input.schema!=='ascension.map-view.v1'||!safeId(input.sessionId)
    ||!safeId(input.world)||!integer(input.revision)||!integer(input.turn))reject('Invalid map-view envelope');
 const w=input.map?.width,h=input.map?.height;
 if(!integer(w)||!integer(h)||w<1||h<1||w>64||h>64||w*h>4096
    ||!Array.isArray(input.map?.cells)||input.map.cells.length!==w*h)reject('Invalid map dimensions');
 const cells=input.map.cells.map(cell=>{
  if(!cell||typeof cell.visible!=='boolean')reject('Invalid visibility field');
  if(cell.visible){
   if(typeof cell.walkable!=='boolean')reject('Invalid walkable flag');
   return Object.freeze({visible:true,walkable:cell.walkable});
  }
  if(Object.hasOwn(cell,'walkable'))reject('Hidden tile must not expose walkability');
  return Object.freeze({visible:false});
 });
 const p=input.player;
 if(!integer(p?.x)||!integer(p?.y)||p.x>=w||p.y>=h||
    !cells[p.y*w+p.x]?.visible||!cells[p.y*w+p.x]?.walkable)reject('Invalid visible player position');
 if(!Array.isArray(input.markers)||input.markers.length>24)reject('Invalid visible marker array');
 const ids=new Set();
 const markers=input.markers.map(m=>{
  if(!safeId(m?.id)||ids.has(m.id)||!kinds.has(m.kind)||!safeLabel(m.label)
    ||!integer(m.x)||!integer(m.y)||m.x>=w||m.y>=h||
    !cells[m.y*w+m.x]?.visible||!cells[m.y*w+m.x]?.walkable)reject('Invalid visible marker');
  ids.add(m.id);
  return Object.freeze({id:m.id,kind:m.kind,label:m.label,x:m.x,y:m.y});
 });
 return Object.freeze({
  schema:'ascension.map-view.v1',
  sessionId:input.sessionId,revision:input.revision,turn:input.turn,world:input.world,
  map:Object.freeze({width:w,height:h,cells:Object.freeze(cells)}),
  player:Object.freeze({x:p.x,y:p.y}),markers:Object.freeze(markers)
 });
}
export function createProjectionPlayback(rawFrames){
 if(!Array.isArray(rawFrames)||rawFrames.length<1||rawFrames.length>32)
  reject('Recorded frame sequence required');
 const frames=rawFrames.map(validateMapView);
 for(let i=1;i<frames.length;i++){
  if(frames[i].sessionId!==frames[0].sessionId ||
      frames[i].revision<=frames[i-1].revision ||
      frames[i].world!==frames[0].world)
   reject('Snapshot session, world, or revision continuity invalid');
 }
 let cursor=0;
 return Object.freeze({
  current:()=>frames[cursor],
  next:()=>frames[Math.min(++cursor,frames.length-1)],
  reset:()=>{cursor=0;return frames[0];},
  hasNext:()=>cursor<frames.length-1,
  progress:()=>({at:cursor+1,total:frames.length})
 });
}
