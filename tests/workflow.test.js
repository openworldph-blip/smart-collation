import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../src/seed.json' with {type:'json'};
import {defaultWorkflow,submitLocal,reportRows,validDate,saveAdminRequest} from '../src/workflow.js';
import {REQUEST_DATE,collectDraftLines,readDrafts} from '../src/draft-model.js';
const branchId=seed.branches[0].id,item=seed.items[0];
const payload={branchId,date:REQUEST_DATE,submittedBy:'Test employee',nothingNeeded:false};
const drafts={[`${REQUEST_DATE}/${branchId}`]:{[item.id]:{quantity:'2',unit:'',snapshot:item}}};
test('submission requires an Admin-open date, selected items, and employee name',()=>{
 for(const p of [{...payload,date:''},{...payload,date:'2026-12-01'},{...payload,submittedBy:''}])assert.throws(()=>submitLocal(defaultWorkflow(),seed,drafts,p));
 assert.throws(()=>submitLocal(defaultWorkflow(),seed,{},payload));
 assert(!validDate('2026-02-30'));
});
test('future-date submission stays with chosen date rather than timestamp',()=>{
 const w=submitLocal(defaultWorkflow(),seed,drafts,payload,'2026-11-07T10:00:00Z');
 const r=w.submissions[`${REQUEST_DATE}/${branchId}`];assert.equal(r.date,'2026-11-09');assert.equal(r.submittedAt,'2026-11-07T10:00:00Z');
 assert.equal(collectDraftLines(seed,reportRows({},w),'2026-11-09').lines.length,1);assert.equal(collectDraftLines(seed,reportRows({},w),'2026-11-07').lines.length,0);
});
test('repeat submission is rejected but another date is independent',()=>{
 const w=submitLocal(defaultWorkflow(),seed,drafts,payload);
 assert.throws(()=>submitLocal(w,seed,drafts,payload),/already submitted/);
 const n=submitLocal(w,seed,{}, {...payload,date:'2026-11-10',nothingNeeded:true});assert.equal(Object.keys(n.submissions).length,2);
});
test('No Request records response and excludes a preserved draft from reports',()=>{
 const w=submitLocal(defaultWorkflow(),seed,drafts,{...payload,nothingNeeded:true});
 assert(w.submissions[`${REQUEST_DATE}/${branchId}`].nothingNeeded);assert.equal(collectDraftLines(seed,reportRows(drafts,w)).lines.length,0);
});
test('submitted snapshot names survive master edits',()=>{
 const w=submitLocal(defaultWorkflow(),seed,drafts,payload),edited=structuredClone(seed);edited.items[0].name='Renamed later';
 assert.equal(collectDraftLines(edited,reportRows({},w)).lines[0].name,item.name);
});
test('checked items with blank quantity remain selected and can submit',()=>{
 const d=readDrafts(JSON.stringify({[`${REQUEST_DATE}/${branchId}`]:{[item.id]:{quantity:'',unit:''}}}));
 assert.equal(Object.keys(d[`${REQUEST_DATE}/${branchId}`]).length,1);const w=submitLocal(defaultWorkflow(),seed,d,payload);assert.equal(w.submissions[`${REQUEST_DATE}/${branchId}`].items[item.id].quantity,'');
});
test('submission and Admin editing preserve free text exactly',()=>{
 const text='1 tab',d={[`${REQUEST_DATE}/${branchId}`]:{[item.id]:{quantity:text,unit:'',snapshot:item}}};
 const w=submitLocal(defaultWorkflow(),seed,d,payload);assert.equal(collectDraftLines(seed,reportRows({},w)).lines[0].quantity,text);
 const items=structuredClone(w.submissions[`${REQUEST_DATE}/${branchId}`].items);items[item.id].quantity='2 unusual units';
 const edited=saveAdminRequest(w,seed,{branchId,date:REQUEST_DATE,items,nothingNeeded:false,expectedVersion:1});assert.equal(collectDraftLines(seed,reportRows({},edited)).lines[0].quantity,'2 unusual units');
});
