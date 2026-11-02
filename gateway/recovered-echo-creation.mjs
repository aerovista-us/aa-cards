// Extracted generic delayed-consequence branch of recovered Ascension v4.
// Specialized story/NPC echo templates still require canonical port and parity.
export function createRecoveredGenericEcho(state,storylet,choice,before,after,rng){
 if(!state||!storylet||!choice||!rng?.next)throw new TypeError('Canonical state, choice and RNG required');
 if(String(storylet.id||'').startsWith('echo.'))return null;
 state.storyMemory??={};const pending=state.storyMemory.pendingEchoes??=[];
 if(pending.length>=24)return null;
 const tags=storylet.tags||[];
 const npc=['jinx','edgar','caseworker','nyx','gatekeeper','master-weaver','pathfinder','forge-master','grand-weaver','nettie','timbr'].find(t=>tags.includes(t));
 if(tags.includes('repeatable')&&!npc)return null;
 const delay=2+Math.floor(rng.next()*3);
 const dueTurn=Number(state.turn||0)+delay;
 const choiceId=choice.id||'choice',choiceLabel=choice.label||choiceId;
 if(pending.some(e=>!e.resolved&&e.sourceStoryletId===storylet.id&&e.sourceChoiceId===choiceId))return null;
 const drift=Object.fromEntries(['council','exiles','timeline','humanity'].map(k=>[k,Number(after?.[k]||0)-Number(before?.[k]||0)]));
 const magnitude=Object.values(drift).reduce((sum,n)=>sum+Math.abs(n),0);
 const heavy=tags.some(t=>['main','npc','progressor','story','onboarding'].includes(t))||!!storylet.progressor;
 // Only generic echoes belong here. Specialized branches must not be silently approximated.
 if(['office.intake_briefing','office.choice_point_memory_or_present'].includes(storylet.id)||npc)
  throw new Error('Specialized canonical echo template not yet ported');
 if(!heavy&&magnitude<=0)return null;
 const payload={world:state.currentWorld,dueTurn,tags:['echo','story','timeline'],label:'Echo: A Decision Returns',
 text:`The hallway restages ${choiceLabel} with one impossible detail altered, as if testing your story for weak seams.`,
 choices:[{id:'stabilize',label:'Stabilize the seam and keep moving',effects:{'consequences.timeline':'-1','consequences.humanity':'+1',heat:'-1'}},
 {id:'exploit_rebound',label:'Exploit the rebound for short-term leverage',effects:{'consequences.timeline':'+1','consequences.council':'+1',heat:'+1'}}]};
 const echo={id:`echo.${String(storylet.id||'unknown').replace(/[^a-zA-Z0-9_.-]/g,'_')}.${String(choiceId).replace(/[^a-zA-Z0-9_.-]/g,'_')}.${state.turn||0}.${Math.floor(rng.next()*99999)}`,
 dueTurn:payload.dueTurn,announced:false,resolved:false,world:payload.world||null,sourceStoryletId:storylet.id||'unknown',sourceChoiceId:choiceId,
 sourceLabel:storylet.label||storylet.id||'previous encounter',sourceChoiceLabel:choiceLabel,label:payload.label,text:payload.text,tags:payload.tags,choices:payload.choices};
 pending.push(echo);state.storyMemory.pendingEchoes=pending.slice(-24);return echo;
}
