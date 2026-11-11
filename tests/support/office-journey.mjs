import assert from 'node:assert/strict';
import {findOfficePath,nextOfficeMove} from '../../game/office-navigation.mjs';
import {applyWorldAction} from '../../gateway/world-interaction-engine.mjs';
import {projectWorldGame} from '../../gateway/world-game-view.mjs';
export function stateView(state){return projectWorldGame({subject:state.ownerId},{id:state.runId,revision:state.revision,state});}
export function walkState(state,target){
 const view=stateView(state),marker=typeof target==='string'?view.markers.find(m=>m.id===target):target;
 assert.ok(marker,'Known destination required');
 for(const point of findOfficePath(view,marker))state=applyWorldAction(state,{type:'move',dx:point.x-state.player.x,dy:point.y-state.player.y}).state;
 assert.deepEqual({x:state.player.x,y:state.player.y},{x:marker.x,y:marker.y});return state;
}
export function completeState(state,{placement='memory',resolution='report'}={}){
 const act=command=>{state=applyWorldAction(state,command).state;};
 act({type:'inspect',target:'notice'});
 state=walkState(state,'records');act({type:'take',target:'records'});
 state=walkState(state,'caseworker');act({type:'talk',target:'caseworker',topic:'introduction'});
 state=walkState(state,'stat');act({type:'use',target:'stat'});
 state=walkState(state,'caseworker');act({type:'talk',target:'caseworker',topic:'placement'});
 state=walkState(state,'rolodex');act({type:'choose',target:'rolodex',choice:placement});
 act({type:'inspect',target:'rolodex'});act({type:'choose',target:'glitch',choice:resolution});
 return state;
}
export async function walkClient(client,markerId){
 const target=client.snapshot().view.markers.find(m=>m.id===markerId);assert.ok(target);
 for(let i=0;i<128;i++){
  const current=client.snapshot();assert.equal(current.phase,'ready');
  if(current.view.player.x===target.x&&current.view.player.y===target.y)return;
  const action=nextOfficeMove(current.view,target);assert.ok(action,'Server must offer the next move');
  await client.act(action.id);
 }
 throw Error('Bounded Office path did not complete');
}
export async function completeClient(client,{placement='memory',resolution='report'}={}){
 await client.act('inspect-notice');
 await walkClient(client,'records');await client.act('take-records');
 await walkClient(client,'caseworker');await client.act('talk-introduction');
 await walkClient(client,'stat');await client.act('use-stat');
 await walkClient(client,'caseworker');await client.act('talk-placement');
 await walkClient(client,'rolodex');await client.act('choose-'+placement);
 await client.act('inspect-rolodex');await client.act('resolve-'+resolution);
 assert.equal(client.snapshot().phase,'ready');assert.equal(client.snapshot().view.mission.complete,true);
}
