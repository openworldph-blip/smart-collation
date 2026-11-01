import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../src/seed.json' with {type:'json'};
import {validQuantity,isNumericQuantity,totalQuantities,collectDraftLines,marketGroups,REQUEST_DATE} from '../src/draft-model.js';
import {marketZone} from '../src/model.js';
test('number-only quantity is valid and optional unit remains blank',()=>{
 const b=seed.branches[0],item=seed.items[0];
 const drafts={[`${REQUEST_DATE}/${b.id}`]:{[item.id]:{quantity:'2',unit:''}}};
 const r=collectDraftLines(seed,drafts);assert.equal(r.errors.length,0);assert.equal(r.lines[0].unit,'');assert.equal(r.lines[0].quantity,'2');
});
test('optional free-text quantities are accepted; only plain numbers are totaled',()=>{
 for(const q of ['2','0.5','.5','12.125','','0','1 tab','2 packs','special unit'])assert(validQuantity(q));
 for(const q of ['','1 tab','2 packs','1e3'])assert(!isNumericQuantity(q));
 assert(!validQuantity('x'.repeat(81)));
 assert.equal(totalQuantities(['0.1','0.2']),'0.3');
});
test('Market totals keep unspecified and incompatible units separate',()=>{
 const s=structuredClone(seed),b=s.branches[0];s.items[0].zoneId=marketZone(s).id;
 const base={branchId:b.id,itemId:s.items[0].id,name:'Example',zoneId:marketZone(s).id,sourceId:''};
 const rows=marketGroups(s,[{...base,quantity:'2',unit:''},{...base,quantity:'3',unit:'kg'},{...base,quantity:'4',unit:'pack'}]);
 assert.equal(rows.length,3);assert.deepEqual(rows.map(r=>r.total),['2','3','4']);
});
test('blank quantities remain blank in output without warnings or zeroes',()=>{
 const b=seed.branches[0],item=seed.items[0];
 const r=collectDraftLines(seed,{[`${REQUEST_DATE}/${b.id}`]:{[item.id]:{quantity:'',unit:''}}});
 assert.equal(r.errors.length,0);assert.equal(r.lines.length,1);assert.equal(r.lines[0].quantity,'');
});
test('Market copies typed units verbatim and leaves nonnumeric totals blank',()=>{
 const b=seed.branches[0],item=seed.items[0],zoneId=marketZone(seed).id;
 const lines=[{branchId:b.id,itemId:item.id,name:item.name,quantity:'1 tab',unit:'',zoneId,sourceId:''},{branchId:seed.branches[1].id,itemId:item.id,name:item.name,quantity:'',unit:'',zoneId,sourceId:''}];
 const row=marketGroups(seed,lines)[0];assert.equal(row.allocations[b.id],'1 tab');assert.equal(row.allocations[seed.branches[1].id],'');assert.equal(row.total,'');
});
