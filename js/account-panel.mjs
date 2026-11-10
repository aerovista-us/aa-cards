import {ACCOUNT_LINKS,createAccountAccess} from './account-access.mjs';

const panel=document.getElementById('account-panel');
if(panel){
 const status=document.getElementById('account-status');
 const refresh=document.getElementById('account-refresh');
 const signOut=document.getElementById('account-sign-out');
 const signInLinks=[...document.querySelectorAll('[data-account-sign-in]')];
 const registerLinks=[...document.querySelectorAll('[data-account-register]')];
 for(const link of signInLinks)link.href=ACCOUNT_LINKS.login;
 for(const link of registerLinks)link.href=ACCOUNT_LINKS.register;
 const account=createAccountAccess({onChange:view=>{
  status.textContent=view.message;
  status.dataset.state=view.phase;
  panel.setAttribute('aria-busy',String(view.pending));
  refresh.disabled=view.pending;
  signOut.hidden=!view.canSignOut;
  signOut.disabled=view.pending;
  for(const link of [...signInLinks,...registerLinks])link.hidden=['signed_in','signing_out'].includes(view.phase);
 }});
 refresh.disabled=false;
 refresh.addEventListener('click',()=>account.refresh());
 signOut.addEventListener('click',()=>account.signOut());
 window.addEventListener('pagehide',()=>account.clear());
 window.addEventListener('pageshow',event=>{if(event.persisted)account.refresh();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')account.refresh();});
 account.refresh({callbackResult:new URL(window.location.href).searchParams.get('auth')});
}
