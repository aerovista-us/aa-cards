import test from 'node:test';import assert from 'node:assert/strict';
import {toRecoveredSavedMap,fromRecoveredSavedMap} from '../gateway/recovered-save-map-bridge.mjs';
import {buildRecoveredWorldMap} from '../gateway/recovered-map-builder.mjs';
const world={id:'AFTERLIFE',map:{shape:'office',w:12,h:10},tags:['clerks','rest','archive']};
test('canonical generated tiles and world profile round-trip original save map with no field loss',()=>{
 const state=buildRecoveredWorldMap({seedString:'original-bridge',rngDraws:5,pos:{x:0,y:0}},world);
 const saved=toRecoveredSavedMap(state.worldMap);
 assert.deepEqual(Object.keys(saved).sort(),['grid','h','w','worldProfile']);
 assert.deepEqual(fromRecoveredSavedMap(saved),{width:state.worldMap.width,height:state.worldMap.height,tiles:state.worldMap.tiles,worldProfile:state.worldMap.worldProfile});
 assert.deepEqual(saved.grid,state.worldMap.tiles);
});
test('reject missing dimensions, cells and profile rather than invent values',()=>{
 assert.throws(()=>toRecoveredSavedMap({width:1,height:1,tiles:[{}]}),/Complete/);
 assert.throws(()=>fromRecoveredSavedMap({w:2,h:2,grid:[{}],worldProfile:{}}),/Complete/);
});
test('render-only overlays are never written into original saved map payload',()=>{
 const s=buildRecoveredWorldMap({seedString:'overlay',rngDraws:5,pos:{x:0,y:0}},world);
 s.worldMap.taskMarkers=[{x:0,y:0}];s.worldMap.prerequisiteTarget={x:0,y:0};
 const original=toRecoveredSavedMap(s.worldMap);
 assert.equal('taskMarkers' in original,false);assert.equal('prerequisiteTarget' in original,false);
});
