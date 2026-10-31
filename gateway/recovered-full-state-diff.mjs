// M18 full-state differential utility. Never strips fields or normalizes
// potentially gameplay-significant values. A successful comparison requires
// independently captured recovered and gateway state from the same scenario.
function isObject(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function walk(a,b,path,out){
 if(Object.is(a,b))return;
 if(Array.isArray(a)||Array.isArray(b)){
  if(!Array.isArray(a)||!Array.isArray(b)){out.push({path,expected:a,actual:b});return;}
  if(a.length!==b.length)out.push({path:path+'.length',expected:a.length,actual:b.length});
  for(let i=0;i<Math.max(a.length,b.length);i++)walk(a[i],b[i],path+'['+i+']',out);
  return;
 }
 if(isObject(a)||isObject(b)){
  if(!isObject(a)||!isObject(b)){out.push({path,expected:a,actual:b});return;}
  for(const k of [...new Set([...Object.keys(a),...Object.keys(b)])].sort())walk(a[k],b[k],path?path+'.'+k:k,out);
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
