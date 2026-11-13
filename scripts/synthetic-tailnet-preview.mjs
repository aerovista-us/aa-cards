// Isolated synthetic preview only. NEVER wire this server into live Account,
// production DNS, prod data, or an access-controlled staging acceptance claim.
// Two Tailnet-only HTTPS frontends proxy to this loopback-published container:
// UI 9452, API 9453. Public A/B Account and storage acceptance remain NOT_RUN.
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPreparedWorldGameHandler} from '../gateway/world-staging-composition.mjs';

const required=['ASCENSION_SYNTHETIC_PREVIEW','PREVIEW_UI_ORIGIN','PREVIEW_API_ORIGIN','PREVIEW_SESSION_TOKEN','PREVIEW_CSRF_TOKEN','PG_MODULE_PATH','PREVIEW_PHASER_PATH'];
for(const k of required)if(!process.env[k])throw Error('preview_configuration_missing');
if(process.env.ASCENSION_SYNTHETIC_PREVIEW!=='1'||process.env.PGDATABASE!=='ascension_preview_synthetic_20261112'||
   process.env.PGHOST!=='db'||process.env.PGUSER!=='ascension_preview')throw Error('preview_isolation_required');
const uiOrigin=process.env.PREVIEW_UI_ORIGIN,appOrigin=process.env.PREVIEW_API_ORIGIN;
const ui=new URL(uiOrigin),api=new URL(appOrigin);
if(ui.origin!==uiOrigin||api.origin!==appOrigin||ui.protocol!=='https:'||api.protocol!=='https:'||
  ui.hostname!=='nxcore.tail79107c.ts.net'||api.hostname!==ui.hostname||
  ui.port!=='9452'||api.port!=='9453')throw Error('preview_tailnet_only');
const sessionToken=process.env.PREVIEW_SESSION_TOKEN,csrf=process.env.PREVIEW_CSRF_TOKEN;
if(!/^[A-Za-z0-9_-]{32,128}$/.test(sessionToken)||!/^[A-Za-z0-9_-]{32,128}$/.test(csrf)||
  sessionToken===csrf)throw Error('invalid_preview_secrets');
const subject='synthetic-preview-billy',names=Object.freeze({
 load:'preview.world.load',create:'preview.world.create',action:'preview.world.action',
 travel:'preview.world.travel',map:'preview.world.map'
});
const adapter={
 auth:{resolveSession:async token=>({ok:true,authenticated:token===sessionToken,identityId:token===sessionToken?subject:null})},
 identity:{
  describe:async token=>({ok:true,authenticated:token===sessionToken,identity:token===sessionToken?{identityId:subject,status:'active'}:null}),
  can:async({identityId,capability})=>({ok:true,allowed:identityId===subject&&Object.values(names).includes(capability)})
 }
};
const {Pool}=createRequire(import.meta.url)(process.env.PG_MODULE_PATH);
const pool=new Pool({max:4,connectionTimeoutMillis:5000});
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..'),gameRoot=resolve(repo,'game');
const handler=createPreparedWorldGameHandler({adapter,pool,capabilityNames:names,appOrigin,uiOrigin});
const secureHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
const cookie=(name,value)=>name+'='+encodeURIComponent(value)+'; Path=/; Secure; HttpOnly; SameSite=Lax';
const cookies=[cookie('ascension_avcc_session',sessionToken),cookie('ascension_csrf',csrf)];
const send=(res,status,value,headers={})=>{
 res.writeHead(status,{...secureHeaders,...headers,'Content-Type':'application/json'});
 res.end(JSON.stringify(value));
};
const parseCookie=(raw,name)=>{
 const list=String(raw||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
 if(list.length!==1)return false;
 const value=list[0].slice(name.length+1);
 return value.length===sessionToken.length&&timingSafeEqual(Buffer.from(value),Buffer.from(sessionToken));
};
let initialized=false;
for(let i=0;i<30;i++){
 try{await pool.query(await readFile(resolve(repo,'gateway/migrations/001_player_runs.sql'),'utf8'));initialized=true;break}
 catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,1000))}
}
if(!initialized)throw Error('preview_storage_unavailable');
const uiMarkup={
 banner:'<aside style="background:#432921;color:#ffe3b8;padding:10px 18px;font:600 13px system-ui;text-align:center">SYNTHETIC TAILNET PREVIEW · Shared test character · Progress may reset · NOT connected to AeroVista Account · NOT production</aside>',
 head:'<meta name="ascension-api-origin" content="'+appOrigin+'"><script src="/preview-assets/phaser.min.js"></script>'
};
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,appOrigin).pathname,host=req.headers.host;
  if(path==='/health')return send(res,200,{status:'ok',scope:'synthetic-tailnet-preview',source:process.env.PREVIEW_SOURCE_SHA?.slice(0,12)||'unknown'});
  if(![ui.host,api.host].includes(host))return send(res,403,{error:'invalid_host'});
  if(path==='/')return res.writeHead(302,{...secureHeaders,Location:uiOrigin+'/game/'}).end();
  if(path==='/api/session'){
   if(host!==api.host||req.method!=='GET'||req.headers.origin!==uiOrigin)return send(res,403,{error:'origin_denied'});
   const active=parseCookie(req.headers.cookie,'ascension_avcc_session');
   return send(res,200,active?
    {authenticated:true,identity:{id:subject},csrf}:
    {authenticated:false,identity:null,csrf:null},{
     'Access-Control-Allow-Origin':uiOrigin,'Access-Control-Allow-Credentials':'true','Vary':'Origin'
    });
  }
  if(host===api.host&&(path==='/api/game/world'||path==='/api/game/world/runs'||path==='/api/game/world/actions')){
   if(await handler(req,res))return;
  }
  if(host!==ui.host||req.method!=='GET')return send(res,404,{error:'not_found'});
  if(path==='/preview-assets/phaser.min.js'){
   res.writeHead(200,{...secureHeaders,'Content-Type':'application/javascript'});
   res.end(await readFile(process.env.PREVIEW_PHASER_PATH));return;
  }
  if(!path.startsWith('/game/'))return send(res,404,{error:'not_found'});
  const relative=decodeURIComponent(path.slice(6))||'index.html';
  const file=resolve(gameRoot,relative),ext=extname(file);
  if(!file.startsWith(gameRoot+sep)||!types[ext])return send(res,404,{error:'not_found'});
  let bytes=await readFile(file);
  if(ext==='.html'){
   let html=bytes.toString().replace('<head>','<head>'+uiMarkup.head)
    .replace('<body>','<body>'+uiMarkup.banner)
    .replace('href="../">Account</a>','href="../game/">Preview</a>')
    .replace('https://ascension-auth.aerovista.us/login?next=%2F',uiOrigin+'/game/');
   bytes=Buffer.from(html);
  }
  if(relative==='main.mjs'){
   const text=bytes.toString().replace("const local=['127.0.0.1','localhost'].includes(location.hostname);",
    "const local=true; // synthetic Tailnet preview build only");
   bytes=Buffer.from(text);
  }
  if(relative==='world-client.mjs'){
   const text=bytes.toString().replace(
    "origin!=='https://ascension-auth.aerovista.us'",
    "origin!=="+JSON.stringify(appOrigin)+"&&origin!=='https://ascension-auth.aerovista.us'");
   bytes=Buffer.from(text);
  }
  res.writeHead(200,{...secureHeaders,'Content-Type':types[ext],
   ...(ext==='.html'?{'Set-Cookie':cookies}:{})});
  res.end(bytes);
 }catch(e){
  if(!res.headersSent)return send(res,503,{error:'preview_unavailable'});
  res.end();
 }
});
server.requestTimeout=15000;server.headersTimeout=17000;
const port=17888;
server.listen(port,'0.0.0.0',()=>console.log('synthetic_preview_ready port='+port+' source='+String(process.env.PREVIEW_SOURCE_SHA).slice(0,12)));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{server.close();await pool.end();process.exit(0)});
