import test from 'node:test';
import assert from 'node:assert/strict';
import {nextOpenDate} from '../src/date-tools.js';
import {defaultWorkflow,submitLocal} from '../src/workflow.js';
import seed from '../src/seed.json' with {type:'json'};
test('new day picks the next open delivery date and skips closed gaps',()=>{
 const dates=['2026-11-11','2026-11-09','2026-11-10'];
 assert.equal(nextOpenDate(dates,'2026-11-09'),'2026-11-09');
 assert.equal(nextOpenDate(dates,'2026-11-10'),'2026-11-10');
 assert.equal(nextOpenDate(['2026-11-09','2026-11-12'],'2026-11-10'),'2026-11-12');
 assert.equal(nextOpenDate(dates,'2026-11-12'),'');
});
test('advance submissions remain submitted when that delivery date arrives',()=>{
 const branchId=seed.branches[0].id;
 const w=submitLocal(defaultWorkflow(),seed,{}, {branchId,date:'2026-11-10',submittedBy:'Fixture',nothingNeeded:true},'2026-11-07T10:00:00Z');
 const date=nextOpenDate(w.openDates,'2026-11-10');
 assert(w.submissions[`${date}/${branchId}`].nothingNeeded);assert.equal(w.submissions[`${date}/${branchId}`].submittedAt,'2026-11-07T10:00:00Z');
});

test('branch submissions reject today and past Manila dates, allow tomorrow',()=>{
 const branchId=seed.branches[0].id, now='2026-11-08T16:05:00Z';
 const workflow={...defaultWorkflow(),openDates:['2026-11-08','2026-11-09','2026-11-10']};
 for(const date of ['2026-11-08','2026-11-09'])assert.throws(()=>submitLocal(workflow,seed,{}, {branchId,date,submittedBy:'Fixture',nothingNeeded:true},now),/Delivery starts tomorrow/);
 assert.ok(submitLocal(workflow,seed,{}, {branchId,date:'2026-11-10',submittedBy:'Fixture',nothingNeeded:true},now).submissions[`2026-11-10/${branchId}`]);
});
