// Server-side extraction of recovered Ascension v4 choice primitives.
// Source authority: recovered app/js/app.js and js/systems/state.js.
// The full game executor must additionally handle world/echo/NPC transitions;
// unsupported mechanisms MUST fail closed, never silently be skipped.
import {createPersistentRng} from './persistent-rng.mjs';

const delta=(effects,path)=>{
 const value=path.split('.').reduce((o,k)=>o?.[k],effects||{});
 if(typeof value==='number') return value;
 if(typeof value==='string' && /^[+-]\d+$/.test(value)) return Number(value);
 return 0;
};
export function outcomeWeight(outcome,choice,storylet,state) {
 let w=Math.max(0.01,Number(outcome.weight??outcome.chance??1));
 if(!(state.storyMemory?.introQuestComplete||state.flags?.mainIntroQuestComplete)) return w;
 const effects=outcome.effects??choice.effects??{};
 const c=state.consequences||{},tags=storylet.tags||[];
 const bias=(c.council||0)-(c.exiles||0);
 if(bias>=2 && delta(effects,'consequences.council')>0) w*=1.16;
 if(bias<=-2 && delta(effects,'consequences.exiles')>0) w*=1.16;
 if(tags.includes('nyx') && (state.heat||0)>=3 && delta(effects,'npcs.nyx')>0) w*=0.9;
 w*=Math.max(0.55,1-Number(state.storyletCounts?.[storylet.id]||0)*0.08);
 return Math.max(0.01,w);
}
export function rollRecoveredOutcome(choice,storylet,state,rng) {
 const outcomes=choice.outcomes||[];
 if(!Array.isArray(outcomes)||outcomes.length===0)
  return {effects:choice.effects,cutscene:choice.cutscene,resultText:choice.resultText||null,resultEvent:choice.resultEvent||null};
 const weighted=outcomes.map(outcome=>({outcome,weight:outcomeWeight(outcome,choice,storylet,state)}));
 const total=weighted.reduce((sum,row)=>sum+row.weight,0);
 let r=rng.next()*Math.max(0.01,total);
 let picked=weighted[weighted.length-1]?.outcome||outcomes[0];
 for(const row of weighted){r-=row.weight;if(r<=0){picked=row.outcome;break}}
 return {effects:picked.effects??choice.effects,cutscene:picked.cutscene??choice.cutscene,resultText:picked.resultText||null,resultEvent:picked.resultEvent||null};
}
export function grantRecoveredXp(state,amount) {
 const gain=Math.max(0,Number(amount||0));
 state.xp=Number(state.xp||0)+gain;
 while(state.xp>=Math.max(4,4+Math.floor((Number(state.level||1)-1)*2))){
  const threshold=Math.max(4,4+Math.floor((Number(state.level||1)-1)*2));
  state.xp-=threshold;state.level=Number(state.level||1)+1;
  if(state.level%2===0) state.maxActionPoints=Math.min(5,Number(state.maxActionPoints||3)+1);
  state.inventory??={};state.inventory['Ascension Shard']=(state.inventory['Ascension Shard']||0)+1;
 }
}
export function spendRecoveredAp(state,choice) {
 const cost=choice.actionCost||1;
 if(!Number.isSafeInteger(cost)||cost<=0||Number(state.actionPoints||0)<cost)
  throw Object.assign(new Error('insufficient_action_points'),{status:422});
 state.actionPoints=Math.max(0,state.actionPoints-cost);
 return {cost,turnRequired:state.actionPoints<=0};
}
export function createRecoveredChoicePrimitives(state) {
 const rng=createPersistentRng({seedString:state.seedString,rngDraws:state.rngDraws??0});
 return Object.freeze({roll:(choice,storylet)=>rollRecoveredOutcome(choice,storylet,state,rng), checkpoint:()=>rng.checkpoint()});
}
