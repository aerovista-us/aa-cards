// Recovered app.js canonical condition and story memory helpers.
// Sources: original app.js lines 66-86, 808-811 and 838-850.
const getPath=(obj,path)=>String(path||'').split('.').reduce((a,k)=>a?.[k],obj);
export function recoveredAppConditionOk(state,cond) {
 const cmpKeys=['<','<=','>','>=','==','!='];
 for(const [k,v] of Object.entries(cond||{})){
  const cur=getPath(state,k);
  if(v&&typeof v==='object'&&Object.keys(v).some(x=>cmpKeys.includes(x))){
   if(v['<']!==undefined&&!(cur<v['<']))return false;
   if(v['<=']!==undefined&&!(cur<=v['<=']))return false;
   if(v['>']!==undefined&&!(cur>v['>']))return false;
   if(v['>=']!==undefined&&!(cur>=v['>=']))return false;
   if(v['==']!==undefined&&!(cur==v['==']))return false;
   if(v['!=']!==undefined&&!(cur!=v['!=']))return false;
  } else if(JSON.stringify(cur)!==JSON.stringify(v))return false;
 }
 return true;
}
export function recoveredStoryletMemoryScore(state,storylet){
 if(!(state.storyMemory?.introQuestComplete||state.flags?.mainIntroQuestComplete))return 0;
 const tags=storylet?.tags||[];
 let score=0;
 for(const t of tags){
  const prior=Number(state.storyMemory?.threadCounts?.[t]||0);
  if(prior>0)score+=Math.min(0.5,prior*0.07);
 }
 if(tags.includes('main')&&storylet.progressor)score+=0.45;
 if(tags.includes('sidequest')&&(state.turn||0)>=3)score+=0.28;
 return score;
}
