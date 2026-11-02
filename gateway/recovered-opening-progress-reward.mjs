// Recovered source app.js 638-650: opening progress AP momentum.
// UI events stay injected; authoritative state mutation is deterministic.
import {isRecoveredOpeningHour,OPENING_HOUR} from './recovered-opening-turn.mjs';
export function rewardRecoveredOpeningProgress(state,label='Story beat',{logEvent,noteTurn}={}){
 if(typeof logEvent!=='function'||typeof noteTurn!=='function')throw new TypeError('Canonical event handlers required');
 if(!isRecoveredOpeningHour(state))return {awarded:0};
 const bonus=Number(OPENING_HOUR.progressApBonus||0);if(bonus<=0)return {awarded:0};
 const cap=Math.max(Number(state.maxActionPoints||3),OPENING_HOUR.maxActionPoints);
 const before=Number(state.actionPoints||0);state.actionPoints=Math.min(cap,before+bonus);
 if(state.actionPoints>before){
  logEvent(state,`${label} earned +${bonus} AP momentum.`);
  noteTurn(state,'visible',`Progress reward: +${bonus} AP (${state.actionPoints}/${cap}).`);
 }
 return {awarded:state.actionPoints-before};
}
