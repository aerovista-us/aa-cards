// Main Office geometry matches the approved 9×7 recovered office profile.
// Service coordinates are interaction points at the counters, not client authority.
export function officeCellEnabled(x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=9||y>=7)return false;
 return ((x===1||x===7)&&y>=1&&y<=5)||((x===3||x===4)&&y>=1&&y<=5)||
  (y===2&&x>=2&&x<=6)||((y===3||y===4)&&x>=1&&x<=7)||
  (y===4&&x>=3&&x<=5)||((y===2||y===5)&&(x===0||x===7));
}
export const OFFICE_WORLD=Object.freeze({
 id:'afterlife-placement-office',width:9,height:7,start:Object.freeze({x:4,y:4}),
 blocked:Object.freeze(Array.from({length:63},(_,i)=>({x:i%9,y:Math.floor(i/9)})).filter(p=>!officeCellEnabled(p.x,p.y)).map(p=>p.x+','+p.y)),
 objects:Object.freeze({
  notice:{x:3,y:4,label:'Intake notice',kind:'object',description:'Read your file. Attend assessment. Obtain placement approval. Do not report anomalies on the lunch forms.'},
  records:{x:4,y:5,label:'Records Desk',kind:'object',description:'A queue ticket is clipped to Billy’s case file. The cover is stamped: ONE LIFE. MULTIPLE ADMINISTRATIVE OPINIONS.'},
  stat:{x:1,y:3,label:'Stat Generator',kind:'object',description:'One intake assessment. Resonance and a trait go on your case file. Destinations remain the Case Worker’s department.'},
  rolodex:{x:6,y:3,label:'Afterlife Rolodex',kind:'object',description:'Memory Annex. Present Hall. The destination cards wait for an approved case file.'},
  exit:{x:4,y:1,label:'Placement Door',kind:'object',description:'The Placement Door remains closed until the Hallway attendant calls the next intake group.'}
 }),
 npcs:Object.freeze({caseworker:{x:4,y:2,label:'Case Worker',kind:'npc'}})
});
export const PLACEMENTS=Object.freeze({memory:'Memory Annex',present:'Present Hall'});
export const ITEMS=Object.freeze({'case-file':'Billy’s case file','queue-ticket':'Intake queue ticket','placement-pass':'Placement pass'});
export const TOPICS=Object.freeze(['introduction','placement','cabinet','glitch']);
export function assessmentFor(roll){
 return {resonance:roll,trait:roll>=15?'Echo Attuned':roll>=8?'Pattern Seeker':'Grounded',glitchInsight:roll>=15?1:0};
}
