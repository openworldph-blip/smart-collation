import {marketZone} from './model.js';
export const REQUEST_DATE='2026-11-09';
// Quantity is optional free text. Preserve entries such as "1 tab" verbatim.
export function validQuantity(q){return typeof q==='string'&&q.length<=80;}
export function isNumericQuantity(q){return typeof q==='string'&&/^(?:\d{1,7}(?:\.\d{1,6})?|\.\d{1,6})$/.test(q.trim());}
export function totalQuantities(values){
 const scale=1000000n;
 const total=values.reduce((sum,value)=>{
   if(!isNumericQuantity(String(value)))throw Error('Only plain numeric quantities can be totaled.');
   const [whole,fraction='']=String(value).trim().split('.');
   return sum+BigInt(whole||'0')*scale+BigInt(fraction.padEnd(6,'0'));
 },0n);
 const fraction=(total%scale).toString().padStart(6,'0').replace(/0+$/,'');
 return (total/scale).toString()+(fraction?'.'+fraction:'');
}
export function collectDraftLines(state,drafts,date=REQUEST_DATE){
 const lines=[],errors=[];
 for(const [key,selected] of Object.entries(drafts))if(key.startsWith(date+'/')&&!state.branches.some(b=>key===`${date}/${b.id}`)&&Object.keys(selected).length)errors.push('A local draft belongs to a branch missing from this catalog. Restore the matching catalog before generating output.');
 for(const branch of state.branches){
  const selected=drafts[`${date}/${branch.id}`]||{};
  for(const [itemId,value] of Object.entries(selected)){
   const item=value.locked?value.snapshot:(state.items.find(i=>i.id===itemId)||value.snapshot);
   if(!item){errors.push(`${branch.name}: a selected item is missing its name.`);continue;}
   if(!validQuantity(value.quantity)){errors.push(`${branch.name} · ${item.name}: keep the quantity entry within 80 characters.`);continue;}
   const zoneId=state.zones.some(z=>z.id===item.zoneId)?item.zoneId:'';
   const sourceId=zoneId===marketZone(state).id&&state.sources.some(s=>s.id===item.sourceId)?item.sourceId:'';
   lines.push({branchId:branch.id,itemId:value.masterItemId||itemId,name:item.name,shortName:item.shortName||item.name,quantity:value.quantity,unit:value.unit||'',zoneId,sourceId,categoryId:item.categoryId,isNewItem:!!value.isNewItem||!!item.isNewItem});
  }
 }
 return {lines,errors};
}
export function marketGroups(state,lines){
 const groups=new Map(),marketId=marketZone(state).id;
 for(const line of lines.filter(l=>l.zoneId===marketId)){
  // Optional blank units form their own group. Never mix them with kg, pack, etc.
  const key=JSON.stringify([line.sourceId,line.itemId,line.unit.toLowerCase()]);
  if(!groups.has(key))groups.set(key,{...line,allocations:{},quantities:[],entries:{}});
  const row=groups.get(key);row.quantities.push(line.quantity);
  row.entries[line.branchId]=[...(row.entries[line.branchId]||[]),line.quantity];
  row.allocations[line.branchId]=row.entries[line.branchId].join(' / ');
 }
 return [...groups.values()].map(r=>({...r,total:r.quantities.every(isNumericQuantity)?totalQuantities(r.quantities):''}));
}
export function readDrafts(raw){
 try{
  const data=JSON.parse(raw||'{}');if(!data||Array.isArray(data)||typeof data!=='object')return {};
  for(const rows of Object.values(data)){
   if(!rows||Array.isArray(rows)||typeof rows!=='object')return {};
   for(const r of Object.values(rows))if(!r||typeof r.quantity!=='string'||typeof r.unit!=='string'||r.unit.length>80)return {};
  }
  return data;
 }catch{return {};}
}
