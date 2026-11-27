import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBMP} from '../src/bmp.js';
import {receiptFilename,receiptImages} from '../src/receipt-renderer.js';
import seed from '../src/seed.json' with {type:'json'};
import {marketZone} from '../src/model.js';
test('BMP is a genuine uncompressed bottom-up image with padded rows',()=>{
 const b=encodeBMP(1,2,new Uint8ClampedArray([0,0,0,255,255,255,255,255])),v=new DataView(b.buffer);
 assert.equal(String.fromCharCode(...b.slice(0,2)),'BM');assert.equal(v.getUint32(2,true),62);
 assert.equal(v.getUint32(10,true),54);assert.equal(v.getUint16(28,true),24);assert.equal(v.getUint32(30,true),0);
 assert.deepEqual([...b.slice(54)],[255,255,255,0,0,0,0,0]);
 assert.equal(receiptFilename('2026-11-23','bmp'),'23novmarketsum.bmp');
 assert.equal(receiptFilename('2026-11-23','jpg',1),'23novmarketsum-2.jpg');
});

test('BMP notes preserve breaks, wrap and paginate without changing JPGs or purchasing data',()=>{
 const original=globalThis.document,pages=[];
 globalThis.document={createElement:()=>{const text=[],rects=[],canvas={width:0,height:0};canvas.getContext=()=>({measureText:t=>({width:String(t).length*12}),fillRect:(...r)=>rects.push(r),fillText:(t,x,y)=>text.push({t,x,y}),getImageData(){pages.push({text,rects,w:canvas.width,h:canvas.height});return {data:new Uint8ClampedArray(canvas.width*canvas.height*4).fill(255)};}});canvas.toDataURL=()=>JSON.stringify({text,rects});return canvas;}};
 try{
  const lines=Array.from({length:20},(_,i)=>({branchId:seed.branches[0].id,itemId:'note-'+i,name:'Item '+i,quantity:'2',unit:'',zoneId:marketZone(seed).id,sourceId:seed.sources[0].id}));
  const before=JSON.stringify({seed,lines}),notes='First reminder\r\n\r\nSecond reminder\n'+'Z'.repeat(2000);
  receiptImages(seed,lines,'2026-11-23','bmp',notes);
  const start=pages.findIndex(p=>p.text.some(c=>c.t==='ADDITIONAL NOTES'));
  assert.equal(start,1,'divider and heading move off a nearly full list page');
  const p=pages[start],divider=p.rects.find(r=>r[2]===496&&r[3]===2),heading=p.text.find(c=>c.t==='ADDITIONAL NOTES'),first=p.text.find(c=>c.t==='First reminder'),second=p.text.find(c=>c.t==='Second reminder');
  assert(divider);assert(divider[1]<heading.y&&heading.y<first.y);
  assert.equal(first.y-heading.y,30);assert.equal(second.y-first.y,60,'blank line preserved');
  const all=pages.flatMap(p=>p.text);assert.equal(all.filter(c=>/^Z+$/.test(c.t)).map(c=>c.t).join(''),'Z'.repeat(2000));
  assert(pages.length>2);for(const p of pages){assert.equal(p.w,528);assert.equal(p.h,792);assert(p.text.every(c=>c.y+30<=792));}
  assert(pages.slice(start+1).every(p=>p.text.some(c=>c.t==='ADDITIONAL NOTES (CONT.)')));
  assert(!pages.slice(start+1).some(p=>p.text.some(c=>c.t===seed.sources[0].name.toUpperCase())));
  const jpg=receiptImages(seed,lines,'2026-11-23','jpg',notes);
  assert.deepEqual(jpg,receiptImages(seed,lines,'2026-11-23','jpg'));
  assert.equal(JSON.stringify({seed,lines}),before);
  pages.length=0;receiptImages(seed,lines,'2026-11-23','bmp',' \n\t');
  assert(!pages.some(p=>p.rects.some(r=>r[2]===496&&r[3]===2)||p.text.some(c=>c.t.includes('ADDITIONAL NOTES'))));
  pages.length=0;receiptImages(seed,[],'2026-11-23','bmp','Notes without orders');
  assert(pages[0].text.some(c=>c.t==='Notes without orders'));
 }finally{globalThis.document=original;}
});
test('X3 pages repeat date/source, fit screen and retain every item',()=>{
 const original=globalThis.document,pages=[];
 globalThis.document={createElement:()=>{const text=[],canvas={width:0,height:0};canvas.getContext=()=>({measureText:t=>({width:String(t).length*12}),fillRect(){},fillText:(t,x,y)=>text.push({t,x,y}),getImageData(){pages.push({text,w:canvas.width,h:canvas.height});return {data:new Uint8ClampedArray(canvas.width*canvas.height*4).fill(255)};}});return canvas;}};
 try{
 const lines=Array.from({length:80},(_,i)=>({branchId:seed.branches[0].id,itemId:'bmp-'+i,name:'Item '+i,quantity:'2',unit:'',zoneId:marketZone(seed).id,sourceId:seed.sources[0].id}));
 const images=receiptImages(seed,lines,'2026-11-23','bmp');assert(images.length>1);
 assert.equal(pages.flatMap(p=>p.text).filter(c=>/Item \d+$/.test(c.t)).length,80);
 for(const p of pages){assert.equal(p.w,528);assert.equal(p.h,792);assert(p.text.some(c=>c.t==='MONDAY'));assert(p.text.some(c=>c.t.startsWith('Del. Date:')));assert(p.text.every(c=>c.y<760));}
 }finally{globalThis.document=original;}
});
