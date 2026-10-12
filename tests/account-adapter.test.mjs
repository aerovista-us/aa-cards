import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/game-frame/account-adapter.js',import.meta.url),'utf8');
const {buildAccountEntry,checkHandoffState,createAccountEntry}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));

test('handoff begins with registered-shape account URL, audience and callback',()=>{
  const result=buildAccountEntry({action:'login',origin:'https://aerovista-us.github.io',state:'unique-cryptographically-random-state-value'});
  const u=new URL(result.url);
  assert.equal(u.origin,'https://account.aerocoreos.com');
  assert.equal(u.searchParams.get('client_id'),'aa-cards');
  assert.equal(new URL(u.searchParams.get('return_to')).pathname,'/aa-cards/auth/callback/');
});
test('state check rejects mismatched and missing callbacks',()=>{
  assert.throws(()=>checkHandoffState('https://aerovista-us.github.io/aa-cards/auth/callback/?code=x&state=bad','expected'),/rejected/);
  assert.deepEqual(checkHandoffState('https://aerovista-us.github.io/aa-cards/auth/callback/?code=abc&state=good','good'),{code:'abc',next:'/aa-cards/'});
});
test('login cannot be invoked before backend exists',()=>{
 const client=createAccountEntry({origin:'https://aerovista-us.github.io'});
 assert.equal(client.available,false);
 assert.throws(()=>client.login(),/awaiting/);
});
