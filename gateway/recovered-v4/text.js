export function renderTemplate(tpl, slots){
  return String(tpl || '').replace(/\{([a-zA-Z0-9_\.\[\]]+)\}/g, (_, k) => {
    const parts = k.split('.'); let cur = slots;
    for(const p of parts){
      const m = p.match(/([a-zA-Z0-9_]+)(\[(\d+)\])?/);
      if(!m) return '';
      cur = cur?.[m[1]];
      if(m[3]) cur = cur?.[parseInt(m[3],10)];
    }
    return (cur === undefined || cur === null) ? '' : String(cur);
  });
}
