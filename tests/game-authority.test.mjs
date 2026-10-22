import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthoritativeGameGateway, validateChoice} from '../gateway/game-authority.mjs';

function setup() {
  let revisions=0, calls=0;
  const services={
    resolveIdentity: async req => req.user ? {subject:req.user} : null,
    canPlay: async identity => identity.subject !== 'banned',
    loadOwnedRun: async (identity, id) =>
      identity.subject === 'alice' && (!id || id === 'run-1')
        ? {id:'run-1',revision:revisions} : null,
    executeChoice: async (_identity, run, input) => {
      calls++;
      if (input.storyletId !== 'start' || input.choiceId !== 'go') return null;
      revisions++;
      return {id:run.id,revision:revisions};
    },
    presentState: async (_identity, run) => ({sessionId:run.id,revision:run.revision,state:{storylet:'start'}})
  };
  return {services, get calls(){return calls}};
}
test('validates browser input and never accepts arbitrary revision',()=>{
  assert.throws(()=>validateChoice({sessionId:'s',storyletId:'start',choiceId:'go',expectedRevision:-1}),{status:422});
  assert.throws(()=>validateChoice({sessionId:'s',storyletId:'start',choiceId:'go',expectedRevision:0.5}),{status:422});
  assert.deepEqual(validateChoice({sessionId:'s',storyletId:'start',choiceId:'go',expectedRevision:0}).expectedRevision,0);
});
test('rejects missing authentication, missing grants and wrong owner before executing choice',async()=>{
  const s=setup(), gateway=createAuthoritativeGameGateway(s.services);
  const body={sessionId:'run-1',storyletId:'start',choiceId:'go',expectedRevision:0};
  await assert.rejects(gateway.choice({},body),{status:401});
  await assert.rejects(gateway.choice({user:'banned'},body),{status:403});
  await assert.rejects(gateway.choice({user:'bob'},body),{status:404});
  assert.equal(s.calls,0);
});
test('reads and commits server state, rejects replay and stale revisions',async()=>{
  const s=setup(), gateway=createAuthoritativeGameGateway(s.services);
  const request={user:'alice'};
  assert.equal((await gateway.session(request)).revision,0);
  const body={sessionId:'run-1',storyletId:'start',choiceId:'go',expectedRevision:0};
  assert.equal((await gateway.choice(request,body)).revision,1);
  await assert.rejects(gateway.choice(request,body),{status:409});
  assert.equal(s.calls,1);
  assert.equal((await gateway.session(request)).revision,1);
});
test('refuses to initialize without required enforcement dependencies',()=>{
  assert.throws(()=>createAuthoritativeGameGateway({}),/Missing game gateway dependency/);
});
