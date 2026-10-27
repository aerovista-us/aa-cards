// Application-owned Identity Gateway HTTP handlers.
// This is server-only code, deliberately not deployed to GitHub Pages.
// Mount under /api/auth at an authorized same-origin app gateway.
// Requires the actual @aerovista-us/app-adapter/server package.
import { createServerAppAdapter } from '@aerovista-us/app-adapter/server';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE='aa_cards_session';
const CSRF_COOKIE='aa_cards_csrf';
const COOKIE_OPTIONS='HttpOnly; Secure; SameSite=Lax; Path=/api';
function safeEqual(a,b){const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));return aa.length===bb.length&&timingSafeEqual(aa,bb)}
function parseCookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim().split(/=(.*)/s).slice(0,2)).filter(x=>x[0]))}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body))}
function body(req,limit=8192){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>limit){reject(new Error('Body too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(data))}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function cookieHeader(name,value,age){return name+'='+encodeURIComponent(value)+'; Max-Age='+age+'; '+COOKIE_OPTIONS}
export function createIdentityHandlers({env, sessions}){
  if(!env?.identityGatewaySecret || !env?.appId || !sessions?.put || !sessions?.get || !sessions?.delete) throw new Error('Identity gateway credentials and durable encrypted session store required');
  const adapter=createServerAppAdapter({appId:env.appId,identityGatewaySecret:env.identityGatewaySecret,identityGatewayOrigin:env.identityGatewayOrigin});
  return async function identityHandler(req,res){
    const path=new URL(req.url,'https://app.invalid').pathname;
    const cookies=parseCookies(req);
    const sid=decodeURIComponent(cookies[SESSION_COOKIE]||'');
    try{
      if(path==='/api/auth/handoff-exchange'&&req.method==='POST'){
        if(req.headers.origin!==env.appOrigin) return json(res,403,{error:'origin_rejected'});
        const input=await body(req);
        if(typeof input.code!=='string'||input.code.length>512||!input.code) return json(res,400,{error:'invalid_code'});
        const exchanged=await adapter.auth.exchangeHandoff(input.code);
        // Canonical App Adapter v0.4 HandoffExchangeResponse contract.
        // A successful exchange must supply both tokens; no guessed mapping.
        if(exchanged?.ok!==true || typeof exchanged.sessionToken!=='string' || !exchanged.sessionToken || typeof exchanged.csrfToken!=='string' || !exchanged.csrfToken) return json(res,403,{error:'invalid_handoff'});
        const token=exchanged.sessionToken;
        const session=await adapter.auth.resolveSession(token);
        if(session?.ok!==true || session?.authenticated!==true || !session.identityId) return json(res,403,{error:'invalid_session'});
        const handle=randomBytes(32).toString('base64url');
        await sessions.put(handle,{token,csrfToken:exchanged.csrfToken,createdAt:Date.now()}, {ttlSeconds:3600});
        res.setHeader('Set-Cookie',[cookieHeader(SESSION_COOKIE,handle,3600),cookieHeader(CSRF_COOKIE,exchanged.csrfToken,3600)]);
        return json(res,200,{ok:true});
      }
      if(path==='/api/auth/session'&&req.method==='GET'){
        const stored=sid?await sessions.get(sid):null;
        if(!stored) return json(res,401,{authenticated:false});
        const session=await adapter.auth.resolveSession(stored.token);
        if(session?.ok!==true || session?.authenticated!==true || !session.identityId) return json(res,401,{authenticated:false});
        return json(res,200,{authenticated:true,csrfToken:stored.csrfToken});
      }
      if(path==='/api/auth/logout'&&req.method==='POST'){
        if(req.headers.origin!==env.appOrigin)return json(res,403,{error:'origin_rejected'});
        const stored=sid?await sessions.get(sid):null;
        if(!stored?.csrfToken || !safeEqual(req.headers['x-csrf-token'],stored.csrfToken))return json(res,403,{error:'csrf_rejected'});
        if(stored){await adapter.auth.revokeSession(stored.token);await sessions.delete(sid)}
        res.setHeader('Set-Cookie',[cookieHeader(SESSION_COOKIE,'',0),cookieHeader(CSRF_COOKIE,'',0)]);
        return json(res,200,{ok:true});
      }
      return json(res,404,{error:'not_found'});
    }catch(error){
      return json(res,503,{error:'identity_service_unavailable'});
    }
  };
}
