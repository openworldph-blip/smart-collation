export const SCHEMA = 1;
export const id = () => {
  if(globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  // LAN HTTP previews lack randomUUID, but getRandomValues is available.
  const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
};
export const sorted = rows => [...rows].sort((a,b)=>a.order-b.order || a.name.localeCompare(b.name));
export const marketZone = state => state.zones.find(z=>z.code==='market');
export function visibleItems(state,branchId,search='',all=false) {
  const needle=search.trim().toLowerCase();
  return sorted(state.items).filter(item=>{
    const category=state.categories.find(c=>c.id===item.categoryId);
    return item.active && category?.active && (all || (category.visibility[branchId]===true && item.visibility[branchId]===true)) &&
      (!needle || [item.name,item.shortName,...item.aliases].some(n=>n.toLowerCase().includes(needle)));
  });
}
export function validateState(s) {
  if (!s || s.schemaVersion!==SCHEMA) throw Error('Unsupported backup format. Choose a Smart Collation catalog backup.');
  for (const key of ['branches','categories','items','zones','sources']) {
    if (!Array.isArray(s[key]) || s[key].length>2000) throw Error(`Invalid ${key} list.`);
    const ids=new Set();
    for (const r of s[key]) {
      if (!r || typeof r.id!=='string' || !r.id || ids.has(r.id)) throw Error(`Duplicate or invalid ID in ${key}.`);
      ids.add(r.id);
      if(typeof r.name!=='string' || !r.name.trim() || r.name.length>160 || typeof r.active!=='boolean' || !Number.isInteger(r.order) || r.order<0) throw Error(`Invalid record in ${key}.`);
    }
  }
  const refs=key=>new Set(s[key].map(r=>r.id));
  const cats=refs('categories'),zones=refs('zones'),sources=refs('sources'),branches=refs('branches');
  if(!s.branches.length || !s.categories.length) throw Error('Keep at least one branch and one category.');
  for(const b of s.branches) if(typeof b.abbreviation!=='string'||b.abbreviation.length>10) throw Error('Invalid branch report abbreviation.');
  if (s.zones.filter(z=>z.code==='market').length!==1) throw Error('The Market purchasing zone must exist exactly once.');
  for (const r of [...s.categories,...s.items]) {
    if (!r.visibility || Array.isArray(r.visibility) || typeof r.visibility!=='object') throw Error('Invalid branch visibility.');
    for (const [k,v] of Object.entries(r.visibility)) if (!branches.has(k) || typeof v!=='boolean') throw Error('Invalid visibility branch reference.');
  }
  for(const item of s.items) {
    if(!cats.has(item.categoryId) || (item.zoneId && !zones.has(item.zoneId)) || (item.sourceId && !sources.has(item.sourceId))) throw Error('Item has an invalid category, zone, or source reference.');
    for (const key of ['unit','shortName','zoneId','sourceId']) if(typeof item[key]!=='string' || item[key].length>160) throw Error('Invalid item details.');
    if (!Array.isArray(item.aliases) || item.aliases.length>100 || item.aliases.some(a=>typeof a!=='string'||a.length>160)) throw Error('Invalid item aliases.');
    if(item.sourceId && item.zoneId!==marketZone(s).id) throw Error('Only Market items can have a Market source.');
  }
  return s;
}
export function updateRecord(state,key,record) {
  const next=structuredClone(state); const value={...record,name:record.name.trim()};
  if (!value.name) throw Error('Enter a name.');
  if(next[key].some(r=>r.id!==value.id && r.name.toLowerCase()===value.name.toLowerCase())) throw Error('That name already exists. Edit the existing entry or merge duplicates.');
  const index=next[key].findIndex(r=>r.id===value.id);
  if(index<0) next[key].push(value); else next[key][index]=value;
  validateState(next); return next;
}
export function moveRecord(state,key,recordId,delta) {
  const next=structuredClone(state),rows=sorted(next[key]),from=rows.findIndex(r=>r.id===recordId),to=from+delta;
  if(from<0 || to<0 || to>=rows.length) return state;
  [rows[from],rows[to]]=[rows[to],rows[from]];rows.forEach((r,i)=>r.order=i);
  next[key]=rows;return next;
}
export function removeCategory(state,categoryId) {
  if(state.items.some(i=>i.categoryId===categoryId)) throw Error('Move all items to another category before deleting this category. You can deactivate it instead.');
  return {...state,categories:state.categories.filter(c=>c.id!==categoryId)};
}
export function mergeItems(state,sourceId,targetId) {
  if(sourceId===targetId) throw Error('Choose a different item to keep.');
  const next=structuredClone(state),source=next.items.find(i=>i.id===sourceId),target=next.items.find(i=>i.id===targetId);
  if(!source || !target) throw Error('Both items must exist.');
  target.aliases=[...new Set([...target.aliases,source.name,...source.aliases])].filter(n=>n!==target.name);
  for(const b of next.branches) target.visibility[b.id]=target.visibility[b.id]===true || source.visibility[b.id]===true;
  next.items=next.items.filter(i=>i.id!==sourceId);
  validateState(next);return next;
}
export function setVisibility(state,key,recordId,branchId,enabled) {
  if(!state.branches.some(b=>b.id===branchId)) throw Error('Unknown branch.');
  const next=structuredClone(state),r=next[key].find(r=>r.id===recordId);
  if(!r || !['items','categories'].includes(key)) throw Error('Invalid visibility target.');
  r.visibility[branchId]=enabled;return next;
}
export function readiness(state) {
  return state.items.filter(i=>i.active && (!i.zoneId || (i.zoneId===marketZone(state).id&&!i.sourceId)));
}
