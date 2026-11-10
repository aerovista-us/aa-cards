// Account connection only. No gameplay, map, save, grant or browser storage API.
export const AUTH_ORIGIN='https://ascension-auth.aerovista.us';
export const ACCOUNT_LINKS=Object.freeze({
 login:AUTH_ORIGIN+'/login?next=%2F',
 register:AUTH_ORIGIN+'/register?next=%2F'
});

export function createAccountAccess({fetchImpl=globalThis.fetch,onChange=()=>{}}={}){
 let csrf=null,generation=0,signOutTask=null;
 let view=Object.freeze({phase:'signed_out',pending:false,message:'Not signed in.',canSignOut:false});
 function show(phase,message){
  view=Object.freeze({phase,pending:['checking','signing_out'].includes(phase),message,canSignOut:phase==='signed_in'});
  onChange(view);return view;
 }
 async function request(path,{method='GET',csrfToken}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
   const headers={Accept:'application/json'};
   if(csrfToken)headers['X-Ascension-CSRF']=csrfToken;
   const response=await fetchImpl(AUTH_ORIGIN+path,{
    method,mode:'cors',credentials:'include',cache:'no-store',redirect:'error',headers,signal:controller.signal
   });
   if(!String(response.headers?.get?.('content-type')||'').toLowerCase().includes('application/json'))throw Error('unavailable');
   return {status:response.status,body:await response.json()};
  }finally{clearTimeout(timer);}
 }
 function session(response){
  if(response.status!==200||!response.body)throw Error('unavailable');
  const body=response.body;
  if(body.authenticated===false&&body.identity===null&&body.csrf===null)return {connected:false};
  if(body.authenticated!==true||typeof body.identity?.id!=='string'||!body.identity.id.trim()||
   typeof body.csrf!=='string'||!/^[A-Za-z0-9_-]{20,128}$/.test(body.csrf))throw Error('unavailable');
  // Identity and CSRF values never become public status, DOM text or storage.
  return {connected:true,csrf:body.csrf};
 }
 function refresh(options={}){
  // Visibility/pageshow events must not invalidate an in-flight logout or
  // read the still-active session before its confirming read completes.
  if(signOutTask)return signOutTask.then(()=>refresh(options));
  return refreshNow(options);
 }
 async function refreshNow({callbackResult}={}){
  const attempt=++generation;csrf=null;show('checking','Checking your account connection…');
  try{
   const response=await request('/api/session');
   if(attempt!==generation)return view;
   const found=session(response);
   if(found.connected){csrf=found.csrf;return show('signed_in','Signed in to AeroVista Account.');}
   return show('signed_out',callbackResult==='failed'?'Sign-in was not completed. Please try again.'
    :callbackResult==='ok'?'Sign-in could not be confirmed. Please try again.':'Not signed in. Connect your AeroVista Account below.');
  }catch{
   if(attempt!==generation)return view;
   csrf=null;return show('unavailable','Could not check your account connection. Try again.');
  }
 }
 function signOut(){
  if(signOutTask)return signOutTask;
  if(!csrf)return refresh();
  signOutTask=signOutNow().finally(()=>{signOutTask=null;});
  return signOutTask;
 }
 async function signOutNow(){
  const token=csrf,attempt=++generation;csrf=null;show('signing_out','Signing out…');
  try{
   const result=await request('/api/logout',{method:'POST',csrfToken:token});
   if(attempt!==generation)return view;
   if(result.status!==200||result.body?.ok!==true)throw Error('unconfirmed');
   const response=await request('/api/session');
   if(attempt!==generation)return view;
   const found=session(response);
   if(found.connected){csrf=found.csrf;return show('signed_in','Sign-out was not confirmed. Your account is still connected.');}
   return show('signed_out','Signed out of Ascension.');
  }catch{
   if(attempt!==generation)return view;
   csrf=null;return show('unavailable','Sign-out was not confirmed. Check your connection and try again.');
  }
 }
 return Object.freeze({refresh,signOut,snapshot:()=>view,clear:()=>{generation++;csrf=null;}});
}
