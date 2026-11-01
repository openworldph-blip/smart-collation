import {REQUEST_DATE,validQuantity} from './draft-model.js';
import {sevenDays,todayManila} from './date-tools.js';
export const WORKFLOW_KEY='smart-collation:workflow:v1';
export const defaultWorkflow=()=>({openDates:sevenDays(REQUEST_DATE),submissions:{},revision:0,audit:[],deliveryCalendarVersion:1});
export function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
export function readWorkflow(raw){
 try{const w=JSON.parse(raw);if(!w||!Array.isArray(w.openDates)||w.openDates.some(d=>!validDate(d))||!w.submissions||Array.isArray(w.submissions)||typeof w.submissions!=='object')return defaultWorkflow();
 for(const [key,r] of Object.entries(w.submissions))if(!r||!validDate(r.date)||key!==`${r.date}/${r.branchId}`||typeof r.submittedBy!=='string'||typeof r.submittedAt!=='string'||typeof r.nothingNeeded!=='boolean'||!r.items||Array.isArray(r.items))return defaultWorkflow();
 if(!w.deliveryCalendarVersion){if(w.openDates.length>0&&w.openDates.length<7)w.openDates=[...new Set([...w.openDates,...sevenDays([...w.openDates].sort()[0])])].sort();w.deliveryCalendarVersion=1;}
 return w;
 }catch{return defaultWorkflow();}
}
export function allDates(workflow){return [...new Set([...workflow.openDates,...Object.values(workflow.submissions).map(r=>r.date)])].sort();}
export function submitLocal(workflow,state,drafts,{branchId,date,submittedBy,nothingNeeded},now=new Date().toISOString()){
 if(!validDate(date)||!workflow.openDates.includes(date))throw Error('Choose an Admin-opened delivery date first.');
 if(date<=todayManila(now))throw Error('Delivery starts tomorrow. Choose tomorrow or a later delivery date.');
 if(!state.branches.some(b=>b.id===branchId&&b.active))throw Error('This branch is not active.');
 const key=`${date}/${branchId}`;
 if(workflow.submissions[key])throw Error('This branch already submitted for this date.');
 if(!submittedBy.trim())throw Error('Enter the employee name.');
 const rows=drafts[key]||{};
 if(!nothingNeeded&&!Object.keys(rows).length)throw Error('Select items or choose Nothing needed.');
 const items={};
 if(!nothingNeeded)for(const [itemId,row] of Object.entries(rows)){
  if(!validQuantity(row.quantity))throw Error('Keep quantity entries within 80 characters. Blank is allowed.');
  const item=state.items.find(i=>i.id===itemId)||row.snapshot;
  if(!item)throw Error('An item cannot be identified. Review your checklist.');
  items[itemId]={quantity:row.quantity,unit:row.unit,snapshot:structuredClone(item),locked:true,masterItemId:row.masterItemId||(!item.isNewItem?item.id:null),isNewItem:!!item.isNewItem};
 }
 const receipt={date,branchId,submittedBy:submittedBy.trim(),submittedAt:now,nothingNeeded:!!nothingNeeded,items,version:1};
 return {...workflow,revision:(workflow.revision||0)+1,submissions:{...workflow.submissions,[key]:receipt}};
}
export function reportRows(drafts,workflow){return {...drafts,...Object.fromEntries(Object.entries(workflow.submissions).map(([k,r])=>[k,r.items]))};}
export function saveAdminRequest(workflow,state,{branchId,date,items,nothingNeeded,expectedVersion},now=new Date().toISOString()){
 if(!validDate(date)||!state.branches.some(b=>b.id===branchId))throw Error('Choose a valid branch and delivery date.');
 const key=`${date}/${branchId}`,before=workflow.submissions[key];
 if(expectedVersion===null?!!before:!before||(before.version||0)!==expectedVersion)throw Error('This request changed since you opened it. Reload it before saving.');
 if(!nothingNeeded&&!Object.keys(items).length)throw Error('Add at least one item, or mark Nothing needed.');
 const saved={};
 if(!nothingNeeded)for(const [lineId,row] of Object.entries(items)){
  if(!validQuantity(row.quantity))throw Error('Keep quantity entries within 80 characters. Blank is allowed.');
  if(!row.snapshot?.name?.trim()||row.snapshot.name.length>160)throw Error('Every item needs a name (up to 160 characters).');
  const snap=structuredClone(row.snapshot);snap.name=snap.name.trim();snap.shortName=snap.name;
  if(!state.categories.some(c=>c.id===snap.categoryId))throw Error('Choose an item category.');
  if(snap.zoneId&&!state.zones.some(z=>z.id===snap.zoneId))throw Error('Choose a valid purchasing zone.');
  if(snap.sourceId&&!state.sources.some(s=>s.id===snap.sourceId))throw Error('Choose a valid Market source.');
  if(snap.zoneId!==state.zones.find(z=>z.code==='market').id)snap.sourceId='';
  saved[lineId]={...row,quantity:row.quantity,unit:row.unit,snapshot:snap,locked:true,adminReviewed:true};
 }
 const after={...before,date,branchId,submittedBy:before?.submittedBy||'Admin manual entry',submittedAt:before?.submittedAt||now,nothingNeeded:!!nothingNeeded,items:saved,version:(before?.version||0)+1,reviewedAt:now,editedAt:now,origin:before?.origin||'admin'};
 return {...workflow,revision:(workflow.revision||0)+1,submissions:{...workflow.submissions,[key]:after},audit:[{date,branchId,at:now,actor:'Admin',action:'Edited branch request',before:before||null,after},...(workflow.audit||[])].slice(0,100)};
}
