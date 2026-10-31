// M18 exact source-derived board identity from recovered app.js lines 5442-5449.
// This is NOT board generation or an authorization check.
export function recoveredWorldTaskBoardKey({currentWorld,mapWidth,mapHeight,worldShape}, candidates=[]) {
 const sequence=candidates.map(sl=>sl.id).join('|');
 const layoutVersion=currentWorld==='AFTERLIFE'?'office-dmv-v1':
  (currentWorld==='EARTH_PROLOGUE'?'earth-worksite-v1':'default-v1');
 return `${currentWorld}:${mapWidth}x${mapHeight}:${worldShape||'grid'}:${layoutVersion}:${sequence}`;
}
// Exact source-derived planned office ID sequence from recovered lines 5460-5476.
// This covers AFTERLIFE only; EARTH_PROLOGUE has a separate prerequisite chain.
export function recoveredAfterlifePlannedTaskIds({currentWorld,flags={}}) {
 if(currentWorld!=='AFTERLIFE')return [];
 const ids=[];
 if(!flags.officeOnboardComplete){
  if(!flags.officeOnboardStarted)ids.push('office.intake_briefing');
  if(!flags.intakeFormPacketRead)ids.push('office.intake_form_packet');
  if(!flags.intakeFormIdentityDone)ids.push('office.intake_form_identity');
  if(!flags.intakeFormWitnessDone)ids.push('office.intake_form_witness');
  if(!flags.intakeFormApproved)ids.push('office.intake_form_submission');
  if(!flags.officeOnboardSlotSeen)ids.push('office.big_slot_orientation');
  ids.push('office.clearance_release');
 }
 if(flags.officeOnboardComplete&&!flags.mainAwakeningBriefed)ids.push('office.processing_agent_screening');
 if(flags.mainAwakeningBriefed&&!flags.soulResonanceSolved)ids.push('office.soul_resonance_pattern');
 if(flags.soulResonanceSolved&&!flags.lifeRecognitionSolved)ids.push('office.life_recognition_trial');
 if(flags.lifeRecognitionSolved&&!flags.mainIntroQuestComplete)ids.push('office.choice_point_memory_or_present');
 if(flags.fractureRebootPending&&!flags.fractureDeskSeen)ids.push('office.simulation_fracture_desk');
 return ids;
}
