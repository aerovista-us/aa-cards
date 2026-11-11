// Only the committed player-visible view can supply optional NPC presentation context.
import {projectWorldGame} from './world-game-view.mjs';
export function visibleWorldNpcContext(identity,run){
 const view=projectWorldGame(identity,run);
 const action=view.actions.find(a=>a.command.type==='talk'&&['caseworker','attendant'].includes(a.command.target));
 if(!action)return null;
 const facts=['Current area: '+view.world.label,...view.mission.steps.filter(s=>s.complete).map(s=>'Completed: '+s.label)];
 if(view.caseFile.assessment)facts.push('Filed trait: '+view.caseFile.assessment.trait);
 if(view.caseFile.placement)facts.push('Filed placement: '+view.caseFile.placement.label);
 if(view.caseFile.glitch.resolution)facts.push('Filed Glitch decision: '+view.caseFile.glitch.resolution+'; heat '+view.caseFile.glitch.heat);
 if(view.hallway)facts.push('Hallway checkpoint: '+view.hallway.mode+'; route revealed '+view.hallway.routeRevealed);
 return {npcId:action.command.target,sceneId:view.world.id,facts:facts.slice(0,12),memory:view.journal.slice(-6).map(e=>e.text)};
}
