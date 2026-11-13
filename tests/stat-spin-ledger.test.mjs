import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatSpinLedger,restoreStatSpinLedger,enterOfficeVisit,awardEarnedSpin,consumeStatSpin} from '../gateway/stat-spin-ledger.mjs';

const initial=()=>createStatSpinLedger('office-visit-1');
test('one free use per distinct authorized Office visit; repeated entry does not reset it',()=>{
 const first=initial();
 const once=consumeStatSpin(first);
 assert.equal(once.source,'free');assert.equal(once.ledger.freeUsedCount,1);
 assert.equal(first.freeUsed,false,'pure transition must not mutate caller');
 assert.throws(()=>consumeStatSpin(once.ledger),/no_spins_available/);
 const retry=enterOfficeVisit(once.ledger,'office-visit-1');
 assert.deepEqual(retry,once.ledger,'same event cannot create a second free spin');
 assert.throws(()=>enterOfficeVisit(retry,'bad?'),/invalid_spin_ledger/);
 const newVisit=enterOfficeVisit(retry,'office-visit-2');
 assert.equal(newVisit.freeUsed,false);
 assert.equal(consumeStatSpin(newVisit).source,'free');
 assert.throws(()=>enterOfficeVisit(newVisit,'office-visit-1'),/visit_replay_or_limit/);
});
test('earned spin award is idempotent and credits archive until explicitly spent',()=>{
 let ledger=initial();
 ledger=consumeStatSpin(ledger).ledger;
 const credit=awardEarnedSpin(ledger,'quest-milestone-1');
 assert.equal(credit.credited,true);ledger=credit.ledger;
 assert.equal(ledger.banked,1);
 const replay=awardEarnedSpin(ledger,'quest-milestone-1');
 assert.equal(replay.credited,false);assert.deepEqual(replay.ledger,ledger);
 ledger=enterOfficeVisit(ledger,'office-visit-2');
 assert.equal(ledger.banked,1,'free visit does not consume stored credit');
 const free=consumeStatSpin(ledger);assert.equal(free.source,'free');
 const paid=consumeStatSpin(free.ledger);assert.equal(paid.source,'banked');
 assert.equal(paid.ledger.banked,0);assert.equal(paid.ledger.bankedUsedCount,1);
 assert.throws(()=>consumeStatSpin(paid.ledger),/no_spins_available/);
 const restored=restoreStatSpinLedger(JSON.stringify(paid.ledger));
 assert.deepEqual(restored,paid.ledger);
 assert.equal(awardEarnedSpin(restored,'quest-milestone-1').credited,false);
});
test('spin ledger has no placement, trait, RNG or earned-award authority',()=>{
 const ledger=createStatSpinLedger('approved-event');
 assert.equal('placement' in ledger,false);
 assert.equal('resonance' in ledger,false);
 assert.equal('rng' in ledger,false);
 assert.equal('stat' in ledger,false);
 const spun=consumeStatSpin(ledger);
 assert.equal('outcome' in spun,false);
 assert.throws(()=>restoreStatSpinLedger(JSON.stringify({...spun.ledger,placement:'present'})),/invalid_spin_ledger/);
 assert.throws(()=>restoreStatSpinLedger(JSON.stringify({...spun.ledger,rng:{rngDraws:999}})),/invalid_spin_ledger/);
 assert.throws(()=>restoreStatSpinLedger(JSON.stringify({...spun.ledger,earnedAwardIds:['forged'],banked:0})),/invalid_spin_ledger/);
});
test('tampered, malformed and exhausted ledgers reject before any credit is consumed',()=>{
 const valid=initial();
 for(const forged of [null,[],{...valid,visits:[]},{...valid,visits:['office-visit-1','office-visit-1']},
  {...valid,currentVisitId:'wrong'},{...valid,freeUsedCount:2},{...valid,banked:1},
  {...valid,earnedAwardIds:['duplicate','duplicate'],banked:2},{...valid,bankedUsedCount:-1}])
  assert.throws(()=>restoreStatSpinLedger(JSON.stringify(forged)),/invalid_spin_ledger/);
 assert.throws(()=>restoreStatSpinLedger('{'),/invalid_spin_ledger/);
 let exhausted=valid;
 for(let i=2;i<=256;i++)exhausted=enterOfficeVisit(exhausted,'v'+i);
 assert.throws(()=>enterOfficeVisit(exhausted,'v257'),/visit_replay_or_limit/);
 let awards=valid;
 for(let i=1;i<=256;i++)awards=awardEarnedSpin(awards,'earned'+i).ledger;
 assert.throws(()=>awardEarnedSpin(awards,'earned257'),/award_limit_reached/);
});
