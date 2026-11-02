// Server-only, fail-closed projection of the existing recovered v4 saved-map
// shape. The database and owner identity MUST already be verified server-side.
// DO NOT ship this module to a browser bundle and DO NOT feed it client claims.
import {snapshotRecoveredMap} from './recovered-memory-map.mjs';

const MAX_DIM=64, MAX_CELLS=MAX_DIM*MAX_DIM;
const id=x=>typeof x==='string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(x);
const int=x=>Number.isSafeInteger(x) && x>=0;
const legalText=x=>typeof x==='string' && x.length>0 && x.length<=80 && /^[\p{L}\p{N} _.,:'-]+$/u.test(x);
const markerKinds=new Set(['npc','service','object','door']);

export function projectOwnedVisibleMap({identity,run,visibleMarkers=[]}={}){
  if(!id(identity?.subject))throw Object.assign(new Error('authentication_required'),{status:401});
  // Do not project when the caller cannot prove row ownership.
  if(!id(run?.owner_subject)||run.owner_subject!==identity.subject)
    throw Object.assign(new Error('run_not_owned'),{status:403});
  if(!id(run.id)||!int(run.revision))throw new TypeError('Verified run ID and revision required');

  const s=run.state;
  if(!s||!id(s.currentWorld)||!int(s.turn??0))throw new TypeError('Invalid recovered state');
  const map=snapshotRecoveredMap(s.worldMap); // validates persisted shape / spawns
  const {width,height,tiles}=map;
  if(width>MAX_DIM||height>MAX_DIM||width*height>MAX_CELLS)
    throw new RangeError('Map exceeds the bounded visual projection');
  if(!int(s.pos?.x)||!int(s.pos?.y)||s.pos.x>=width||s.pos.y>=height)
    throw new TypeError('Invalid saved player position');
  const originIndex=s.pos.y*width+s.pos.x;
  if(!tiles[originIndex]?.discovered)throw new TypeError('Current player cell must be discovered');
  // No tag pools, spawns, RNG, memory, cutscenes, hidden conditions, or player
  // identifiers go into the response. Undiscovered cells reveal NOTHING.
  const cells=tiles.map(tile=>{
    if(!tile||typeof tile.discovered!=='boolean')throw new TypeError('Invalid discovered flag');
    if(!tile.discovered)return {visible:false};
    if(!Array.isArray(tile.tags)||!tile.tags.every(x=>typeof x==='string'))
      throw new TypeError('Invalid persisted tile tags');
    return {visible:true,walkable:!tile.tags.includes('void')};
  });
  if(!cells[originIndex].walkable)throw new TypeError('Player position cannot be blocked');
  if(!Array.isArray(visibleMarkers)||visibleMarkers.length>24)throw new TypeError('Invalid authorized marker list');
  const markers=[];
  const ids=new Set();
  for(const marker of visibleMarkers){
    if(!id(marker?.id)||ids.has(marker.id)||!markerKinds.has(marker.kind)||!legalText(marker.label)||
       !int(marker.x)||!int(marker.y)||marker.x>=width||marker.y>=height)
      throw new TypeError('Invalid authorized marker');
    ids.add(marker.id);
    const cell=cells[marker.y*width+marker.x];
    if(cell?.visible && cell.walkable){
      markers.push({id:marker.id,kind:marker.kind,label:marker.label,x:marker.x,y:marker.y});
    }
  }
  return {
    schema:'ascension.map-view.v1',
    sessionId:run.id,revision:run.revision,world:s.currentWorld,
    turn:s.turn??0,
    map:{width,height,cells},
    player:{x:s.pos.x,y:s.pos.y},
    markers
  };
}
