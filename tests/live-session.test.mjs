import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The Cards repo serves browser modules on static Pages; load the two dependencies
// as data URLs to test without changing the existing production module configuration.
const remote = readFileSync(new URL('../js/game-frame/remote-api.js', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../js/game-frame/scene-cards.js', import.meta.url), 'utf8');
let controller = readFileSync(new URL('../js/game-frame/live-session.js', import.meta.url), 'utf8');
const data = s => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(s);
controller=controller.replace("'./remote-api.js'",JSON.stringify(data(remote)))
  .replace("'./scene-cards.js'",JSON.stringify(data(scene)));
const {createCardsSessionController}=await import(data(controller));
const visible = (revision=0) => ({sessionId:'run-1',revision,state:{scene:{id:'hallway',kind:'decision',title:'Hallway',body:'Choose your path',choices:[{id:'left',label:'Left door',enabled:true},{id:'right',label:'Right door',enabled:false}]}}});
test('loads server-visible cards and submits revision to authoritative API', async()=>{
  const calls=[];
  const app=createCardsSessionController({apiOrigin:'https://game.example.com', remote:{
    requestGameState:async()=>visible(),
    submitGameChoice:async(_api,payload)=>{calls.push(payload);return visible(1)}
  }});
  assert.equal((await app.load()).game.revision,0);
  await assert.rejects(app.choose('right'),{code:'choice_unavailable'});
  assert.equal((await app.choose('left')).game.revision,1);
  assert.deepEqual(calls,[{sessionId:'run-1',storyletId:'hallway',choiceId:'left',revision:0}]);
});
test('rejects unauthenticated load and leaves no playable state',async()=>{
 const app=createCardsSessionController({apiOrigin:'https://game.example.com',remote:{requestGameState:async()=>{throw Error('Game session unavailable (401)')}}});
 await assert.rejects(app.load(),{code:'sign_in_required'});
 assert.equal(app.getSnapshot().game,null);
});
test('stale revision is not replayed and clears old choices until refresh',async()=>{
 let sends=0;const app=createCardsSessionController({apiOrigin:'https://game.example.com',remote:{
  requestGameState:async()=>visible(2),submitGameChoice:async()=>{sends++;throw Error('Game changed: refresh current session before choosing')}
 }});
 await app.load();
 await assert.rejects(app.choose('left'),{code:'stale_revision'});
 assert.equal(app.getSnapshot().game,null);
 await assert.rejects(app.choose('left'),{code:'game_not_ready'});
 assert.equal(sends,1);
});
test('prevents concurrent double submissions',async()=>{
 let done;const pending=new Promise(resolve=>done=resolve);let sends=0;
 const app=createCardsSessionController({apiOrigin:'https://game.example.com',remote:{
  requestGameState:async()=>visible(),submitGameChoice:async()=>{sends++;await pending;return visible(1)}
 }});
 await app.load();const first=app.choose('left');
 await assert.rejects(app.choose('left'),{code:'request_in_progress'});
 done();await first;assert.equal(sends,1);
});
