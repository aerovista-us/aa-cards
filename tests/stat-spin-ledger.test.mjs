import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatSpinLedger,restoreStatSpinLedger,enterOfficeVisit,awardEarnedSpin,consumeStatSpin} from '../gateway/stat-spin-ledger.mjs';

const initial=()=>createStatSpinLedger('office-visit-1');
const restore=ledger=>restoreStatSpinLedger(JSON.stringify(ledger));
test('one free spin per authorized Office visit; idempotent use event cannot mint another',()=>{
 const first=initial();
 const once=consumeStatSpin(first,'spin-free-1');
 assert.equal(once.source,'free');assert.equal(once.consumed,true);
 assert.equal(once.ledger.freeUsedCount,1);
 assert.equal(first.freeUsed,false,'pure transition must not mutate caller');
 const replay=consumeStatSpin(once.ledger,'spin-free-1');
 assert.equal(replay.consumed,false);assert.equal(replay.source,'free');
 assert.deepEqual(replay.ledger,once.ledger);
 assert.throws(()=>consumeStatSpin(replay.ledger,'spin-free-2'),/no_spins_available/);
 const sameVisit=enterOfficeVisit(replay.ledger,'office-visit-1');
 assert.deepEqual(sameVisit,replay.ledger,'same visit cannot refill a free spin');
 const secondVisit=enterOfficeVisit(sameVisit,'office-visit-2');
 assert.equal(secondVisit.freeUsed,false);
 const second=consumeStatSpin(secondVisit,'spin-free-2');
 assert.equal(second.source,'free');assert.equal(second.ledger.freeUsedCount,2);
 assert.deepEqual(consumeStatSpin(second.ledger,'spin-free-1').ledger,second.ledger,
  'an old spin event cannot be spent again after a new visit');
 assert.throws(()=>enterOfficeVisit(second.ledger,'office-visit-1'),/visit_replay_or_limit/);
 assert.deepEqual(restore(second.ledger),second.ledger);
});
test('earned awards remain archived, replay idempotently, and banked spends cannot double-debit',()=>{
 let ledger=consumeStatSpin(initial(),'free-1').ledger;
 const award=awardEarnedSpin(ledger,'quest-milestone-1');
 assert.equal(award.credited,true);ledger=award.ledger;
 assert.equal(ledger.banked,1);
 const replayAward=awardEarnedSpin(ledger,'quest-milestone-1');
 assert.equal(replayAward.credited,false);assert.deepEqual(replayAward.ledger,ledger);
 ledger=enterOfficeVisit(ledger,'office-visit-2');
 assert.equal(ledger.banked,1,'banked credit survives new Office visit');
 const free=consumeStatSpin(ledger,'free-2');
 assert.equal(free.source,'free');assert.equal(free.ledger.banked,1);
 const paid=consumeStatSpin(free.ledger,'bank-spend-1');
 assert.equal(paid.source,'banked');assert.equal(paid.ledger.banked,0);
 assert.equal(paid.ledger.bankedUsedCount,1);
 assert.equal(consumeStatSpin(paid.ledger,'bank-spend-1').consumed,false);
 assert.deepEqual(consumeStatSpin(paid.ledger,'bank-spend-1').ledger,paid.ledger);
 assert.throws(()=>consumeStatSpin(paid.ledger,'bank-spend-2'),/no_spins_available/);
 assert.deepEqual(restore(paid.ledger),paid.ledger);
 assert.equal(awardEarnedSpin(restore(paid.ledger),'quest-milestone-1').credited,false);
});
test('separate ledger has no placement, trait, RNG, effect or outcome authority',()=>{
 const ledger=initial();
 for(const privateDomain of ['placement','resonance','rng','stat','outcome','glitchInsight'])
  assert.equal(Object.hasOwn(ledger,privateDomain),false);
 const use=consumeStatSpin(ledger,'spin-1');
 assert.equal(Object.hasOwn(use,'outcome'),false);
 assert.throws(()=>restore({...use.ledger,placement:'present'}),/invalid_spin_ledger/);
 assert.throws(()=>restore({...use.ledger,rng:{rngDraws:999}}),/invalid_spin_ledger/);
 assert.throws(()=>restore({...use.ledger,earnedAwardIds:['forged'],banked:0}),/invalid_spin_ledger/);
});
test('save validator detects inconsistent per-visit use history and forged totals',()=>{
 const base=initial();
 const used=consumeStatSpin(base,'free-1').ledger;
 const later=enterOfficeVisit(used,'office-visit-2');
 const laterUsed=consumeStatSpin(later,'free-2').ledger;
 const forged=[
  null,[],{...base,visits:[]},{...base,visits:['office-visit-1','office-visit-1']},
  {...base,currentVisitId:'wrong'},{...base,freeUsedCount:2},{...base,banked:1},
  {...base,earnedAwardIds:['duplicate','duplicate'],banked:2},{...base,bankedUsedCount:-1},
  {...used,freeUsed:false},{...used,freeUsedCount:0},{...used,spinUses:[]},
  {...used,spinUses:[...used.spinUses,{eventId:'free-2',visitId:'office-visit-1',source:'free'}]},
  {...later,freeUsed:true},{...later,freeUsedCount:0},
  {...laterUsed,spinUses:[...laterUsed.spinUses,{...laterUsed.spinUses[1]}]},
  {...laterUsed,spinUses:[laterUsed.spinUses[1],laterUsed.spinUses[0]]},
  {...laterUsed,spinUses:[{eventId:'free-1',visitId:'office-visit-2',source:'free'},laterUsed.spinUses[1]]},
  {...used,spinUses:[{eventId:'x',visitId:'fake-visit',source:'free'}]},
  {...used,spinUses:[{eventId:'x',visitId:'office-visit-1',source:'not-real'}]},
  // A forged banked spend cannot precede its visit's required free spin.
  {...awardEarnedSpin(base,'award-1').ledger,banked:0,bankedUsedCount:1,
   spinUses:[{eventId:'paid-1',visitId:'office-visit-1',source:'banked'}]},
  // Reusing the award event as a spin-use ID is invalid even if totals balance.
  {...consumeStatSpin(consumeStatSpin(awardEarnedSpin(base,'award-1').ledger,'free-1').ledger,'paid-1').ledger,
   spinUses:[{eventId:'free-1',visitId:'office-visit-1',source:'free'},
    {eventId:'award-1',visitId:'office-visit-1',source:'banked'}]},
 ];
 for(const item of forged)assert.throws(()=>restore(item),/invalid_spin_ledger/);
 assert.throws(()=>restoreStatSpinLedger('{'),/invalid_spin_ledger/);
 assert.throws(()=>consumeStatSpin(base,'bad?'),/invalid_spin_ledger/);
 assert.throws(()=>enterOfficeVisit(base,'bad?'),/invalid_spin_ledger/);
 assert.throws(()=>awardEarnedSpin(base,'bad?'),/invalid_spin_ledger/);
});
test('visits, spending and granting cannot reuse the same authoritative event ID',()=>{
 const awarded=awardEarnedSpin(initial(),'committed-evt').ledger;
 assert.throws(()=>consumeStatSpin(awarded,'committed-evt'),/event_id_collision/);
 assert.throws(()=>enterOfficeVisit(awarded,'committed-evt'),/event_id_collision/);
 const consumed=consumeStatSpin(initial(),'committed-evt').ledger;
 assert.throws(()=>awardEarnedSpin(consumed,'committed-evt'),/event_id_collision/);
 assert.throws(()=>enterOfficeVisit(consumed,'committed-evt'),/event_id_collision/);
 assert.throws(()=>consumeStatSpin(initial(),'office-visit-1'),/event_id_collision/);
 assert.throws(()=>awardEarnedSpin(initial(),'office-visit-1'),/event_id_collision/);
 assert.throws(()=>restore({...awarded,visits:['office-visit-1','committed-evt'],currentVisitId:'committed-evt'}),/invalid_spin_ledger/);
});
test('bounds never silently forget prior visit, award or spin-use event IDs',()=>{
 let visits=initial();
 for(let i=2;i<=256;i++)visits=enterOfficeVisit(visits,'v'+i);
 assert.throws(()=>enterOfficeVisit(visits,'v257'),/visit_replay_or_limit/);
 let awards=initial();
 for(let i=1;i<=256;i++)awards=awardEarnedSpin(awards,'earned'+i).ledger;
 assert.throws(()=>awardEarnedSpin(awards,'earned257'),/award_limit_reached/);
 let spends=consumeStatSpin(awards,'free-1').ledger;
 for(let i=1;i<=255;i++)spends=consumeStatSpin(spends,'spent'+i).ledger;
 assert.equal(spends.spinUses.length,256);
 assert.throws(()=>consumeStatSpin(spends,'spent256'),/spin_use_limit_reached/);
 assert.equal(consumeStatSpin(spends,'spent1').consumed,false);
 assert.deepEqual(restore(spends),spends);
});
