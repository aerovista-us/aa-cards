// Independent, read-only capture of the recovered game's actual browser state.
// This launches a browser against an operator-supplied localhost static origin.
// It does NOT perform gameplay actions, call saveRun, or write a player database.
// Usage: PLAYWRIGHT_MODULE_PATH=/path/to/playwright node scripts/capture-recovered-browser.mjs
// Optional: RECOVERED_URL=http://127.0.0.1:18763/ RECOVERED_CAPTURE_PATH=/tmp/baseline.json
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const url=process.env.RECOVERED_URL||'http://127.0.0.1:18763/';
const target=process.env.RECOVERED_CAPTURE_PATH||'/tmp/aa-recovered-browser-baseline.json';
const modulePath=process.env.PLAYWRIGHT_MODULE_PATH;
if(!modulePath)throw Error('PLAYWRIGHT_MODULE_PATH is required; no implicit dependency installs');
const parsed=new URL(url);
if(!['127.0.0.1','localhost'].includes(parsed.hostname))throw Error('Only isolated localhost recovered app is allowed');
if(!target.startsWith('/tmp/'))throw Error('Only temporary capture output under /tmp/ is allowed');
const {chromium}=require(modulePath);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__ASCENSION_APP__?.state?.snapshot && !!window.__ASCENSION_APP__?.captureMapSnapshot,{timeout:15000});
 // Wait for main-menu UI initialization: no input or account interaction.
 await page.waitForFunction(()=>window.__ASCENSION_APP__.mainMenuOpen===true,{timeout:15000});
 const snapshot=await page.evaluate(()=>{
  const app=window.__ASCENSION_APP__;
  return {state:app.state.snapshot(),map:structuredClone(app.captureMapSnapshot())};
 });
 if(!snapshot.state||!snapshot.map)throw Error('Recovered snapshot missing state/map');
 const payload={provenance:{source:'independent-recovered-browser',checkpoint:'initial-main-menu',url:parsed.origin,viewport:{width:390,height:844},captureTime:new Date().toISOString(),sourceSha256:process.env.RECOVERED_SOURCE_SHA256||null},...snapshot,pageErrors:errors};
 await fs.writeFile(target,JSON.stringify(payload,null,2),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({capture:target,sha256:crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),world:snapshot.state.currentWorld,turn:snapshot.state.turn,tiles:snapshot.map?.grid?.length??null,pageErrors:errors.length}));
 if(errors.length)process.exitCode=1;
} finally {await browser.close()}
