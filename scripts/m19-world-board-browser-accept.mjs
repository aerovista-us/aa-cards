#!/usr/bin/env node
// M19 isolated browser acceptance. Do not point at production or claim AVCC save acceptance.
// Usage: PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright M19_TEST_URL=http://127.0.0.1:18871/world-board/ node scripts/m19-world-board-browser-accept.mjs
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const modulePath=process.env.PLAYWRIGHT_MODULE_PATH;
const url=process.env.M19_TEST_URL;
if(!modulePath||!url)throw Error('PLAYWRIGHT_MODULE_PATH and M19_TEST_URL required');
const parsed=new URL(url);
if(!['localhost','127.0.0.1'].includes(parsed.hostname))throw Error('Isolated local URL required');
const {chromium}=require(modulePath);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(5000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.evaluate(()=>localStorage.clear());
 await page.reload({waitUntil:'networkidle'});
 for(let i=0;i<3;i++)await page.locator('#east').click();
 await page.getByRole('button',{name:'cabinet',exact:true}).click();
 await page.getByRole('button',{name:'Open cabinet'}).click();
 await page.locator('#east').click();
 await page.getByRole('button',{name:'Case Worker'}).click();
 await page.getByRole('button',{name:'Ask about cabinet'}).click();
 const before=await page.locator('#dialogue').innerText();
 assert.match(before,/You opened that/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ascension:m19:office:v1')));
 assert.equal(saved.objectState.cabinet.open,true);
 assert.deepEqual(saved.npcMemory.caseworker.topics,['cabinet']);
 const revision=saved.revision;
 await page.reload({waitUntil:'networkidle'});
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ascension:m19:office:v1')));
 assert.deepEqual(restored,saved);
 await page.getByRole('button',{name:'Case Worker'}).click();
 await page.getByRole('button',{name:'Ask about cabinet'}).click();
 const after=await page.locator('#dialogue').innerText();
 assert.equal(after,before);
 assert.equal((await page.locator('#status').innerText()).includes('Revision '+(revision+1)),true);
 assert.deepEqual(errors,[]);
 console.log('PASS M19 isolated browser: move → open → NPC remembers → reload → same world, 0 page errors');
}finally{await browser.close();}
