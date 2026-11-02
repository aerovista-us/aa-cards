import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyIndependentParity} from '../scripts/verify-recovered-parity.mjs';

const pair=()=>{
 const make=(origin,captureId)=>({
  provenance:{origin,captureId,scenario:'earth-to-office-first-hour',seed:'seed-A',checkpoint:'initial-main-menu'},
  state:{seedString:'seed-A',turn:0,flags:{},currentWorld:'EARTH_PROLOGUE'},
  map:{w:2,h:1,grid:[{type:'floor'},{type:'wall'}],worldProfile:{shape:'start'}}
 });
 return [make('recovered-browser','source-capture'),make('modern-gateway','gateway-capture')];
};
test('original and independently executed gateway complete save and map must match',()=>{
 const [original,gateway]=pair();
 assert.equal(verifyIndependentParity(original,gateway).equal,true);
 gateway.map.grid[1].type='floor';
 assert.deepEqual(verifyIndependentParity(original,gateway).differences.map(d=>d.path),['map.grid[1].type']);
});
test('provenance is mandatory and captures must be distinct',()=>{
 const [original,gateway]=pair();
 gateway.provenance.captureId=original.provenance.captureId;
 assert.throws(()=>verifyIndependentParity(original,gateway),/nonindependent_captures/);
 gateway.provenance.captureId='new-capture';
 gateway.provenance.seed='another';
 assert.throws(()=>verifyIndependentParity(original,gateway),/scenario_mismatch_seed/);
});
test('missing RNG or other modern fields are differences, not automatically excluded',()=>{
 const [original,gateway]=pair();
 gateway.state.rngDraws=1;
 const result=verifyIndependentParity(original,gateway);
 assert.equal(result.equal,false);
 assert.deepEqual(result.differences.map(d=>d.path),['state.rngDraws']);
});
