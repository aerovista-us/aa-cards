// Presentation-only environmental artwork for the 9×7 recovered office map.
// All decor, lighting and wandering characters are cosmetic: no collisions,
// story mutations, progression, authoritative NPC coordinates or save writes.
import {OFFICE,cellEnabled} from './office-model.mjs';

export function decorateOffice(scene,{at,cell,reduceMotion=false}){
  const g=scene.add.graphics().setDepth(7);
  const outline=scene.add.graphics().setDepth(9);

  // Service counters occupy inaccessible cells only. They never modify the
  // recovered cellEnabled geometry, route graph or click target contract.
  for(let y=0;y<OFFICE.height;y++)for(let x=0;x<OFFICE.width;x++){
    const p=at(x,y),open=cellEnabled(x,y);
    if(!open){
      g.fillStyle(0x233448,1);
      g.fillRoundedRect(p.x-cell*.39,p.y-cell*.38,cell*.78,cell*.76,5);
      g.lineStyle(1,0x617387,0.43);
      g.strokeRoundedRect(p.x-cell*.39,p.y-cell*.38,cell*.78,cell*.76,5);
      if(y>0&&y<OFFICE.height-1&&(x===2||x===5||x===6)){
        // File cabinets, labelled drawers, and cream-coloured dossier tabs.
        g.fillStyle(0x3c5363,1);
        g.fillRoundedRect(p.x-20,p.y-24,40,48,4);
        for(let i=0;i<3;i++){
          g.fillStyle(i%2?0x546979:0x4b6170,1);
          g.fillRoundedRect(p.x-17,p.y-20+i*14,34,11,2);
          g.fillStyle(0xd9c59b,0.86);
          g.fillRect(p.x-7,p.y-17+i*14,14,3);
        }
      }
    }else{
      // Low-contrast tile inlay and reflected ceiling strip lighting.
      g.lineStyle(1,0x92bac4,0.12);
      g.strokeRoundedRect(p.x-cell*.42,p.y-cell*.42,cell*.84,cell*.84,3);
      if(y===4&&(x===2||x===5||x===6)){
        outline.fillStyle(0xe9d8b0,0.22);
        outline.fillTriangle(p.x-7,p.y+15,p.x+7,p.y+15,p.x,p.y+7);
      }
    }
  }
  // Decorative queue rails across the far edges of the floor.
  g.lineStyle(5,0x9a7651,0.7);
  for(const x of [1,7]){
    const a=at(x,3),b=at(x,4);
    g.lineBetween(a.x-22,a.y-25,b.x-22,b.y+23);
    g.fillStyle(0xdcc495,1);
    for(const y of [a.y-25,b.y+23])g.fillCircle(a.x-22,y,5);
  }

  // Brass service kiosks / filing area equipment (non-blocking visual skins).
  const stat=at(1,3);
  g.fillStyle(0x143a43,0.93);g.fillRoundedRect(stat.x-28,stat.y-24,56,49,6);
  g.lineStyle(2,0x94dedb,0.65);g.strokeRoundedRect(stat.x-28,stat.y-24,56,49,6);
  g.fillStyle(0x67d8d2,0.6);g.fillRoundedRect(stat.x-18,stat.y-15,36,7,2);
  const rol=at(6,3);
  g.fillStyle(0x514261,0.95);g.fillRoundedRect(rol.x-28,rol.y-24,56,48,5);
  g.lineStyle(2,0xc9a4f7,0.6);g.strokeRoundedRect(rol.x-28,rol.y-24,56,48,5);
  for(let i=0;i<4;i++){
    g.fillStyle([0xddc2a1,0xb79cd5,0xc8b59b,0x9ab8bf][i],0.85);
    g.fillRoundedRect(rol.x-21+i*10,rol.y-13+i%2*5,9,22,1);
  }
  const records=at(4,5);
  g.fillStyle(0x69533d,0.9);g.fillRoundedRect(records.x-28,records.y-24,56,48,5);
  for(let i=0;i<3;i++){
    g.fillStyle(0xe2d6b7,1);g.fillRoundedRect(records.x-21+i*11,records.y-15-i*2,23,26,2);
    g.lineStyle(1,0x8b7154,0.65);g.lineBetween(records.x-16+i*11,records.y-8-i*2,records.x-2+i*11,records.y-8-i*2);
  }

  const queueDisplay=scene.add.container(at(7,0).x,at(7,0).y).setDepth(22);
  const screen=scene.add.rectangle(0,0,65,45,0x101f2c).setStrokeStyle(2,0xc4aa75);
  const label=scene.add.text(0,-10,'NOW SERVING',{fontFamily:'monospace',fontSize:'8px',color:'#e2ce9c'}).setOrigin(.5);
  const number=scene.add.text(0,6,'404',{fontFamily:'monospace',fontSize:'22px',fontStyle:'bold',color:'#7ae6dd'}).setOrigin(.5);
  queueDisplay.add([screen,label,number]);

  const topTag=scene.add.text(at(1,0).x,at(1,0).y,'DPA\nINTAKE',{fontFamily:'monospace',fontSize:'10px',align:'center',color:'#d3b57b'}).setOrigin(.5).setDepth(22);

  // An administrative clerk working behind the counter. This animation is
  // deliberately decorative, not a second authoritative NPC.
  const clerkPoint=at(5,1);
  const staff=scene.add.container(clerkPoint.x,clerkPoint.y+2).setDepth(27);
  const staffShadow=scene.add.ellipse(0,20,26,8,0x07131c,0.6);
  const coat=scene.add.ellipse(0,6,23,27,0x655073).setStrokeStyle(1,0xc4a7d3);
  const head=scene.add.circle(0,-11,11,0xcaa48b).setStrokeStyle(1,0x4c3035);
  const hair=scene.add.arc(0,-15,12,192,342,false,0x292638);
  const note=scene.add.rectangle(12,6,12,18,0xe2d2ac).setAngle(-12);
  staff.add([staffShadow,coat,head,hair,note]);
  const staffLabel=scene.add.text(clerkPoint.x,clerkPoint.y+33,'CLERK / AMBIENT',
    {fontFamily:'monospace',fontSize:'7px',color:'#b7a4ce',backgroundColor:'#0b1722'}).setOrigin(.5).setDepth(32);

  // A utility function returns all ambient tweens so reduced-motion visitors
  // can disable them without disabling movement or the game's core controls.
  const tweens=[];
  if(!reduceMotion){
    tweens.push(scene.tweens.add({targets:staff,x:clerkPoint.x+13,duration:1700,ease:'Sine.easeInOut',yoyo:true,repeat:-1}));
    tweens.push(scene.tweens.add({targets:number,alpha:{from:.72,to:1},duration:1200,yoyo:true,repeat:-1}));
    tweens.push(scene.tweens.add({targets:note,angle:{from:-12,to:6},duration:950,yoyo:true,repeat:-1}));
  }
  return {setMotion(allowed){
    for(const tween of tweens){
      if(allowed)tween.resume();
      else tween.pause();
    }
  },tweens,staff,staffLabel,queueDisplay,topTag};
}
