import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../src/seed.json' with {type:'json'};
import {visibleItems,validateState,setVisibility,removeCategory,mergeItems,updateRecord,moveRecord} from '../src/model.js';
test('verified form seed has 81 entries and nine shared categories',()=>{
 assert.equal(validateState(seed),seed);assert.equal(seed.items.length,81);assert.equal(seed.categories.length,9);
});
test('category AND item visibility; hidden catalog search does not change switches',()=>{
 const b=seed.branches[0].id,item=seed.items[0];
 let s=setVisibility(seed,'categories',item.categoryId,b,false);
 assert(!visibleItems(s,b).some(i=>i.id===item.id));
 assert(visibleItems(s,b,item.name,true).some(i=>i.id===item.id));
 s=setVisibility(s,'categories',item.categoryId,b,true);s=setVisibility(s,'items',item.id,b,false);
 assert(!visibleItems(s,b).some(i=>i.id===item.id));assert(seed.items[0].visibility[b]);
});
test('nonempty category cannot be deleted even when items inactive',()=>{
 const s=structuredClone(seed);s.items[0].active=false;
 assert.throws(()=>removeCategory(s,s.items[0].categoryId),/Move all items/);
 const empty=s.categories.find(c=>!s.items.some(i=>i.categoryId===c.id));
 assert.equal(removeCategory(s,empty.id).categories.length,8);
});
test('duplicate merge keeps target settings and records aliases without mutating old snapshot',()=>{
 const s=structuredClone(seed),a=s.items[0],b=s.items[1];b.unit='pack';
 const m=mergeItems(s,a.id,b.id),target=m.items.find(i=>i.id===b.id);
 assert.equal(m.items.length,80);assert.equal(target.unit,'pack');assert(target.aliases.includes(a.name));assert.equal(s.items.length,81);
 assert.throws(()=>mergeItems(s,a.id,a.id));
});
test('restore rejects duplicate IDs, dangling references and invalid visibility types',()=>{
 for(const mutate of [s=>s.items.push(s.items[0]),s=>s.items[0].categoryId='missing',s=>s.items[0].visibility[s.branches[0].id]='yes',s=>s.schemaVersion=99]) {
  const s=structuredClone(seed);mutate(s);assert.throws(()=>validateState(s));
 }
});
test('renames preserve item identity and reject duplicate names; reorder persists',()=>{
 const item=seed.items[0],s=updateRecord(seed,'items',{...item,name:'New name'});
 assert.equal(s.items[0].id,item.id);assert.equal(seed.items[0].name,item.name);
 assert.throws(()=>updateRecord(seed,'items',{...item,name:seed.items[1].name}),/already exists/);
 assert.equal(moveRecord(seed,'branches',seed.branches[0].id,1).branches[1].id,seed.branches[0].id);
});
