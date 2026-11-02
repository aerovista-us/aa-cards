// A visual-only projection of recovered Ascension v4 AFTERLIFE topology.
// Source geometry: gateway/recovered-v4/worlds.json + map.js::isCellEnabled.
// Does not calculate authoritative gameplay turns, AP, loot, NPC outcomes or saves.
export const OFFICE = Object.freeze({width:9,height:7,shape:'office',world:'AFTERLIFE'});
export const START = Object.freeze({x:4,y:4});
export const FIXTURES = Object.freeze([
  {id:'caseworker',x:4,y:2,label:'Case Worker',glyph:'C',color:0xf1c979},
  {id:'stat',x:1,y:3,label:'Stat Generator',glyph:'S',color:0x8df0e5},
  {id:'rolodex',x:6,y:3,label:'Rolodex',glyph:'R',color:0xc3a4ff},
  {id:'records',x:4,y:5,label:'Records Desk',glyph:'?',color:0xb4c6df},
  {id:'exit',x:4,y:1,label:'Placement Door',glyph:'↟',color:0xffb1a4}
]);
export function cellEnabled(x,y) {
  const w=OFFICE.width,h=OFFICE.height;
  if (!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=w||y>=h) return false;
  const midL=Math.max(1,Math.floor(w/2)-1), midR=Math.min(w-2,midL+1);
  const queueY=Math.floor(h/2);
  const sideLanes=(x===1||x===w-2)&&y>=1&&y<=h-2;
  const centralSpine=(x===midL||x===midR)&&y>=1&&y<=h-2;
  const intakeWindows=y===2&&x>=Math.max(2,midL-3)&&x<=Math.min(w-3,midR+3);
  const queueBays=(y===queueY||y===queueY+1)&&x>=1&&x<=w-2;
  const archiveLane=y===h-3&&x>=3&&x<=w-4;
  const intakeConnectors=(y===queueY-1||y===queueY+2)&&(x===midL-3||x===midR+3);
  return sideLanes||centralSpine||intakeWindows||queueBays||archiveLane||intakeConnectors;
}
export function neighbors(x,y) {
  return [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>({x:x+dx,y:y+dy})).filter(p=>cellEnabled(p.x,p.y));
}
export function same(a,b){return !!a&&!!b&&a.x===b.x&&a.y===b.y;}
export function findPath(from,to) {
  if (!cellEnabled(from?.x,from?.y)||!cellEnabled(to?.x,to?.y)) return [];
  if (same(from,to)) return [];
  const queue=[{x:from.x,y:from.y}], prior=new Map([[from.x+','+from.y,null]]);
  for (let i=0;i<queue.length;i++) {
    const here=queue[i];
    for(const next of neighbors(here.x,here.y)){
      const key=next.x+','+next.y;
      if(prior.has(key))continue;
      prior.set(key,here);
      if(same(next,to)){
        const result=[next];let p=here;
        while(p&&!same(p,from)){result.unshift(p);p=prior.get(p.x+','+p.y);}
        return result;
      }
      queue.push(next);
    }
  }
  return [];
}
export function fixtureAt(x,y){return FIXTURES.find(f=>f.x===x&&f.y===y)||null;}
