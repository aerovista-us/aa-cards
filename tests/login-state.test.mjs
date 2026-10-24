import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoginState} from '../gateway/login-state.mjs';
function harness(){
 const map=new Map();
 const store={put:async(k,v)=>{map.set(k,v)},consume:async k=>{const v=map.get(k);map.delete(k);return v}};
 return createLoginState({store});
}
test('login challenge is random, single-use and bound to internal continuation',async()=>{
 const svc=harness();
 const first=await svc.begin({next:'/play',intent:'login'});
 const second=await svc.begin({next:'/play',intent:'login'});
 assert.notEqual(first.state,second.state);
 assert.deepEqual(await svc.consume({state:first.state,expectedState:first.state}),{next:'/play',intent:'login'});
 await assert.rejects(svc.consume({state:first.state,expectedState:first.state}),/replayed/);
});
test('rejects wrong state and open redirect continuations',async()=>{
 const svc=harness();
 const start=await svc.begin({next:'//evil.example/',intent:'register'});
 assert.equal(start.next,'/');
 await assert.rejects(svc.consume({state:start.state,expectedState:'wrong'}),/Invalid login state/);
 assert.deepEqual(await svc.consume({state:start.state,expectedState:start.state}),{next:'/',intent:'register'});
});
test('fails closed without atomic state store',()=>{
 assert.throws(()=>createLoginState({store:{}}),/Atomic expiring/);
});
