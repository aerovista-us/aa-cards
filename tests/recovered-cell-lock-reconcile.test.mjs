import test from 'node:test';import assert from 'node:assert/strict';
import {reconcileRecoveredCellLock as reconcile} from '../gateway/recovered-cell-lock-reconcile.mjs';
const c=()=>({state:{turn:3,storyMemory:{}},key:'A:1,2:3',tileTasks:[{id:'a',required:true},{id:'b',required:false}],readiness:()=>({ready:true}),renderStorylet:id=>({id,label:id}),hydrateLockedStorylets:ids=>ids.map(id=>({id,label:id}))});
test('new cell initializes canonical required ids and offered picks',()=>{const x=c(),r=reconcile(x);assert.deepEqual(r.lock.requiredIds,['a']);assert.deepEqual(r.lock.offeredIds,['a','b']);assert.equal(r.lock.lastUpdatedTurn,3);});
test('matching cell keeps live ready and removes completed',()=>{const x=c();reconcile(x);x.tileTasks[0].completed=true;const r=reconcile(x);assert.deepEqual(r.lock.offeredIds,['b']);assert.deepEqual(r.lock.requiredIds,[]);});
test('new cell resets lock including completions',()=>{const x=c();reconcile(x);x.state.storyMemory.cellActionLock.completedIds=['a'];x.key='B:1,2:3';assert.deepEqual(reconcile(x).lock.completedIds,[]);});
test('empty hydrated picks refreshes from canonical readiness',()=>{const x=c();reconcile(x);x.hydrateLockedStorylets=()=>[];assert.deepEqual(reconcile(x).lock.offeredIds,['a','b']);});
test('no authoritative task resolvers fails closed',()=>{const x=c();delete x.readiness;assert.throws(()=>reconcile(x),/Canonical readiness/);});
