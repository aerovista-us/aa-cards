// Recovered Ascension v4 NPC decision-memory transitions.
// Source: recovered js/app.js advanceNpcConversationMemory.
// This does not by itself make the incomplete game executor production-ready.
const NPC_TAGS=['jinx','edgar','caseworker','nyx','gatekeeper','master-weaver','pathfinder','forge-master','grand-weaver','nettie','timbr'];
const trust=new Set(['follow','reassure','shared_goal','trust_jinx','guidance','synchronize','apologize','hold_line']);
const doubt=new Set(['interrogate','press_details','stay_guarded','command_route','override_jinx']);
const comply=new Set(['comply','formal_prompt','ask_name','clean_lane','testify','secure_records']);
const exploit=new Set(['exploit','lean_in','double_entry','sabotage','forge_again']);
const stand=new Set(['stand_ground','answer_back','release','offer_name','break_cycle']);
const evade=new Set(['retreat','refuse_game','sentence','tighten_hunt','keep_running']);
const callback={
 'npc.jinx_broken_compass':'jinxEntryChoice','npc.edgar_ledger':'edgarLedgerChoice',
 'npc.caseworker_audit':'caseworkerAuditChoice','npc.nyx_hunt':'nyxHuntChoice',
 'npc.nyx.shadow_parley':'nyxParleyChoice'
};
const expanded={gatekeeper:'gatekeeperTrust','master-weaver':'masterWeaverTrust',pathfinder:'pathfinderTrust','forge-master':'forgeMasterTrust','grand-weaver':'grandWeaverTrust',nettie:'nettieTrust',timbr:'timbrTrust'};
export function advanceRecoveredNpcMemory(state,storylet,choice,outcome) {
 if(!state || !storylet || !choice) throw new TypeError('Canonical state, storylet and choice required');
 state.flags??={};state.storyMemory??={};const memory=state.storyMemory;
 memory.npcMemory??={};memory.npcThreads??={};
 const id=choice.id||'', tag=NPC_TAGS.find(t=>(storylet.tags||[]).includes(t));
 if(callback[storylet.id]) state.flags[callback[storylet.id]]=id;
 if(storylet.id==='npc.nyx_hunt') {
  if(id==='stand_ground') state.flags.nyxOpenApproach=true;
  if(id==='retreat') state.flags.nyxClosedApproach=true;
 }
 if(storylet.id==='npc.nyx.shadow_parley') {
  if(id==='answer_back') state.flags.nyxOpenApproach=true;
  if(id==='refuse_game') state.flags.nyxClosedApproach=true;
 }
 if(!tag)return state;
 const m=memory.npcMemory;
 const inc=(key,delta)=>{m[key]=Number(m[key]||0)+delta};
 if(tag==='jinx'){if(trust.has(id))inc('jinxTrust',1);if(doubt.has(id))inc('jinxTrust',-1)}
 if(tag==='edgar'){if(['pay_now','pay_memory','settle_debt'].includes(id))inc('edgarDebt',-1);if(['refuse','delay_debt','double_down'].includes(id))inc('edgarDebt',1)}
 if(tag==='caseworker'){if(comply.has(id))inc('caseworkerSuspicion',-1);if(exploit.has(id))inc('caseworkerSuspicion',1)}
 if(tag==='nyx'){if(stand.has(id))inc('nyxPressure',-1);if(evade.has(id))inc('nyxPressure',1)}
 const key=expanded[tag];
 if(key){if(id==='trust'||trust.has(id))inc(key,1);if(id==='leverage'||doubt.has(id))inc(key,-1)}
 memory.npcThreads[tag]={lastTurn:state.turn||0,lastStoryletId:storylet.id||'',lastChoiceId:id,lastOutcomeKey:outcome?.resultEvent||null};
 return state;
}
