import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUTH_ORIGIN,ACCOUNT_LINKS,createAccountAccess} from '../js/account-access.mjs';
const csrf='private_csrf_value_'.padEnd(32,'x');
const identity='private-account-identity';
const signedIn={authenticated:true,identity:{id:identity},csrf};
const signedOut={authenticated:false,identity:null,csrf:null};
const response=(body,status=200,type='application/json')=>({status,headers:{get:()=>type},json:async()=>body});
function harness(replies){
 const requests=[],states=[];
 const account=createAccountAccess({onChange:state=>states.push(state),fetchImpl:async(url,options)=>{
  requests.push({url,options});
  assert.ok(replies.length,'No unexpected request allowed');
  const next=replies.shift();
  if(next instanceof Error)throw next;
  return typeof next==='function'?next():next;
 }});
 return {account,requests,states};
}
test('public account links use the existing bridge with a fixed root return',()=>{
 for(const [kind,path] of [['login','/login'],['register','/register']]){
  const url=new URL(ACCOUNT_LINKS[kind]);
  assert.equal(url.origin,AUTH_ORIGIN);assert.equal(url.pathname,path);
  assert.deepEqual([...url.searchParams],[['next','/']]);
 }
});
test('signed-out refresh is credentialed and status-only, without game/map/save access',async()=>{
 const h=harness([response(signedOut)]);
 assert.equal((await h.account.refresh()).phase,'signed_out');
 assert.equal(h.requests.length,1);assert.equal(h.requests[0].url,AUTH_ORIGIN+'/api/session');
 const options=h.requests[0].options;
 assert.equal(options.credentials,'include');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.method,'GET');
 assert.equal(h.account.snapshot().canSignOut,false);
});
test('authenticated state keeps identity and CSRF values out of public snapshots',async()=>{
 const h=harness([response(signedIn)]);
 assert.equal((await h.account.refresh()).phase,'signed_in');
 assert.equal(h.account.snapshot().canSignOut,true);
 assert.equal(JSON.stringify(h.states).includes(identity),false);
 assert.equal(JSON.stringify(h.states).includes(csrf),false);
});
test('callback success marker alone cannot establish a signed-in session',async()=>{
 const h=harness([response(signedOut)]);
 const view=await h.account.refresh({callbackResult:'ok'});
 assert.equal(view.phase,'signed_out');assert.match(view.message,/could not be confirmed/);
});
test('malformed, inactive or unavailable session responses fail closed',async t=>{
 for(const [name,item] of Object.entries({missingIdentity:response({...signedIn,identity:null}),missingCsrf:response({...signedIn,csrf:null}),invalidCsrf:response({...signedIn,csrf:'bad\nheader'}),badBoolean:response({...signedIn,authenticated:'true'}),wrongStatus:response(signedIn,503),html:response({},200,'text/html'),network:new Error('private failure')})){
  await t.test(name,async()=>{
   const h=harness([item]);const view=await h.account.refresh();
   assert.equal(view.phase,'unavailable');assert.equal(view.canSignOut,false);
   assert.equal(JSON.stringify(view).includes('private failure'),false);
  });
 }
});
test('sign out sends current CSRF and confirms a server-side signed-out read',async()=>{
 const h=harness([response(signedIn),response({ok:true}),response(signedOut)]);
 await h.account.refresh();const view=await h.account.signOut();
 assert.equal(view.phase,'signed_out');assert.match(view.message,/Signed out/);
 assert.deepEqual(h.requests.map(r=>new URL(r.url).pathname),['/api/session','/api/logout','/api/session']);
 assert.equal(h.requests[1].options.method,'POST');assert.equal(h.requests[1].options.headers['X-Ascension-CSRF'],csrf);
 assert.equal(JSON.stringify(h.states).includes(csrf),false);
});
test('negative or failed logout never falsely reports signed out',async t=>{
 for(const [name,item] of Object.entries({csrf:response({error:'csrf_denied'},403),unconfirmed:response({error:'logout_unconfirmed'},503),falseAck:response({ok:false}),network:new Error('private error')})){
  await t.test(name,async()=>{
   const h=harness([response(signedIn),item]);await h.account.refresh();
   const view=await h.account.signOut();assert.equal(view.phase,'unavailable');assert.match(view.message,/not confirmed/);
   assert.equal(h.requests.length,2);assert.equal(JSON.stringify(view).includes('private error'),false);
  });
 }
});
test('a still-active session after logout is reported as connected and unconfirmed',async()=>{
 const h=harness([response(signedIn),response({ok:true}),response(signedIn)]);
 await h.account.refresh();const view=await h.account.signOut();
 assert.equal(view.phase,'signed_in');assert.match(view.message,/not confirmed/);
});
test('late refresh responses cannot resurrect a newer signed-out state',async()=>{
 let complete;
 const h=harness([()=>new Promise(resolve=>{complete=resolve}),response(signedOut)]);
 const old=h.account.refresh();await h.account.refresh();complete(response(signedIn));await old;
 assert.equal(h.account.snapshot().phase,'signed_out');
});
test('clear invalidates pending results without posting a logout',async()=>{
 let complete;
 const h=harness([()=>new Promise(resolve=>{complete=resolve})]);
 const old=h.account.refresh();h.account.clear();complete(response(signedIn));await old;
 assert.notEqual(h.account.snapshot().phase,'signed_in');assert.equal(h.requests.length,1);
});
test('home page exposes account controls while keeping preview choices disabled',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/data-account-sign-in/);assert.match(html,/data-account-register/);
 assert.match(html,/id="account-sign-out"[^>]*hidden disabled/);
 assert.match(html,/button\.disabled=true/);
 assert.match(html,/Signing in does not enable gameplay or cloud saves/);
 const module=readFileSync(new URL('../js/account-access.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(module,/localStorage|sessionStorage|document\.cookie|console\./);
});
