// Isolated main-game browser proof, backed by disposable PostgreSQL and synthetic identity.
// Never loads NXCore credentials, mounts production routes or contacts live Account services.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {dirname,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOwnerWorldInteractionStore} from '../gateway/owner-world-interaction-store.mjs';
import {createWorldGameHandler} from '../gateway/world-game-handler.mjs';
import {projectWorldGame} from '../gateway/world-game-view.mjs';
if(process.env.ASCENSION_DISPOSABLE_PG!=='1'||process.env.PGHOST!=='127.0.0.1'||process.env.PGDATABASE!=='ascension_world_ci'||
 process.env.PGUSER!=='ascension_ci'||!process.env.WORLD_PG_MODULE_PATH||!process.env.OFFICE_PLAYWRIGHT_PATH||
 !process.env.OFFICE_PHASER_PATH||!process.env.OFFICE_ARTIFACT_DIR)throw Error('Explicit disposable browser configuration required');
const require=createRequire(import.meta.url),{Pool}=require(process.env.WORLD_PG_MODULE_PATH),{chromium}=require(process.env.OFFICE_PLAYWRIGHT_PATH);
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),gameRoot=resolve(root,'game'),pool=new Pool({max:5});
const owner={subject:'fixture-office-player'},csrf='fixture-office-only-csrf-123456789';
let active=true,handler,browser,server,uiServer,page,origin,uiOrigin;
const store=createOwnerWorldInteractionStore({pool,authorizeWorld:async identity=>identity.subject===owner.subject});
const adapter={auth:{resolveSession:async token=>({ok:true,authenticated:active&&token==='fixture-office-session',identityId:owner.subject})},
 identity:{describe:async()=>({ok:true,authenticated:active,identity:{identityId:owner.subject,status:'active'}})}};
try{
 await pool.query(await readFile(resolve(root,'gateway/migrations/001_player_runs.sql'),'utf8'));
 await pool.query('TRUNCATE ascension_player_runs');
 server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,origin).pathname;
   if(path==='/api/session'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':uiOrigin,'Access-Control-Allow-Credentials':'true'});
    res.end(JSON.stringify(active?{authenticated:true,identity:{id:owner.subject},csrf}:{authenticated:false,identity:null,csrf:null}));return;
   }
   if(await handler(req,res))return;
   if(req.method==='GET'&&path.startsWith('/game/')){
    const relative=decodeURIComponent(path.slice('/game/'.length))||'index.html';
    const file=resolve(gameRoot,relative),types={'.html':'text/html','.mjs':'application/javascript','.css':'text/css','.svg':'image/svg+xml'};
    if(!file.startsWith(gameRoot+sep)||!types[extname(file)]){res.writeHead(404);res.end();return;}
    let bytes=await readFile(file);
    if(extname(file)==='.html')bytes=Buffer.from(bytes.toString().replace('<head>','<head><meta name="ascension-api-origin" content="'+origin+'">'));
    res.writeHead(200,{'Content-Type':types[extname(file)],'Cache-Control':'no-store',
     // Synthetic loopback-only HTTP cookies. Not a live TLS/cookie acceptance claim.
     ...(extname(file)==='.html'?{'Set-Cookie':['ascension_avcc_session=fixture-office-session; Path=/; HttpOnly; SameSite=Lax','ascension_csrf='+csrf+'; Path=/; HttpOnly; SameSite=Lax']}: {})});
    res.end(bytes);return;
   }
   res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'not_found'}));
  }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'fixture_unavailable'}));}
 });
 server.requestTimeout=10000;server.listen(0,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:'+server.address().port;
 uiServer=createServer(server.listeners('request')[0]);uiServer.listen(0,'127.0.0.1');await once(uiServer,'listening');
 uiOrigin='http://127.0.0.1:'+uiServer.address().port;
 handler=createWorldGameHandler({adapter,store,appOrigin:origin,uiOrigin});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(20000);
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>requests.push({url:req.url(),method:req.method(),body:req.method()==='POST'?req.postData():null}));
 await page.route('**/phaser.min.js',route=>route.fulfill({path:process.env.OFFICE_PHASER_PATH,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'}}));
 const ready=()=>page.waitForFunction(()=>document.querySelector('#office-scene').dataset.phase==='ready'&&document.querySelector('#office-scene').dataset.animating!=='true');
 const position=(x,y)=>page.waitForFunction(([x,y])=>document.querySelector('#position').dataset.x===String(x)&&document.querySelector('#position').dataset.y===String(y)&&document.querySelector('#office-scene').dataset.phase==='ready'&&document.querySelector('#office-scene').dataset.animating!=='true',[x,y]);
 const action=async id=>{await page.locator('[data-action="'+id+'"]').click();await ready();};
 const coords={records:[4,5],caseworker:[4,2],stat:[1,3],rolodex:[6,3],exit:[4,1]};
 const visit=async id=>{await page.locator('[data-marker="'+id+'"]').click();await position(...coords[id]);};
 await page.goto(uiOrigin+'/game/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Begin Billy’s intake',exact:true}).click();await ready();
 await page.locator('#office-scene canvas').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#office-scene').dataset.sceneReady==='true');
 assert.equal(await page.locator('#position').getAttribute('data-x'),'4');
 await page.keyboard.press('ArrowRight');await position(5,4);
 await page.keyboard.press('ArrowLeft');await position(4,4);
 await page.getByLabel('Reduce motion').check();
 await action('inspect-notice');
 await page.getByText('Accessible Office map',{exact:true}).click();
 await visit('records');await action('take-records');
 await visit('caseworker');await action('talk-introduction');
 await visit('stat');await action('use-stat');
 const assessment=await page.locator('#resonance').innerText();assert.match(assessment,/^(?:[1-9]|1[0-9]|20) \/ 20$/);
 await visit('caseworker');await action('talk-placement');
 await visit('rolodex');await action('choose-memory');
 assert.match(await page.locator('#glitch-status').innerText(),/Anomaly observed/);
 await action('inspect-rolodex');await action('resolve-report');
 await page.locator('#intake-complete').waitFor({state:'visible'});
 assert.equal(await page.locator('#inventory [data-item="placement-pass"]').count(),1);
 const before=projectWorldGame(owner,await store.loadCurrentRun(owner));
 assert.equal(before.mission.complete,true);assert.equal(before.caseFile.glitch.resolution,'report');
 await page.reload({waitUntil:'networkidle'});await ready();
 await page.locator('#office-scene canvas').waitFor({state:'visible'});
 assert.equal(await page.locator('#resonance').innerText(),assessment);
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 assert.deepEqual(projectWorldGame(owner,await store.loadCurrentRun(owner)),before);
 await page.getByText('Accessible Office map',{exact:true}).click();
 await visit('stat');assert.equal(await page.locator('[data-action="use-stat"]').count(),0);
 await visit('caseworker');await action('talk-glitch');
 assert.match(await page.locator('#latest-event').innerText(),/discrepancy report/);
 await visit('exit');await action('inspect-exit');
 await page.getByText('Accessible Office map',{exact:true}).click();
 await mkdir(process.env.OFFICE_ARTIFACT_DIR,{recursive:true});
 await page.screenshot({path:resolve(process.env.OFFICE_ARTIFACT_DIR,'main-office-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
 await page.getByRole('button',{name:'Move south',exact:true}).click();await position(4,2);
 await page.screenshot({path:resolve(process.env.OFFICE_ARTIFACT_DIR,'main-office-mobile.png'),fullPage:true});
 // Another executor commits while this browser retains an older revision.
 const current=await store.loadCurrentRun(owner),safe=projectWorldGame(owner,current).actions.find(a=>a.command.type==='move');
 await store.commitAction(owner,current.id,{expectedRevision:current.revision,command:safe.command});
 await page.getByRole('button',{name:'Move north',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#office-scene').dataset.phase==='conflict');
 assert.equal(await page.locator('#office-scene canvas').count(),0);
 await page.getByRole('button',{name:'Reload saved game',exact:true}).click();await ready();
 active=false;await page.getByRole('button',{name:'Reload saved game',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#office-scene').dataset.phase==='signed_out');
 assert.equal(await page.locator('#office-scene canvas').count(),0);
 assert.equal(await page.locator('#inventory li').count(),0);
 assert.equal(await page.locator('#mission-steps li').count(),0);
 assert.equal(await page.getByRole('button',{name:'Begin Billy’s intake',exact:true}).isVisible(),false);
 assert.deepEqual(errors,[]);
 assert.equal(requests.some(r=>new URL(r.url).pathname.startsWith('/gateway/')),false);
 for(const request of requests.filter(r=>r.method==='POST'&&new URL(r.url).pathname==='/api/game/world/actions'))
  assert.deepEqual(Object.keys(JSON.parse(request.body)).sort(),['command','expectedRevision','runId']);
 console.log(JSON.stringify({scope:'isolated-main-office-browser-fixture',scene:'9x7',intake_complete:true,
  records_inventory:true,assessment_persisted_once:true,placement:'memory',glitch:'reported',reload_equal:true,
  mobile_no_overflow:true,stale_revision_denied:true,inactive_session_view_cleared:true,page_errors:errors.length,production_activation:false}));
}catch(error){
 if(page&&process.env.OFFICE_ARTIFACT_DIR){await mkdir(process.env.OFFICE_ARTIFACT_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.OFFICE_ARTIFACT_DIR,'office-failure.png'),fullPage:true}).catch(()=>{});}
 throw error;
}finally{
 await browser?.close();if(uiServer){uiServer.closeAllConnections();await new Promise(resolve=>uiServer.close(resolve));}if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await pool.end();
}
