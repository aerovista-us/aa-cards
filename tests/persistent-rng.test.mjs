import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistentRng,seedFromString} from '../gateway/persistent-rng.mjs';
// Reference algorithm transcribed unchanged from recovered js/systems/rng.js.
const recovered={seedFromString(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return h>>>0},makeRNGFromSeed(seed){let a=seed>>>0;return ()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296}}};
test('matches recovered Ascension RNG over 200 draws',()=>{
 const seed='Billy-Restored-Run';
 assert.equal(seedFromString(seed),recovered.seedFromString(seed));
 const expected=recovered.makeRNGFromSeed(recovered.seedFromString(seed));
 const actual=createPersistentRng({seedString:seed,rngDraws:0});
 for(let i=0;i<200;i++) assert.equal(actual.next(),expected());
 assert.equal(actual.checkpoint().rngDraws,200);
});
test('restart resumes exact next roll rather than replaying seed',()=>{
 const a=createPersistentRng({seedString:'Billy-Restored-Run',rngDraws:0});
 for(let i=0;i<37;i++) a.next();
 const snapshot=JSON.parse(JSON.stringify(a.checkpoint()));
 const b=createPersistentRng(snapshot);
 for(let i=0;i<100;i++) assert.equal(a.next(),b.next());
});
test('invalid or client-like checkpoint is rejected',()=>{
 assert.throws(()=>createPersistentRng({seedString:'x',rngDraws:-1}),TypeError);
 assert.throws(()=>createPersistentRng({seedString:'x',rngDraws:1.5}),TypeError);
});
