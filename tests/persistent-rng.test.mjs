import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPersistentRng,seedFromString} from '../gateway/persistent-rng.mjs';
const original=readFileSync('/srv/ACOS/workspaces/ascension/app/js/systems/rng.js','utf8');
const recovered=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(original));
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
