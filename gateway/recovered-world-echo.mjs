// Source-derived state-only operations from recovered Ascension v4 app.js.
// Not a complete choice executor: world map, spawning, NPC memory and the
// interactive turn lifecycle must still be integrated before enabling play.
export function unlockRecoveredWorlds(s) {
 const flags=s.flags||{}, quests=s.quests||{}, progress=s.progress||{}, arc=s.arc||{}, c=s.consequences||{};
 const candidates=[
 ['ARCHIVE',(progress.veil||0)>=2||(quests.council||0)>=1||flags.billyPath==='memory'],
 ['BLACK_MARKET',!!flags.mainIntroQuestComplete||(quests.exiles||0)>=1||flags.billyPath==='present'],
 ['ODDWYN',(c.exiles||0)>=3||(quests.exiles||0)>=1||!!flags.jinxCompassStage1],
 ['RIFT',(c.timeline||0)>=3||(progress.executor||0)>=2||!!flags.jinxCompassStage2],
 ['MYSTARA',s.currentWorld==='ODDWYN'||(quests.exiles||0)>=2||(arc.reckoning||0)>=3],
 ['EARTH_ECHO',!!flags.bookCandidates?.earth?.billys_apartment||!!flags.bookCandidates?.earth?.construction_site||(s.currentWorld==='ARCHIVE'&&(arc.reckoning||0)>=2)]
 ];
 s.unlockedWorlds??=[];
 for(const [world,condition] of candidates) if(condition&&!s.unlockedWorlds.includes(world)) s.unlockedWorlds.push(world);
 return s.unlockedWorlds;
}
export function resolveRecoveredEcho(s,storyletId) {
 if(!String(storyletId||'').startsWith('echo.')) return false;
 const pending=s.storyMemory?.pendingEchoes||[];
 const hit=pending.find(e=>e.id===storyletId&&!e.resolved);
 if(!hit) return false;
 hit.resolved=true;hit.resolvedTurn=Number(s.turn||0);return true;
}
export function advanceRecoveredEchoes(s) {
 const pending=s.storyMemory?.pendingEchoes||[];
 let surfaced=0;
 for(const echo of pending) {
  if(echo.resolved||Number(s.turn||0)<Number(echo.dueTurn||0)||echo.announced) continue;
  echo.announced=true;surfaced++;
 }
 if(s.storyMemory) s.storyMemory.pendingEchoes=pending.filter(e=>!(e.resolved&&Number(s.turn||0)-Number(e.resolvedTurn||0)>5)).slice(-24);
 return surfaced;
}
export function recoveredAftershock(s,rng,{storyInfluenceEnabled=true,ending=false,cutscene=false}={}) {
 if(!storyInfluenceEnabled||ending||cutscene) return [];
 const events=[],roll=()=>rng.next();
 const inc=(key,value)=>{s[key]=Number(s[key]||0)+value};
 const pressure=Number(s.heat||0)+Math.max(0,Number(s.consequences?.timeline||0)*0.35);
 if(roll()<Math.min(0.7,0.12+pressure*0.04)){s.consequences??={};s.consequences.timeline=Number(s.consequences.timeline||0)+1;events.push('timeline')}
 else if(roll()<0.18){inc('heat',-0.3);events.push('pressure')}
 if((s.npcs?.jinx||0)>0&&roll()<0.28){s.inventory??={};s.inventory.Clue=Number(s.inventory.Clue||0)+1;events.push('jinx')}
 if((s.npcs?.caseworker||0)<0&&roll()<0.34){s.consequences??={};s.consequences.council=Number(s.consequences.council||0)+1;events.push('caseworker')}
 if((s.npcs?.nyx||0)<0&&roll()<0.3){inc('heat',1);events.push('nyx')}
 return events;
}
