import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve('phaser-lab');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/phaser-lab\/?/,'')||'index.html';
    if(name.includes('..')||name.includes('\\')){res.writeHead(403).end();return;}
    const file=path.join(root,name);
    const buf=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(buf);
  }catch{res.writeHead(404).end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto('http://127.0.0.1:'+port+'/phaser-lab/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelector('#loading')?.hidden===true&&!!document.querySelector('#game canvas'),{timeout:45000});
  assert.equal(await page.locator('#game canvas').count(),1,'Phaser must render a canvas');
  assert.equal(await page.locator('#steps').innerText(),'0');
  assert.equal(await page.locator('#objective-summary').innerText(),'0 / 4 resolved');
  assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');

  // Keyboard/touch-equivalent control moves vertically, and after another
  // step Billy should trigger the Case Worker dialogue station.
  await page.locator('[data-move="up"]').click();
  await page.waitForFunction(()=>Number(document.querySelector('#steps')?.textContent)>=1,{timeout:10000});
  await page.locator('[data-move="up"]').click();
  await page.waitForFunction(()=>document.querySelector('#story-panel')?.hidden===false,{timeout:10000});
  assert.match(await page.locator('#panel-title').innerText(),/expecting you/i);
  await page.getByRole('button',{name:'Ask for authorized placements'}).click();
  assert.equal(await page.locator('#story-panel').evaluate(e=>e.hidden),true);
  assert.equal(await page.locator('#task-caseworker').getAttribute('data-complete'),'true');
  assert.equal(await page.locator('#objective-summary').innerText(),'1 / 4 resolved');
  await mkdir('phaser-lab/artifacts',{recursive:true});
  await page.screenshot({path:'phaser-lab/artifacts/office-v2.png',fullPage:true});
  await page.locator('#motion-toggle').click();
  assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'false');
  await page.locator('#motion-toggle').click();
  assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  await page.locator('#reset').click();
  assert.equal(await page.locator('#steps').innerText(),'0');
  assert.equal(await page.locator('#objective-summary').innerText(),'0 / 4 resolved');
  assert.equal(await page.locator('#task-caseworker').getAttribute('data-complete'),'false');
  const favicon=await page.request.get('http://127.0.0.1:'+port+'/phaser-lab/favicon.svg');
  assert.equal(favicon.status(),200);
  assert.deepEqual(errors,[],'No uncaught browser errors should occur');
  console.log('PASS: Afterlife V2 renders, D-pad moves, dialogue branches, objective state resets, ambient motion toggles, and favicon loads.');
}catch(e){
  console.error('Browser smoke failure:',String(e));
  throw e;
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
