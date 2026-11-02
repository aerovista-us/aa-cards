import test from 'node:test';import assert from 'node:assert/strict';
import {createRecoveredGenericEcho} from '../gateway/recovered-echo-creation.mjs';
const setup=()=>({turn:4,currentWorld:'AFTERLIFE',storyMemory:{pendingEchoes:[]}});
test('generic delayed echo uses two draws, carries source and scheduled turn',()=>{
 let draws=0;const s=setup();const echo=createRecoveredGenericEcho(s,{id:'observe.strange_note',label:'Strange note',tags:['story']},{id:'read',label:'Read note'},{timeline:0},{timeline:1},{next(){draws++;return 0.3}});
 assert.equal(draws,2);assert.equal(echo.dueTurn,6);assert.equal(echo.sourceChoiceId,'read');assert.equal(s.storyMemory.pendingEchoes.length,1);
});
test('duplicate generic echoes consume delay draw but not ID draw',()=>{
 let draws=0;const s=setup();const story={id:'observe.strange_note',tags:['story']},choice={id:'read'};
 const rng={next(){draws++;return .5}};
 createRecoveredGenericEcho(s,story,choice,{},{timeline:1},rng);
 assert.equal(createRecoveredGenericEcho(s,story,choice,{},{timeline:1},rng),null);
 assert.equal(draws,3);
});
test('specialized stories fail closed pending full parity',()=>{
 const s=setup();assert.throws(()=>createRecoveredGenericEcho(s,{id:'office.intake_briefing',tags:['onboarding']},{id:'acknowledge'},{},{},{next:()=>.2}),/Specialized canonical/);
});
test('repeatable non-NPC and source echoes do not queue',()=>{
 const s=setup(),rng={next(){throw Error('should not roll')}};
 assert.equal(createRecoveredGenericEcho(s,{id:'observe.rest',tags:['repeatable']},{id:'rest'},{},{},rng),null);
 assert.equal(createRecoveredGenericEcho(s,{id:'echo.123',tags:['echo']},{id:'reply'},{},{},rng),null);
});
