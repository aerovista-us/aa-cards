// Server-owned persistence for the recovered Ascension Mulberry32 generator.
// Never accept an RNG cursor from a browser request. The cursor is part of the
// owner-bound PostgreSQL state and advances only during a committed transaction.
export function seedFromString(s) {
  let h=0x811c9dc5;
  for (let i=0;i<s.length;i++) {h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}
  return h>>>0;
}
export function createPersistentRng(saved) {
  if (!saved || typeof saved.seedString!=='string' || !saved.seedString ||
      !Number.isSafeInteger(saved.rngDraws) || saved.rngDraws<0 || saved.rngDraws>1000000)
    throw new TypeError('Invalid authoritative RNG checkpoint');
  let a=seedFromString(saved.seedString), draws=0;
  function next() {
    a|=0;a=(a+0x6D2B79F5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t^=t+Math.imul(t^(t>>>7),61|t);
    draws++;
    return ((t^(t>>>14))>>>0)/4294967296;
  }
  for(let i=0;i<saved.rngDraws;i++) next();
  return Object.freeze({
    next,
    checkpoint:()=>Object.freeze({seedString:saved.seedString,rngDraws:draws})
  });
}
