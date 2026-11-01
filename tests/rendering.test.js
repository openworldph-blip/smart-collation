import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../src/seed.json' with {type:'json'};
import {renderReports} from '../src/report-renderer.js';
import {marketZone} from '../src/model.js';
test('long reports paginate, repeat date headers, and retain every item line',()=>{
 const original=globalThis.document;
 globalThis.document={createElement:()=>{
  const texts=[];
  const ctx={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},save(){},restore(){},translate(){},rotate(){},measureText:s=>({width:String(s).length*17}),fillText:(s,x,y)=>texts.push({text:s,x,y})};
  return {getContext:()=>ctx,toDataURL:()=>JSON.stringify(texts)};
 }};
 try{
  const lines=Array.from({length:210},(_,i)=>({branchId:seed.branches[0].id,itemId:'test-'+i,name:`Item ${i}`,shortName:`Item ${i}`,quantity:'2',unit:'',zoneId:marketZone(seed).id,sourceId:seed.sources[0].id}));
  const result=renderReports(seed,lines,'2026-11-09');
  for(const type of ['general','market']){
   assert(result[type].length>1);
   const pages=result[type].map(p=>JSON.parse(p.url));
   for(const texts of pages){assert(texts.some(t=>t.text.includes('MONDAY, NOVEMBER 9, 2026')));assert(texts.every(t=>t.y<=3400));assert(!texts.some(t=>t.text.includes('OPENWORLD')||t.text==='GENERAL MAP'||t.text==='MARKET SUMMARY'));}
   const entries=pages.flat().filter(t=>type==='general'?t.text.startsWith('•Item '):/^Item \d+$/.test(t.text));
   assert.equal(entries.length,210);assert.equal(new Set(entries.map(t=>t.text)).size,210);
  }
 }finally{globalThis.document=original;}
});
