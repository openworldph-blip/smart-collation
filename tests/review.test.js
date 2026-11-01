import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../src/seed.json' with {type:'json'};
import {defaultWorkflow,submitLocal,saveAdminRequest,reportRows,readWorkflow} from '../src/workflow.js';
import {collectDraftLines,REQUEST_DATE} from '../src/draft-model.js';
import {sevenDays,calendarCells} from '../src/date-tools.js';
const branchId=seed.branches[0].id,item=seed.items[0];
const draft={[`${REQUEST_DATE}/${branchId}`]:{[item.id]:{quantity:'2',unit:'',snapshot:item}}};
const payload={branchId,date:REQUEST_DATE,submittedBy:'Test employee',nothingNeeded:false};
test('default delivery window has seven days and calendar handles month boundaries',()=>{
 assert.equal(defaultWorkflow().openDates.length,7);
 assert.deepEqual(sevenDays('2026-11-28'),['2026-11-28','2026-11-29','2026-11-30','2026-12-01','2026-12-02','2026-12-03','2026-12-04']);
 assert.equal(calendarCells('2028-02').filter(Boolean).length,29);
});
test('legacy short date windows expand once while preserving submissions and later date closures',()=>{
 const old={openDates:['2026-11-02'],submissions:{}};
 const upgraded=readWorkflow(JSON.stringify(old));assert.equal(upgraded.openDates.length,7);assert.equal(upgraded.openDates[0],'2026-11-02');
 upgraded.openDates=upgraded.openDates.filter(d=>d!=='2026-11-03');assert.equal(readWorkflow(JSON.stringify(upgraded)).openDates.length,6);
});
test('staff missing items remain request-only and are included in reports',()=>{
 const custom={id:'missing-test',name:'Special Sauce',shortName:'Special Sauce',categoryId:seed.categories[7].id,zoneId:'',sourceId:'',isNewItem:true};
 const drafts={[`${REQUEST_DATE}/${branchId}`]:{'missing-test':{quantity:'2',unit:'bottles',snapshot:custom,isNewItem:true}}};
 const w=submitLocal(defaultWorkflow(),seed,drafts,payload),lines=collectDraftLines(seed,reportRows({},w)).lines;
 assert.equal(lines[0].name,'Special Sauce');assert(lines[0].isNewItem);assert.equal(lines[0].zoneId,'');assert.equal(seed.items.length,81);
});
test('Admin corrections update canonical report rows and preserve original request in audit',()=>{
 const w=submitLocal(defaultWorkflow(),seed,draft,payload),receipt=w.submissions[`${REQUEST_DATE}/${branchId}`];
 const items=structuredClone(receipt.items);items[item.id].quantity='5';
 const next=saveAdminRequest(w,seed,{branchId,date:REQUEST_DATE,items,nothingNeeded:false,expectedVersion:receipt.version});
 assert.equal(collectDraftLines(seed,reportRows({},next)).lines[0].quantity,'5');assert.equal(next.audit[0].before.items[item.id].quantity,'2');assert.equal(receipt.items[item.id].quantity,'2');
 assert.throws(()=>saveAdminRequest(next,seed,{branchId,date:REQUEST_DATE,items,nothingNeeded:false,expectedVersion:receipt.version}),/changed/);
});
test('Admin can add/remove request items without modifying the master catalog',()=>{
 const w=submitLocal(defaultWorkflow(),seed,draft,payload),second=seed.items[1];
 const next=saveAdminRequest(w,seed,{branchId,date:REQUEST_DATE,nothingNeeded:false,expectedVersion:1,items:{[second.id]:{quantity:'3',unit:'',snapshot:second,masterItemId:second.id}}});
 const lines=collectDraftLines(seed,reportRows({},next)).lines;assert.equal(lines.length,1);assert.equal(lines[0].name,second.name);assert.equal(seed.items.length,81);
});
test('Admin manual entry occupies the same branch/date slot',()=>{
 const w=saveAdminRequest(defaultWorkflow(),seed,{branchId,date:REQUEST_DATE,items:{},nothingNeeded:true,expectedVersion:null});
 assert.throws(()=>submitLocal(w,seed,draft,payload),/already submitted/);
});
