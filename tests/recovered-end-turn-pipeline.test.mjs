import test from 'node:test';import assert from 'node:assert/strict';
import {simulateRecoveredEndTurn as turn} from '../gateway/recovered-end-turn-pipeline.mjs';
const saved=()=>({seedString:'m18-turn',rngDraws:0,currentWorld:'AFTERLIFE',turn:2,maxActionPoints:4,actionPoints:0,heat:2,cooldowns:{a:2},npcs:{},consequences:{timeline:0},storyMemory:{pendingEchoes:[],worldTaskBoard:{AFTERLIFE:{key:'k',tasks:[{id:'x',x:0,y:0,mobility:'static'}]}}},worldMap:{tiles:[{spawns:[]}]}});
const opts={inBounds:()=>true,syncTaskMarkers:()=>{},noteTurn:()=>{}};
test('provisional turn advances and persists RNG checkpoint',()=>{const s=saved(),r=turn(s,opts);assert.equal(r.state.turn,3);assert.equal(r.state.actionPoints,4);assert.equal(r.state.cooldowns.a,1);assert.ok(r.state.rngDraws>=1);assert.equal(s.turn,2);});
test('turn fails closed on active cutscene',()=>assert.throws(()=>turn(saved(),{...opts,ui:{cutsceneOpen:true}}),/turn_blocked/));
test('turn requires active board, world map and callbacks',()=>{const s=saved();delete s.storyMemory.worldTaskBoard.AFTERLIFE;assert.throws(()=>turn(s,opts),/Canonical active board/);assert.throws(()=>turn(saved(),{}),/Canonical map bounds/);});
