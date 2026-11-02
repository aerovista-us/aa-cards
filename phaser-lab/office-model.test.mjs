import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICE,START,FIXTURES,cellEnabled,findPath,neighbors,same} from './office-model.mjs';
test('source-derived 9x7 office walkability',()=>{
  assert.equal(OFFICE.width,9);assert.equal(OFFICE.height,7);
  assert.equal(cellEnabled(4,4),true);
  assert.equal(cellEnabled(0,0),false);
  assert.equal(cellEnabled(8,6),false);
  assert.equal(cellEnabled(3,1),true);
  assert.equal(cellEnabled(2,1),false);
});
test('route stays cardinal and never crosses obstacles',()=>{
 for(const target of FIXTURES) {
  const path=findPath(START,target);
  assert.ok(path.length>0,'reachable: '+target.id);
  let prev=START;
  for(const point of path){
   assert.equal(cellEnabled(point.x,point.y),true);
   assert.equal(Math.abs(prev.x-point.x)+Math.abs(prev.y-point.y),1);
   prev=point;
  }
  assert.ok(same(prev,target));
 }
});
test('rejects invalid tiles and exposes legal neighbors',()=>{
  assert.deepEqual(findPath(START,{x:-1,y:0}),[]);
  assert.deepEqual(findPath({x:99,y:99},START),[]);
  assert.ok(neighbors(4,4).every(p=>cellEnabled(p.x,p.y)));
});
