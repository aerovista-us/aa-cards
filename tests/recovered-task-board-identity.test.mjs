import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveredWorldTaskBoardKey as key,recoveredAfterlifePlannedTaskIds as planned} from '../gateway/recovered-task-board-identity.mjs';
test('board keys preserve world, shape, dimension, ordered ID sequence',()=>{
 assert.equal(key({currentWorld:'AFTERLIFE',mapWidth:8,mapHeight:7,worldShape:'office'},[{id:'A'},{id:'B'}]),'AFTERLIFE:8x7:office:office-dmv-v1:A|B');
 assert.equal(key({currentWorld:'EARTH_PROLOGUE',mapWidth:7,mapHeight:4},[]),'EARTH_PROLOGUE:7x4:grid:earth-worksite-v1:');
 assert.equal(key({currentWorld:'ELSEWHERE',mapWidth:3,mapHeight:2},[]),'ELSEWHERE:3x2:grid:default-v1:');
});
test('first office board follows original planned sequence',()=>{
 assert.deepEqual(planned({currentWorld:'AFTERLIFE'}),[
 'office.intake_briefing','office.intake_form_packet','office.intake_form_identity',
 'office.intake_form_witness','office.intake_form_submission','office.big_slot_orientation',
 'office.clearance_release']);
});
test('flags remove previously satisfied intake tasks while preserving clearance',()=>{
 assert.deepEqual(planned({currentWorld:'AFTERLIFE',flags:{officeOnboardStarted:true,intakeFormPacketRead:true,intakeFormIdentityDone:true,intakeFormWitnessDone:true,intakeFormApproved:true,officeOnboardSlotSeen:true}}),['office.clearance_release']);
});
test('post onboarding sequence is flag-driven and fracture independent',()=>{
 assert.deepEqual(planned({currentWorld:'AFTERLIFE',flags:{officeOnboardComplete:true,lifeRecognitionSolved:true,fractureRebootPending:true}}),['office.processing_agent_screening','office.choice_point_memory_or_present','office.simulation_fracture_desk']);
 assert.deepEqual(planned({currentWorld:'EARTH_PROLOGUE'}),[]);
});
