// Source-derived taskBoardCandidates app.js 5389-5440. Canonical external
// conditions, scoring, memory scoring, templating and priority IDs are injected.
export function selectRecoveredBoardCandidates({state,tile,library,plannedIds,ambientIds,readyEchoes,priorityIds,conditionOk,score,memoryScore,renderTemplate,limit=12}){
 for(const [name,fn] of Object.entries({conditionOk,score,memoryScore,renderTemplate}))
  if(typeof fn!=='function')throw new TypeError('Canonical '+name+' required');
 if(!Array.isArray(library)||!Array.isArray(plannedIds)||!Array.isArray(ambientIds)||!Array.isArray(readyEchoes)||!Array.isArray(priorityIds))
  throw new TypeError('Canonical candidate source arrays required');
 const t=tile||{tags:[]},seen=new Set(),out=[];
 const push=(sl,options={})=>{
  if(!sl||seen.has(sl.id))return;
  if(state.cooldowns?.[sl.id]>0||sl.needsSpawn)return;
  if(!options.ignoreWhen&&!conditionOk(state,sl.when||{}))return;
  seen.add(sl.id);out.push({...sl,planned:!!options.ignoreWhen,label:renderTemplate(sl.label,{...state,tile:t})});
 };
 const byId=new Map(library.map(sl=>[sl.id,sl]));
 for(const id of plannedIds)push(byId.get(id),{ignoreWhen:true});
 for(const id of ambientIds)push(byId.get(id));
 const firstOffice=state.currentWorld==='AFTERLIFE'&&!state.flags?.officeOnboardComplete;
 for(const echo of readyEchoes.slice(0,2))push(echo);
 for(const id of priorityIds)push(byId.get(id));
 const ranked=library.filter(sl=>!seen.has(sl.id)).filter(sl=>!sl.needsSpawn)
  .filter(sl=>!firstOffice||!(sl.tags||[]).includes('observe'))
  .filter(sl=>conditionOk(state,sl.when||{}))
  .map(sl=>({sl,score:score(sl)+(sl.progressor?1.2:0)+((sl.tags||[]).includes('main')?1:0)+((sl.tags||[]).includes('npc')?0.45:0)+memoryScore(sl)}))
  .sort((a,b)=>b.score-a.score).map(({sl})=>({...sl,label:renderTemplate(sl.label,{...state,tile:t})}));
 for(const sl of ranked){push(sl);if(out.length>=limit)break;}
 return out.slice(0,limit);
}
