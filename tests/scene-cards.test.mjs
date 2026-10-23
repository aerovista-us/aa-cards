import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSceneCard,projectVisibleGameScene,SCENE_KINDS} from '../js/game-frame/scene-cards.js';

test('provides all canonical opening presentation types without inventing mechanics',()=>{
  for(const kind of SCENE_KINDS) assert.equal(projectSceneCard({id:'opening',kind,body:'Visible scene'}).kind,kind);
});
test('rejects malformed actions and limits choice payload',()=>{
  assert.throws(()=>projectSceneCard({id:'x',choices:[{id:'?',label:'bad'}]}),/Invalid visible choice/);
  assert.throws(()=>projectSceneCard({id:'x',choices:Array.from({length:17},(_,i)=>({id:'a'+i,label:'choice'}))}),/Too many/);
});
test('retains only presentation fields, not hidden rules or outcomes',()=>{
  const card=projectSceneCard({id:'office',kind:'rolodex',title:'Placement',body:'Choose',secretSeed:'NO',hiddenOptions:['NO'],choices:[{id:'world_a',label:'World A',effects:{win:true},enabled:true}]});
  assert.equal(card.secretSeed,undefined);
  assert.equal(card.hiddenOptions,undefined);
  assert.equal(card.choices[0].effects,undefined);
  assert.equal(card.choices[0].enabled,true);
  assert.equal(Object.isFrozen(card.choices[0]),true);
});
test('requires server revision for the displayed card',()=>{
  assert.throws(()=>projectVisibleGameScene({sessionId:'run-1',revision:-1,state:{scene:{id:'office'}}}),/session/);
  const view=projectVisibleGameScene({sessionId:'run-1',revision:3,state:{scene:{id:'office',kind:'case-worker'}}});
  assert.equal(view.revision,3);assert.equal(view.scene.kind,'case-worker');
});
