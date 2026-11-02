// M18 full-state differential utility. Never strips fields or normalizes
// potentially gameplay-significant values. A successful comparison requires
// independently captured recovered and gateway state from the same scenario.
function isObject(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function walk(a,b,path,out){
 if(Object.is(a,b))return;
 if(Array.isArray(a)||Array.isArray(b)){
  if(!Array.isArray(a)||!Array.isArray(b)){out.push({path,expected:a,actual:b});return;}
  if(a.length!==b.length)out.push({path:path+'.length',expected:a.length,actual:b.length});
  for(let i=0;i<Math.max(a.length,b.length);i++){
  const hasA=Object.hasOwn(a,i),hasB=Object.hasOwn(b,i);
  if(hasA!==hasB){out.push({path:path+'['+i+']',expected:hasA?a[i]:undefined,actual:hasB?b[i]:undefined,missing:hasA?'actual':'expected'});continue;}
  if(hasA)walk(a[i],b[i],path+'['+i+']',out);
 }
  return;
 }
 if(isObject(a)||isObject(b)){
  if(!isObject(a)||!isObject(b)){out.push({path,expected:a,actual:b});return;}
  for(const k of [...new Set([...Object.keys(a),...Object.keys(b)])].sort()){
  const keyPath=path?path+'.'+k:k;
  const hasA=Object.hasOwn(a,k),hasB=Object.hasOwn(b,k);
  if(hasA!==hasB){out.push({path:keyPath,expected:hasA?a[k]:undefined,actual:hasB?b[k]:undefined,missing:hasA?'actual':'expected'});continue;}
  walk(a[k],b[k],keyPath,out);
 }
  return;
 }
 out.push({path:path||'$',expected:a,actual:b});
}
export function diffRecoveredGameState(recovered,modern){
 if(!isObject(recovered)||!isObject(modern))throw new TypeError('Two complete state objects required');
 const differences=[];walk(recovered,modern,'',differences);
 return Object.freeze({equal:differences.length===0,differences});
}
export function assertRecoveredGameStateParity(recovered,modern){
 const result=diffRecoveredGameState(recovered,modern);
 if(!result.equal){
  const e=new Error('recovered_full_state_parity_failed');
  e.differences=result.differences;throw e;
 }
 return true;
}
