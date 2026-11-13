// Dormant, source-only Stat Generator spin accounting proposal.
// NOT wired into Office state, an HTTP command, a placement selector or RNG.
// The authoritative game executor must supply visit/award event IDs from
// committed server-side transitions, NEVER from a browser command.
const SCHEMA='ascension.stat-spins.v1';
const MAX_EVENTS=256;
const keys=['schema','visits','currentVisitId','freeUsed','earnedAwardIds','banked','freeUsedCount','bankedUsedCount'];
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const whole=x=>Number.isSafeInteger(x)&&x>=0;
const fail=()=>{throw Error('invalid_spin_ledger')};
const copy=x=>structuredClone(x);
function validate(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    Object.keys(raw).length!==keys.length||keys.some(k=>!Object.hasOwn(raw,k))||
    raw.schema!==SCHEMA||!Array.isArray(raw.visits)||raw.visits.length===0||raw.visits.length>MAX_EVENTS||
    raw.visits.some(x=>!validId(x))||new Set(raw.visits).size!==raw.visits.length||
    raw.currentVisitId!==raw.visits.at(-1)||typeof raw.freeUsed!=='boolean'||
    !Array.isArray(raw.earnedAwardIds)||raw.earnedAwardIds.length>MAX_EVENTS||
    raw.earnedAwardIds.some(x=>!validId(x))||new Set(raw.earnedAwardIds).size!==raw.earnedAwardIds.length||
    !whole(raw.banked)||!whole(raw.freeUsedCount)||!whole(raw.bankedUsedCount)||
    raw.freeUsedCount>raw.visits.length||raw.freeUsedCount<Number(raw.freeUsed)||
    raw.banked+raw.bankedUsedCount!==raw.earnedAwardIds.length)fail();
 return copy(raw);
}
export function createStatSpinLedger(firstVisitId){
 if(!validId(firstVisitId))fail();
 return {schema:SCHEMA,visits:[firstVisitId],currentVisitId:firstVisitId,freeUsed:false,
  earnedAwardIds:[],banked:0,freeUsedCount:0,bankedUsedCount:0};
}
export function restoreStatSpinLedger(serialized){
 let raw;
 try{raw=JSON.parse(serialized)}catch{fail()}
 return validate(raw);
}
export function enterOfficeVisit(saved,visitId){
 const next=validate(saved);
 if(!validId(visitId))fail();
 if(visitId===next.currentVisitId)return next; // replay of the current visit: no new free spin
 if(next.visits.includes(visitId)||next.visits.length>=MAX_EVENTS)throw Error('visit_replay_or_limit');
 next.visits.push(visitId);next.currentVisitId=visitId;next.freeUsed=false;
 return next;
}
export function awardEarnedSpin(saved,awardEventId){
 const next=validate(saved);
 if(!validId(awardEventId))fail();
 if(next.earnedAwardIds.includes(awardEventId))return {ledger:next,credited:false};
 if(next.earnedAwardIds.length>=MAX_EVENTS)throw Error('award_limit_reached');
 next.earnedAwardIds.push(awardEventId);next.banked++;
 return {ledger:next,credited:true};
}
export function consumeStatSpin(saved){
 const next=validate(saved);
 if(!next.freeUsed){
  next.freeUsed=true;next.freeUsedCount++;
  return {ledger:next,source:'free'};
 }
 if(next.banked<=0)throw Error('no_spins_available');
 next.banked--;next.bankedUsedCount++;
 return {ledger:next,source:'banked'};
}
