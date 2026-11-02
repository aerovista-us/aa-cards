import test from 'node:test';
import assert from 'node:assert/strict';

// Regression for the original crash:
// class AfterlifeScene extends window.Phaser.Scene was evaluated before
// the async CDN loader populated window.Phaser, so boot threw at module eval.
test('scene is constructed only after the Phaser CDN is loaded',async()=>{
 let constructed=null, loadCalls=0;
 const elements=new Map();
 const mockElement=()=>({
   hidden:false, textContent:'', classList:{add(){}},
   addEventListener(){}, remove(){}, querySelector(){return null;}
 });
 globalThis.window={};
 class Scene {
   constructor(key){this.key=key;}
 }
 const Phaser={
   Scene,
   AUTO:'AUTO',
   Scale:{FIT:'FIT',CENTER_BOTH:'CENTER_BOTH'},
   Game:class {constructor(config){constructed=config;}}
 };
 globalThis.document={
   getElementById(id){if(!elements.has(id))elements.set(id,mockElement());return elements.get(id);},
   querySelectorAll(){return [];},
   createElement(tag){assert.equal(tag,'script');return mockElement();},
   head:{appendChild(script){
     loadCalls++;
     assert.match(script.src,/phaser\/4\.2\.1|phaser@4\.2\.1/);
     queueMicrotask(()=>{window.Phaser=Phaser;script.onload();});
   }}
 };
 // Import starts before the async script completes.
 await import('./game.mjs');
 assert.equal(loadCalls,1);
 assert.ok(constructed,'Phaser game must start after library load');
 assert.ok(constructed.scene[0].prototype instanceof Scene);
 assert.equal(elements.get('loading').hidden,true);

 // The first implementation moved the sprite horizontally only, even when
 // state and walk-path advanced along the Y axis.
 const Subject=constructed.scene[0];
 const subject=new Subject();
 const tweens=[];
 subject.path=[{x:4,y:3}];
 subject.tweens={add(config){
   tweens.push(config);
   if(config.onComplete)config.onComplete();
 }};
 subject.onArrival=()=>{};
 subject.advance();
 assert.equal(tweens.length,3);
 assert.ok(tweens.every(t=>typeof t.x==='number'&&typeof t.y==='number'));
 const y=tweens.map(t=>t.y);
 assert.deepEqual(y,[41+3*74+37+18,41+3*74+37+35,41+3*74+37]);
});
