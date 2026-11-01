import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';
import seed from '../src/seed.json' with {type:'json'};

function harness(){
 const sheets={},properties=new Map(),cache=new Map();
 class Sheet{constructor(headers){this.rows=[headers];this.max=1000;}getLastRow(){return this.rows.length;}getMaxRows(){return this.max;}insertRowsAfter(n,count){this.max+=count;}getRange(row,col,height,width){const sheet=this;return {getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>sheet.rows[row-1+i]?.[col-1+j]??''));},setValues(values){for(let i=0;i<height;i++){sheet.rows[row-1+i]??=[];for(let j=0;j<width;j++)sheet.rows[row-1+i][col-1+j]=values[i][j];}return this;},setNumberFormat(){return this;}};}}
 sheets.Heads=new Sheet(['Key','Revision','Start row','Chunk count','Updated at']);sheets.Records=new Sheet(['Key','Revision','Chunk','JSON']);sheets['Request log']=new Sheet(['Request key','Delivery date','Branch','Status','Submitted by','Saved at','Item','Qty','Unit','Version']);
 const context=vm.createContext({console,Date,Intl,JSON,Map,Set,TextEncoder,Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:(d,tz)=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return ['year','month','day'].map(k=>p.find(p=>p.type===k).value).join('-');},computeHmacSha256Signature:(s,k)=>[...crypto.createHmac('sha256',k).update(s).digest()]},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>properties.set(k,v)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets[n]}),flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})}});
 vm.runInContext(fs.readFileSync(new URL('../apps-script/Helpers.gs',import.meta.url),'utf8'),context);
 vm.runInContext(fs.readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8'),context);
 properties.set('PEPPER','synthetic-test-only-secret');
 const tomorrow=new Date();tomorrow.setUTCDate(tomorrow.getUTCDate()+2);const date=tomorrow.toISOString().slice(0,10);
 context.write_('catalog',seed,0);context.write_('dates',[date],0);
 const a=seed.branches[0].id,b=seed.branches[1].id,proof='a'.repeat(64),record={salt:'b'.repeat(32),hash:proof,iterations:160000};
 for(const scope of ['admin',a,b])context.storeCredential_(scope,record);
 const login=scope=>context.dispatch_({action:'login',scope,proof}).token;
 const call=(token,action,payload={})=>context.dispatch_({token,action,...payload});
 return {context,date,a,b,proof,login,call,sheets,properties};
}
test('server denies cross-branch drafts and Admin operations; public status has no item details',()=>{
 const h=harness(),token=h.login(h.a),item=seed.items[0],rows={[item.id]:{quantity:'1 tab',unit:'',snapshot:item}};
 assert.throws(()=>h.call(token,'draft',{date:h.date,branchId:h.b,rows,expectedVersion:0}),/branch password/);
 assert.throws(()=>h.call(token,'catalog',{catalog:seed,expectedVersion:1}),/Admin access/);
 const result=h.call(token,'draft',{date:h.date,branchId:h.a,rows,expectedVersion:0});
 h.call(token,'submit',{date:h.date,branchId:h.a,submittedBy:'Fixture',nothingNeeded:false,expectedDraftVersion:result.version});
 const own=h.call(token,'snapshot'),publicView=h.context.dispatch_({action:'snapshot'}),other=h.call(h.login(h.b),'snapshot');
 assert.equal(own.workflow.submissions[h.date+'/'+h.a].items[item.id].quantity,'1 tab');
 for(const view of [publicView,other]){assert.equal(Object.keys(view.workflow.submissions[h.date+'/'+h.a].items).length,0);assert.equal(view.workflow.submissions[h.date+'/'+h.a].submittedBy,'');assert.equal(Object.keys(view.drafts).length,0);}
 assert.equal(JSON.stringify(publicView).includes('verifier'),false);assert.equal(JSON.stringify(publicView).includes(h.proof),false);
});
test('draft revisions reject another phone overwriting a newer edit; duplicate submit is rejected',()=>{
 const h=harness(),token=h.login(h.a),item=seed.items[0],rows={[item.id]:{quantity:'',unit:'',snapshot:item}},payload={date:h.date,branchId:h.a,rows,expectedVersion:0};
 h.call(token,'draft',payload);assert.throws(()=>h.call(token,'draft',payload),/changed on another device/);
 assert.throws(()=>h.call(token,'submit',{date:h.date,branchId:h.a,submittedBy:'Fixture',nothingNeeded:false,expectedDraftVersion:0}),/draft changed/);
 const p={date:h.date,branchId:h.a,submittedBy:'Fixture',nothingNeeded:false,expectedDraftVersion:1};
 const saved=h.call(token,'submit',p);assert.equal(saved.workflow.submissions[h.date+'/'+h.a].items[item.id].quantity,'');
 assert.throws(()=>h.call(token,'submit',p),/already submitted/);
});
test('server enforces Philippine date cutoff and server-only passwords invalidate earlier branch sessions',()=>{
 const h=harness(),token=h.login(h.a),today=h.context.today_();h.context.write_('dates',[today,h.date],1);
 assert.throws(()=>h.call(token,'draft',{date:today,branchId:h.a,rows:{},expectedVersion:0}),/tomorrow/);
 h.call(h.login('admin'),'password',{branchId:h.a,record:{salt:'c'.repeat(32),hash:'d'.repeat(64),iterations:160000}});
 assert.throws(()=>h.call(token,'snapshot'),/Access changed/);
});
test('chunked records preserve data larger than a spreadsheet cell and reject stale updates',()=>{
 const h=harness(),data={text:'x'.repeat(75000)};h.context.write_('fixture',data,0);
 assert.equal(h.context.read_('fixture').value.text,data.text);
 assert.throws(()=>h.context.write_('fixture',{text:'wrong'},0),/changed on another device/);
 assert.equal(h.context.read_('fixture').value.text.length,75000);
});
test('Admin corrections retain receipt snapshots and request revisions; safe log cells do not become formulas',()=>{
 const h=harness(),token=h.login(h.a);h.call(token,'submit',{date:h.date,branchId:h.a,submittedBy:'=not-a-formula',nothingNeeded:true,expectedDraftVersion:0});
 const admin=h.login('admin'),before=h.call(admin,'snapshot').workflow.submissions[h.date+'/'+h.a];
 const after=h.call(admin,'adminRequest',{date:h.date,branchId:h.a,items:{},nothingNeeded:true,expectedVersion:before.version});
 assert.equal(after.workflow.submissions[h.date+'/'+h.a].version,2);
 assert.equal(h.sheets['Request log'].rows[1][4],"'=not-a-formula");
 assert.equal(h.sheets.Records.rows.filter(r=>r[0]==='request:'+h.date+'/'+h.a).length,2);
});
test('frontend entry point has no persistent browser storage',()=>{
 const code=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')+fs.readFileSync(new URL('../src/shared-api.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/localStorage|sessionStorage|indexedDB/);
});
