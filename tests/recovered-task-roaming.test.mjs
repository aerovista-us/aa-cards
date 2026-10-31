import test from 'node:test';
import assert from 'node:assert/strict';
import {moveRecoveredRoamingTasks as move} from '../gateway/recovered-task-roaming.mjs';
const fixture=(board,seq=[])=>{
 let i=0,sync=0,notes=[];
 const args={board,turn:4,rand:()=>seq[i++]??0,inBounds:(x,y)=>x>=0&&x<3&&y>=0&&y<3,syncTaskMarkers:()=>sync++,noteTurn:(...x)=>notes.push(x)};
 return {args,counts:()=>({draws:i,sync,notes})};
};
test('empty board consumes zero RNG and does not sync',()=>{
 const f=fixture({tasks:[]});assert.equal(move(f.args),0);assert.deepEqual(f.counts(),{draws:0,sync:0,notes:[]});
});
test('completed and static actors remain untouched',()=>{
 const board={tasks:[{x:0,y:0,mobility:'roam',completed:true},{x:1,y:1,mobility:'static'}]};const f=fixture(board);
 assert.equal(move(f.args),0);assert.equal(f.counts().draws,0);
});
test('single roaming actor moves with recovered shuffle and tracks cursor',()=>{
 const board={tasks:[{id:'npc',x:1,y:1,mobility:'roam'}]};const f=fixture(board,[0,0,0,0]);
 assert.equal(move(f.args),1);
 assert.deepEqual([board.tasks[0].x,board.tasks[0].y],[2,1]);
 assert.equal(f.counts().draws,4);assert.equal(f.counts().sync,1);
 assert.equal(board.lastRoamTurn,4);
 assert.equal(f.counts().notes[0][0],'npc');
});
test('immobile roaming actor still consumes original shuffle RNG',()=>{
 const board={tasks:[{x:0,y:0,mobility:'roam'}]};const f=fixture(board,[0,0,0,0]);
 f.args.inBounds=()=>false;
 assert.equal(move(f.args),0);assert.equal(f.counts().draws,4);assert.equal(f.counts().sync,0);
});
test('missing canonical dependencies fail closed',()=>{
 assert.throws(()=>move({board:{tasks:[]},rand:()=>0,inBounds:()=>true}),/required/);
});
