// Plans movement intent from an already validated public view. Server checks each step.
export function findOfficePath(view,target){
 const {width,height,cells}=view.world,start=view.player;
 if(!Number.isInteger(target?.x)||!Number.isInteger(target?.y)||target.x<0||target.y<0||
  target.x>=width||target.y>=height||!cells[target.y*width+target.x]?.walkable)return [];
 const from=start.y*width+start.x,to=target.y*width+target.x;
 if(from===to)return [];
 const prior=new Map([[from,null]]),queue=[from];
 for(let i=0;i<queue.length;i++){
  const current=queue[i],x=current%width,y=Math.floor(current/width);
  for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   const nx=x+dx,ny=y+dy,index=ny*width+nx;
   if(nx<0||ny<0||nx>=width||ny>=height||!cells[index]?.walkable||prior.has(index))continue;
   prior.set(index,current);queue.push(index);
   if(index===to){
    const path=[];let step=to;
    while(step!==from){path.unshift({x:step%width,y:Math.floor(step/width)});step=prior.get(step);}
    return path;
   }
  }
 }
 return [];
}
export function nextOfficeMove(view,target){
 const next=findOfficePath(view,target)[0];if(!next)return null;
 return view.actions.find(a=>a.command.type==='move'&&a.command.dx===next.x-view.player.x&&a.command.dy===next.y-view.player.y)||null;
}
