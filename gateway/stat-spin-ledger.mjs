// Dormant Stat Generator spin accounting proposal; NO game/RNG/placement integration.
// Only the authoritative, owner-locked game transaction may supply these event
// IDs from committed server-side transitions. NEVER from a browser command.
const SCHEMA='ascension.stat-spins.v1';
const MAX_EVENTS=256;
const KEYS=['schema','visits','currentVisitId','freeUsed','earnedAwardIds','banked','freeUsedCount','bankedUsedCount','spinUses'];
const USE_KEYS=['eventId','visitId','source'];
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const whole=x=>Number.isSafeInteger(x)&&x>=0;
const shape=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const fail=()=>{throw Error('invalid_spin_ledger')};
function validate(raw){
 if(!shape(raw,KEYS)||raw.schema!==SCHEMA||
    !Array.isArray(raw.visits)||raw.visits.length<1||raw.visits.length>MAX_EVENTS||
    raw.visits.some(x=>!validId(x))||new Set(raw.visits).size!==raw.visits.length||
    raw.currentVisitId!==raw.visits.at(-1)||typeof raw.freeUsed!=='boolean'||
    !Array.isArray(raw.earnedAwardIds)||raw.earnedAwardIds.length>MAX_EVENTS||
    raw.earnedAwardIds.some(x=>!validId(x))||
    new Set(raw.earnedAwardIds).size!==raw.earnedAwardIds.length||
    !whole(raw.banked)||!whole(raw.freeUsedCount)||!whole(raw.bankedUsedCount)||
    !Array.isArray(raw.spinUses)||raw.spinUses.length>MAX_EVENTS)fail();

 const visited=new Map(raw.visits.map((id,index)=>[id,index]));
 const usedEvents=new Set(),usedFreeVisits=new Set();
 let freeCount=0,bankedCount=0,lastVisitIndex=-1;
 for(const use of raw.spinUses){
  if(!shape(use,USE_KEYS)||!validId(use.eventId)||!validId(use.visitId)||
     !['free','banked'].includes(use.source)||usedEvents.has(use.eventId)||
     !visited.has(use.visitId))fail();
  // A committed use cannot go backwards to a previous Office visit.
  const visitIndex=visited.get(use.visitId);
  if(visitIndex<lastVisitIndex)fail();
  lastVisitIndex=visitIndex;usedEvents.add(use.eventId);
  if(use.source==='free'){
   if(usedFreeVisits.has(use.visitId))fail();
   usedFreeVisits.add(use.visitId);freeCount++;
  }else{
   // A banked credit cannot be spent before that visit's free spin.
   if(!usedFreeVisits.has(use.visitId))fail();
   bankedCount++;
  }
 }
 // Visit, award and spend events share one authoritative event-ID namespace.
 if(raw.visits.some(id=>usedEvents.has(id)||raw.earnedAwardIds.includes(id))||
    raw.earnedAwardIds.some(id=>usedEvents.has(id)))fail();
 if(raw.freeUsedCount!==freeCount||raw.bankedUsedCount!==bankedCount||
    raw.freeUsed!==usedFreeVisits.has(raw.currentVisitId)||
    raw.banked!==raw.earnedAwardIds.length-bankedCount||
    raw.banked<0||raw.freeUsedCount>raw.visits.length||
    raw.spinUses.length!==raw.freeUsedCount+raw.bankedUsedCount)fail();
 return structuredClone(raw);
}
export function createStatSpinLedger(firstVisitId){
 if(!validId(firstVisitId))fail();
 return {schema:SCHEMA,visits:[firstVisitId],currentVisitId:firstVisitId,freeUsed:false,
  earnedAwardIds:[],banked:0,freeUsedCount:0,bankedUsedCount:0,spinUses:[]};
}
export function restoreStatSpinLedger(serialized){
 let raw;
 try{raw=JSON.parse(serialized)}catch{fail()}
 return validate(raw);
}
export function enterOfficeVisit(saved,visitId){
 const next=validate(saved);
 if(!validId(visitId))fail();
 if(visitId===next.currentVisitId)return next; // same committed event: no refill
 if(next.visits.includes(visitId)||next.visits.length>=MAX_EVENTS)throw Error('visit_replay_or_limit');
 if(next.earnedAwardIds.includes(visitId)||next.spinUses.some(use=>use.eventId===visitId))
  throw Error('event_id_collision');
 next.visits.push(visitId);next.currentVisitId=visitId;next.freeUsed=false;
 return next;
}
export function awardEarnedSpin(saved,awardEventId){
 const next=validate(saved);
 if(!validId(awardEventId))fail();
 if(next.earnedAwardIds.includes(awardEventId))return {ledger:next,credited:false};
 if(next.earnedAwardIds.length>=MAX_EVENTS)throw Error('award_limit_reached');
 if(next.visits.includes(awardEventId)||next.spinUses.some(use=>use.eventId===awardEventId))
  throw Error('event_id_collision');
 next.earnedAwardIds.push(awardEventId);next.banked++;
 return {ledger:next,credited:true};
}
export function consumeStatSpin(saved,spinEventId){
 const next=validate(saved);
 if(!validId(spinEventId))fail();
 const previous=next.spinUses.find(use=>use.eventId===spinEventId);
 if(previous)return {ledger:next,source:previous.source,consumed:false};
 if(next.visits.includes(spinEventId)||next.earnedAwardIds.includes(spinEventId))
  throw Error('event_id_collision');
 if(next.spinUses.length>=MAX_EVENTS)throw Error('spin_use_limit_reached');
 let source;
 if(!next.freeUsed){next.freeUsed=true;next.freeUsedCount++;source='free';}
 else if(next.banked>0){next.banked--;next.bankedUsedCount++;source='banked';}
 else throw Error('no_spins_available');
 next.spinUses.push({eventId:spinEventId,visitId:next.currentVisitId,source});
 return {ledger:next,source,consumed:true};
}
