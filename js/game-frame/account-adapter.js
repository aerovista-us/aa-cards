// Account/App Adapter browser entry for the future Ascension gateway.
// Mirrors the documented @aerovista-us/app-adapter/browser handoff shape.
// The exchange MUST take place on an approved backend, never on GitHub Pages.
const ACCOUNT = 'https://account.aerocoreos.com';
const STATE_KEY = 'aa-cards:account-handoff-state';
export const AUTH_MODE = Object.freeze({ status: 'awaiting_gateway', appId: 'aa_cards' });

export function buildAccountEntry({ action='login', origin, state, next='/aa-cards/' }) {
  if (action !== 'login' && action !== 'register') throw new TypeError('Unsupported account action');
  if (!origin?.startsWith('https://') || !state || typeof state !== 'string' || state.length < 20) throw new TypeError('Secure origin and random state required');
  const callback = new URL('/auth/callback', 'https://ascension-auth.aerovista.us');
  callback.searchParams.set('next',next);
  const target=new URL('/'+action,ACCOUNT);
  target.searchParams.set('client_id','aa_cards');
  target.searchParams.set('return_to',callback.href);
  target.searchParams.set('state',state);
  return { url:target.href, callback:callback.href, state };
}
export function checkHandoffState(callbackUrl, expectedState) {
  const url=new URL(callbackUrl);
  const code=url.searchParams.get('code');
  const state=url.searchParams.get('state');
  if (!code || !state || !expectedState || state !== expectedState) throw new Error('Account handoff rejected: state mismatch or missing code');
  return { code, next:url.searchParams.get('next') || '/aa-cards/' };
}
export function createAccountEntry({ origin=window.location.origin }={}) {
  return {
    available: false, // Do not enable before server-side handoff + app registration
    login() { throw new Error('Identity Gateway integration is awaiting an authorized same-origin backend'); },
    registration() { throw new Error('Identity Gateway integration is awaiting an authorized same-origin backend'); },
    accountUrl: ACCOUNT,
    appId:'aa_cards',
    callbackPath:'https://ascension-auth.aerovista.us/auth/callback'
  };
}
