export class SpawnSystem{
  constructor(state, map){
    this.stateRef = state;
    this.map = map;
  }
  seedAll(){
    const rand = ()=>this.stateRef.rand();
    const weights = {
      veil:      { loot:0.6, encounter:0.3 },
      clerks:    { loot:0.2, encounter:0.2 },
      archive:   { loot:0.3, encounter:0.35 },
      market:    { loot:0.5, encounter:0.1 },
      hazard:    { loot:0.25, encounter:0.7 },
      rest:      { loot:0.4, encounter:0.05 },
    };
    for(let y=0;y<this.map.h;y++){
      for(let x=0;x<this.map.w;x++){
        const t = this.map.tile(x,y);
        t.spawns = t.spawns || [];
        const tag = t.tags[0];
        const w = weights[tag] || {loot:0.2, encounter:0.2};
        if(rand() < w.loot){ t.spawns.push(this.makeSpawn('loot', tag, rand)); }
        if(rand() < w.encounter){ t.spawns.push(this.makeSpawn('encounter', tag, rand)); }
      }
    }
  }
  makeSpawn(type, tag, rand){
    const id = `${type}-${Math.floor(rand()*1e9)}`;
    const respawn = type === 'loot' ? (8 + Math.floor(rand()*6)) : (10 + Math.floor(rand()*8));
    return { id, type, tag, charges:1, cooldown:0, respawn, discovered:false };
  }
  tick(){
    for(let y=0;y<this.map.h;y++){
      for(let x=0;x<this.map.w;x++){
        const t = this.map.tile(x,y);
        for(const s of (t.spawns||[])){
          if(s.cooldown>0){
            s.cooldown -= 1;
            if(s.cooldown<=0){ s.cooldown = 0; s.charges = 1; }
          }
        }
      }
    }
  }
  touchCurrent(){
    const st = this.stateRef.state; const t = this.map.currentTile();
    let loot=0, enc=0;
    for(const s of (t.spawns||[])){
      s.discovered = true;
      if(s.charges>0){
        if(s.type==='loot') loot += 1; else if(s.type==='encounter') enc += 1;
      }
    }
    return {loot, encounter:enc};
  }
  visibleSpawnsAt(x,y){
    const st = this.stateRef.state;
    const t = this.map.tile(x,y);
    const isHere = (st.pos.x===x && st.pos.y===y);
    let loot=0, enc=0;
    for(const s of (t.spawns||[])){
      if(s.charges>0 && (s.discovered || isHere)){
        if(s.type==='loot') loot += 1; else if(s.type==='encounter') enc += 1;
      }
    }
    return {loot, encounter:enc};
  }
  availableOnCurrent(type){
    const t = this.map.currentTile();
    return (t.spawns||[]).some(s => s.type===type && s.charges>0);
  }
  consumeOnCurrent(type){
    const t = this.map.currentTile();
    const s = (t.spawns||[]).find(s => s.type===type && s.charges>0);
    if(s){
      s.charges -= 1;
      if(s.charges<=0){ s.cooldown = s.respawn; }
      return true;
    }
    return false;
  }
}
