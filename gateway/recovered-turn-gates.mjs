// M18 bounded, side-effect-free port of the recovered app.js action/turn guards.
// Source: NXCore /srv/ACOS/workspaces/ascension/app/js/app.js
// SHA-256 prefix ab2a37710f9cfd0a; lines 2347-2356 and 2372-2377.
// No state mutation, task completion or end-turn implementation is claimed.
const fail = (reason) => Object.freeze({allowed:false,reason});
const OK = Object.freeze({allowed:true,reason:null});
export function recoveredEndTurnGate(ui) {
 if(ui.mainMenuOpen || ui.endingKey || ui.cutsceneOpen || ui.resultOverlayOpen || ui.turnRecapOverlayOpen) return fail('presentation_gate');
 if(ui.activeStorylet) return fail('unresolved_decision');
 return OK;
}
export function recoveredActionGate(ui, actionPoints, cost, label='Action') {
 if(ui.mainMenuOpen || ui.endingKey || ui.cutsceneOpen || ui.resultOverlayOpen || ui.turnRecapOverlayOpen || ui.pendingTurnContinuation) return fail('presentation_gate');
 if(ui.activeStorylet && label !== 'Decision') return fail('unresolved_decision');
 if((actionPoints || 0) < cost) return fail('insufficient_action_points');
 return OK;
}
