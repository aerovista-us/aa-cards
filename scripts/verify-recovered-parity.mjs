#!/usr/bin/env node
// Independent, provenance-checked recovered vs modern full-state comparison.
// Does not synthesize recovered-browser fixtures or omit gameplay fields.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {diffRecoveredGameState} from '../gateway/recovered-full-state-diff.mjs';
export function verifyIndependentParity(a,b){
 const meta=x=>x&&typeof x==='object'&&x.provenance&&typeof x.provenance==='object'&&x.state&&typeof x.state==='object'&&!Array.isArray(x.state);
 if(!meta(a)||!meta(b))throw Error('missing_provenance_or_state');
 if(a.provenance.origin!=='recovered-browser'||b.provenance.origin!=='modern-gateway')throw Error('invalid_independent_origins');
 for(const key of ['scenario','seed','checkpoint']){
  if(typeof a.provenance[key]!=='string'||!a.provenance[key]||a.provenance[key]!==b.provenance[key])throw Error('scenario_mismatch_'+key);
 }
 if(!a.provenance.captureId||!b.provenance.captureId||a.provenance.captureId===b.provenance.captureId)throw Error('nonindependent_captures');
 // Original saveRun persists state and map independently; excluding map is a false pass.
 if(!a.map||!b.map||typeof a.map!=='object'||typeof b.map!=='object')throw Error('separate_saved_map_capture_required');
 const states=diffRecoveredGameState(a.state,b.state);
 const maps=diffRecoveredGameState(a.map,b.map);
 return Object.freeze({equal:states.equal&&maps.equal,differences:[...states.differences.map(x=>({...x,path:'state.'+x.path})),...maps.differences.map(x=>({...x,path:'map.'+x.path}))]});
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 try{
  if(process.argv.length!==4)throw Error('usage: node scripts/verify-recovered-parity.mjs recovered.json modern.json');
  const [a,b]=process.argv.slice(2).map(x=>JSON.parse(readFileSync(x,'utf8')));
  const result=verifyIndependentParity(a,b);
  if(!result.equal){console.error(JSON.stringify({status:'FAIL',differences:result.differences.slice(0,100),totalDifferences:result.differences.length},null,2));process.exitCode=1;}
  else console.log('PASS: independent recovered-browser and modern-gateway full-state snapshots match');
 }catch(e){console.error('PARITY_NOT_PROVEN:',e.message);process.exitCode=2;}
}
