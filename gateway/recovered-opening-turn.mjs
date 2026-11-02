// Narrow source-parity port of recovered app.js prologue/start-turn state mutations.
// Map rebuilding, queued cutscenes and presentation side-effects remain separate,
// and public gameplay MUST remain disabled until their parity is proven.
export const OPENING_HOUR=Object.freeze({maxActionPoints:4,maxTurn:12,progressApBonus:1,freeOfficeMovement:true});
export function isRecoveredOpeningHour(s) {
 const flags=s.flags||{};
 return !flags.mainIntroQuestComplete&&Number(s.turn||0)<=OPENING_HOUR.maxTurn
  &&(s.currentWorld==='AFTERLIFE'||!flags.officeOnboardComplete);
}
export function startRecoveredTurn(s) {
 s.storyMemory??={};
 if(s.flags?.mainIntroQuestComplete)s.storyMemory.introQuestComplete=true;
 const base=Number(s.maxActionPoints||3);
 s.maxActionPoints=isRecoveredOpeningHour(s)?Math.max(base,OPENING_HOUR.maxActionPoints):base;
 s.actionPoints=s.maxActionPoints;
 return s;
}
export function completeRecoveredEarthPrologue(s) {
 if(s.currentWorld!=='EARTH_PROLOGUE'||!s.flags?.earthPrologueDead)return false;
 s.flags.earthPrologueComplete=true;
 s.unlockedWorlds=[...new Set([...(s.unlockedWorlds||[]),'AFTERLIFE'])];
 s.maxActionPoints=Math.max(Number(s.maxActionPoints||3),OPENING_HOUR.maxActionPoints);
 s.actionPoints=s.maxActionPoints;
 s.heat=Math.max(Number(s.heat||0),0.6);
 // Original applyWorld('AFTERLIFE', false) rebuilds the world map, and
 // queueOpeningCutscenes adds three cutscenes. Caller must do both.
 return Object.freeze({world:'AFTERLIFE',requiresCanonicalMapRebuild:true,cutscenes:['deathWake','officeIntake','floorTutorial']});
}
