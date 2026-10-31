import test from 'node:test';import assert from 'node:assert/strict';
import {createBoundedRecoveredTaskRuntime} from '../gateway/recovered-task-runtime-composition.mjs';
function db(){
 let saved={id:'run',owner_subject:'alice',revision:0,state:{seedString:'example',rngDraws:0,currentWorld:'AFTERLIFE',pos:{x:0,y:0},turn:2,flags:{officeOnboardComplete:false},maxActionPoints:4,actionPoints:2,storyMemory:{worldTaskBoard:{AFTERLIFE:{tasks:[{id:'desk',x:0,y:0,planned:true,order:0,required:true,completed:false}]}}},worldMap:{width:1,height:1,tiles:[{spawns:[]}]}}},draft;
 const pool={async connect(){return {async query(sql,args){if(sql==='BEGIN'){draft=structuredClone(saved);return {rows:[]}}if(sql==='ROLLBACK'){draft=null;return {rows:[]}}if(sql==='COMMIT'){saved=draft;draft=null;return {rows:[]}}if(sql.startsWith('SELECT'))return {rows:[structuredClone(draft)]};if(sql.startsWith('UPDATE')){draft.state=JSON.parse(args[0]);draft.revision++;return {rows:[structuredClone(draft)]}}throw Error(sql)},release(){}}}};
 return {pool,get:()=>saved};
}
const config=pool=>({pool,authorizeChapter:async()=>true,library:[{id:'desk',label:'Intake',tags:['onboarding']}],currentCellKey:()=> 'AFTERLIFE:0:0',syncTaskMarkers:s=>{s.worldMap.tiles[0].markersSynced=true},logEvent:(s,t)=>{(s.eventLog??=[]).push(t)},noteTurn:(s,...args)=>{(s.turnNotes??=[]).push(args)}});
test('composed owner transaction persists task, marker and AP reward atomically',async()=>{
 const d=db(),runtime=createBoundedRecoveredTaskRuntime(config(d.pool));
 const res=await runtime.completeTask({subject:'alice'},'run',{storyletId:'desk',expectedRevision:0});
 assert.equal(res.revision,1);assert.equal(d.get().state.storyMemory.worldTaskBoard.AFTERLIFE.tasks[0].completed,true);
 assert.equal(d.get().state.worldMap.tiles[0].markersSynced,true);assert.equal(d.get().state.actionPoints,3);
 assert.equal(d.get().state.storyMemory.cellActionLock.completedIds[0],'desk');
});
test('replay with stale revision cannot change saved state',async()=>{
 const d=db(),runtime=createBoundedRecoveredTaskRuntime(config(d.pool));
 await runtime.completeTask({subject:'alice'},'run',{storyletId:'desk',expectedRevision:0});
 const snapshot=structuredClone(d.get());
 await assert.rejects(runtime.completeTask({subject:'alice'},'run',{storyletId:'desk',expectedRevision:0}),e=>e.status===409);
 assert.deepEqual(d.get(),snapshot);
});
