import { renderTemplate } from './text.js';

function getPath(obj, path){
  return path.split('.').reduce((a,k)=>a?.[k], obj);
}
function condOk(state, cond){
  const cmpKeys = ['<','<=','>','>=','==','!='];
  for(const [k,v] of Object.entries(cond||{})){
    const cur = getPath(state, k);
    if(v && typeof v === 'object' && Object.keys(v).some(x=>cmpKeys.includes(x))){
      if(v['<']  !== undefined && !(cur <  v['<']))  return false;
      if(v['<='] !== undefined && !(cur <=  v['<='])) return false;
      if(v['>']  !== undefined && !(cur >  v['>']))  return false;
      if(v['>='] !== undefined && !(cur >=  v['>='])) return false;
      if(v['=='] !== undefined && !(cur ==  v['=='])) return false;
      if(v['!='] !== undefined && !(cur !=  v['!='])) return false;
    }else if(JSON.stringify(cur) !== JSON.stringify(v)){ return false; }
  }
  return true;
}
function includesAny(a=[], b=[]){ return a.some(x=>b.includes(x)); }

function weightedSample(items, weights, k, rand){
  const chosen = [];
  const poolItems = items.slice();
  const poolWeights = weights.slice();
  for(let t=0; t<k && poolItems.length>0; t++){
    const total = poolWeights.reduce((a,b)=>a+b, 0);
    let r = rand() * total;
    let idx = 0;
    for(; idx<poolWeights.length; idx++){
      r -= poolWeights[idx];
      if(r <= 0) break;
    }
    const pickItem = poolItems.splice(idx,1)[0];
    poolWeights.splice(idx,1);
    chosen.push(pickItem);
  }
  return chosen;
}

export class Director{
  constructor(state, map, spawn){
    this.stateRef = state; this.map = map; this.spawn = spawn;
    this.library = [];
  }
  async load(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error('Failed to load library');
    this.library = await res.json();
  }
  eligible(){
    const s = this.stateRef.state;
    const tile = this.map.currentTile();
    return this.library.filter(sl => {
      if(s.cooldowns?.[sl.id] > 0) return false;
      const tags = sl.tags || [];
      const criticalProgressor = !!sl.progressor && (tags.includes('main') || tags.includes('onboarding'));
      if(sl.tileTags && !criticalProgressor && !includesAny(tile.tags, sl.tileTags)) return false;
      if(sl.needsSpawn && !this.spawn.availableOnCurrent(sl.needsSpawn)) return false;
      return condOk(s, sl.when || {});
    });
  }
  baseScore(sl){
    const s = this.stateRef.state;
    let w = typeof sl.weight === 'number' ? sl.weight : (sl.weight?.base ?? 1);
    if(sl.arcs){
      const stage = (s.arc.discovery||0) < 3 ? 'discovery' : (s.arc.confrontation||0) < 3 ? 'confrontation' : 'reckoning';
      if(sl.arcs.includes(stage)) w += 0.3;
    }
    if((s.heat||0) >= 4 && sl.progressor) w += 0.4;
    return w;
  }
  noveltyAdjust(sl){
    const s = this.stateRef.state;
    let adj = 0;
    const recent = new Set(s.recentTags || []);
    const tags = sl.tags || [];
    for(const t of tags){
      const count = s.tagCounts?.[t] || 0;
      if(count === 0) adj += 0.35;
      else if(count === 1) adj += 0.15;
    }
    if(tags.some(t => recent.has(t))) adj -= 0.25;
    const seenCount = s.storyletCounts?.[sl.id] || 0;
    adj -= 0.25 * seenCount;
    return adj;
  }
  score(sl){
    const s = this.stateRef.state;
    let sc = this.baseScore(sl) + this.noveltyAdjust(sl);
    if((s.progress.veil||0)+(s.progress.executor||0) < Math.floor(s.turn/4) && sl.progressor) sc += 0.5;
    return Math.max(0.05, sc);
  }
  pick(k=3){
    const pool = this.eligible();
    if(pool.length === 0) return [];
    const weights = pool.map(sl => this.score(sl));
    const rand = () => this.stateRef.rand();
    const chosen = weightedSample(pool, weights, Math.min(k, pool.length), rand);
    return chosen.map(sl => ({...sl, label: renderTemplate(sl.label, {...this.stateRef.state, tile:this.map.currentTile()})}));
  }
}
