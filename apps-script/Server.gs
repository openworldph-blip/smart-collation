var structuredClone = function(value){return JSON.parse(JSON.stringify(value));};
var SC = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // apps-script/helpers-entry.js
  var helpers_entry_exports = {};
  __export(helpers_entry_exports, {
    saveAdminRequest: () => saveAdminRequest,
    submitLocal: () => submitLocal,
    validateState: () => validateState
  });

  // src/model.js
  var SCHEMA = 1;
  var marketZone = (state) => state.zones.find((z) => z.code === "market");
  function validateState(s) {
    if (!s || s.schemaVersion !== SCHEMA) throw Error("Unsupported backup format. Choose a Smart Collation catalog backup.");
    for (const key of ["branches", "categories", "items", "zones", "sources"]) {
      if (!Array.isArray(s[key]) || s[key].length > 2e3) throw Error(`Invalid ${key} list.`);
      const ids = /* @__PURE__ */ new Set();
      for (const r of s[key]) {
        if (!r || typeof r.id !== "string" || !r.id || ids.has(r.id)) throw Error(`Duplicate or invalid ID in ${key}.`);
        ids.add(r.id);
        if (typeof r.name !== "string" || !r.name.trim() || r.name.length > 160 || typeof r.active !== "boolean" || !Number.isInteger(r.order) || r.order < 0) throw Error(`Invalid record in ${key}.`);
      }
    }
    const refs = (key) => new Set(s[key].map((r) => r.id));
    const cats = refs("categories"), zones = refs("zones"), sources = refs("sources"), branches = refs("branches");
    if (!s.branches.length || !s.categories.length) throw Error("Keep at least one branch and one category.");
    for (const b of s.branches) if (typeof b.abbreviation !== "string" || b.abbreviation.length > 10) throw Error("Invalid branch report abbreviation.");
    if (s.zones.filter((z) => z.code === "market").length !== 1) throw Error("The Market purchasing zone must exist exactly once.");
    for (const r of [...s.categories, ...s.items]) {
      if (!r.visibility || Array.isArray(r.visibility) || typeof r.visibility !== "object") throw Error("Invalid branch visibility.");
      for (const [k, v] of Object.entries(r.visibility)) if (!branches.has(k) || typeof v !== "boolean") throw Error("Invalid visibility branch reference.");
    }
    for (const item of s.items) {
      if (!cats.has(item.categoryId) || item.zoneId && !zones.has(item.zoneId) || item.sourceId && !sources.has(item.sourceId)) throw Error("Item has an invalid category, zone, or source reference.");
      for (const key of ["unit", "shortName", "zoneId", "sourceId"]) if (typeof item[key] !== "string" || item[key].length > 160) throw Error("Invalid item details.");
      if (!Array.isArray(item.aliases) || item.aliases.length > 100 || item.aliases.some((a) => typeof a !== "string" || a.length > 160)) throw Error("Invalid item aliases.");
      if (item.sourceId && item.zoneId !== marketZone(s).id) throw Error("Only Market items can have a Market source.");
    }
    return s;
  }

  // src/draft-model.js
  function validQuantity(q) {
    return typeof q === "string" && q.length <= 80;
  }

  // src/date-tools.js
  function todayManila(now = /* @__PURE__ */ new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
    return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k).value).join("-");
  }

  // src/workflow.js
  function validDate(date) {
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + "T12:00:00Z")) && (/* @__PURE__ */ new Date(date + "T12:00:00Z")).toISOString().slice(0, 10) === date;
  }
  function submitLocal(workflow, state, drafts, { branchId, date, submittedBy, nothingNeeded }, now = (/* @__PURE__ */ new Date()).toISOString()) {
    if (!validDate(date) || !workflow.openDates.includes(date)) throw Error("Choose an Admin-opened delivery date first.");
    if (date <= todayManila(now)) throw Error("Delivery starts tomorrow. Choose tomorrow or a later delivery date.");
    if (!state.branches.some((b) => b.id === branchId && b.active)) throw Error("This branch is not active.");
    const key = `${date}/${branchId}`;
    if (workflow.submissions[key]) throw Error("This branch already submitted for this date.");
    if (!submittedBy.trim()) throw Error("Enter the employee name.");
    const rows = drafts[key] || {};
    if (!nothingNeeded && !Object.keys(rows).length) throw Error("Select items or choose Nothing needed.");
    const items = {};
    if (!nothingNeeded) for (const [itemId, row] of Object.entries(rows)) {
      if (!validQuantity(row.quantity)) throw Error("Keep quantity entries within 80 characters. Blank is allowed.");
      const item = state.items.find((i) => i.id === itemId) || row.snapshot;
      if (!item) throw Error("An item cannot be identified. Review your checklist.");
      items[itemId] = { quantity: row.quantity, unit: row.unit, snapshot: structuredClone(item), locked: true, masterItemId: row.masterItemId || (!item.isNewItem ? item.id : null), isNewItem: !!item.isNewItem };
    }
    const receipt = { date, branchId, submittedBy: submittedBy.trim(), submittedAt: now, nothingNeeded: !!nothingNeeded, items, version: 1 };
    return { ...workflow, revision: (workflow.revision || 0) + 1, submissions: { ...workflow.submissions, [key]: receipt } };
  }
  function saveAdminRequest(workflow, state, { branchId, date, items, nothingNeeded, expectedVersion }, now = (/* @__PURE__ */ new Date()).toISOString()) {
    if (!validDate(date) || !state.branches.some((b) => b.id === branchId)) throw Error("Choose a valid branch and delivery date.");
    const key = `${date}/${branchId}`, before = workflow.submissions[key];
    if (expectedVersion === null ? !!before : !before || (before.version || 0) !== expectedVersion) throw Error("This request changed since you opened it. Reload it before saving.");
    if (!nothingNeeded && !Object.keys(items).length) throw Error("Add at least one item, or mark Nothing needed.");
    const saved = {};
    if (!nothingNeeded) for (const [lineId, row] of Object.entries(items)) {
      if (!validQuantity(row.quantity)) throw Error("Keep quantity entries within 80 characters. Blank is allowed.");
      if (!row.snapshot?.name?.trim() || row.snapshot.name.length > 160) throw Error("Every item needs a name (up to 160 characters).");
      const snap = structuredClone(row.snapshot);
      snap.name = snap.name.trim();
      snap.shortName = snap.name;
      if (!state.categories.some((c) => c.id === snap.categoryId)) throw Error("Choose an item category.");
      if (snap.zoneId && !state.zones.some((z) => z.id === snap.zoneId)) throw Error("Choose a valid purchasing zone.");
      if (snap.sourceId && !state.sources.some((s) => s.id === snap.sourceId)) throw Error("Choose a valid Market source.");
      if (snap.zoneId !== state.zones.find((z) => z.code === "market").id) snap.sourceId = "";
      saved[lineId] = { ...row, quantity: row.quantity, unit: row.unit, snapshot: snap, locked: true, adminReviewed: true };
    }
    const after = { ...before, date, branchId, submittedBy: before?.submittedBy || "Admin manual entry", submittedAt: before?.submittedAt || now, nothingNeeded: !!nothingNeeded, items: saved, version: (before?.version || 0) + 1, reviewedAt: now, editedAt: now, origin: before?.origin || "admin" };
    return { ...workflow, revision: (workflow.revision || 0) + 1, submissions: { ...workflow.submissions, [key]: after }, audit: [{ date, branchId, at: now, actor: "Admin", action: "Edited branch request", before: before || null, after }, ...workflow.audit || []].slice(0, 100) };
  }
  return __toCommonJS(helpers_entry_exports);
})();

/* Smart Collation. Bound to the private spreadsheet. Deploy as owner, access Anyone.
 * Password verifiers and session records are never returned to the browser.
 * Run setup() as the spreadsheet owner before deployment. */
const DATABASE_ID='13vUilTWqrAwUAZ9lcAoo7rnFoSrnhI8RlTGuccpLjWU';
const SESSION_SECONDS=21600;
function db_(){return SpreadsheetApp.openById(DATABASE_ID);}
function props_(){return PropertiesService.getScriptProperties();}
function checkOwner_(){const active=Session.getActiveUser().getEmail();if(active!=='openworldph@gmail.com')throw Error('Only the Openworld spreadsheet owner can run setup.');}
function locked_(fn){const lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw Error('The server is busy. Please try again.');try{return fn();}finally{lock.releaseLock();}}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return json_({ok:true,service:'Smart Collation',version:1});}
function doPost(e){try{if(!e||!e.postData||e.postData.contents.length>750000)throw Error('Request is too large.');const p=JSON.parse(e.postData.contents);return json_({ok:true,data:locked_(function(){return dispatch_(p);})});}catch(err){return json_({ok:false,error:err.message||'Could not save. Try again.'});}}
function setup(){checkOwner_();locked_(function(){const p=props_();if(!p.getProperty('PEPPER'))p.setProperty('PEPPER',Utilities.getUuid()+Utilities.getUuid());db_().setSpreadsheetTimeZone('Asia/Manila');});SpreadsheetApp.getUi().createMenu('Smart Collation').addItem('Set / reset Admin password','showAdminSetup').addToUi();showAdminSetup();}
function onOpen(){SpreadsheetApp.getUi().createMenu('Smart Collation').addItem('Set / reset Admin password','showAdminSetup').addToUi();}
function showAdminSetup(){checkOwner_();SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('OwnerSetup').setWidth(380).setHeight(350),'Smart Collation · Admin password');}
function saveOwnerAdminPassword(record){checkOwner_();return locked_(function(){storeCredential_('admin',record);return true;});}
function hmac_(value){const p=props_().getProperty('PEPPER');if(!p)throw Error('The owner must run setup first.');return Utilities.computeHmacSha256Signature(value,p).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function credential_(scope){const raw=props_().getProperty('auth:'+scope);return raw?JSON.parse(raw):null;}
function storeCredential_(scope,r){if(!r||!(/^[a-f0-9]{32}$/).test(r.salt)||!(/^[a-f0-9]{64}$/).test(r.hash)||r.iterations!==160000)throw Error('Invalid password record.');const record={salt:r.salt,iterations:r.iterations,verifier:hmac_(r.hash),version:Utilities.getUuid()};props_().setProperty('auth:'+scope,JSON.stringify(record));return record;}
function equal_(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function authMetadata_(catalog){const admin=credential_('admin'),branches={};catalog.branches.forEach(function(b){const r=credential_(b.id);if(r)branches[b.id]={version:r.version};});return {admin:admin?{version:admin.version}:null,branches:branches};}
function session_(token){if(typeof token!=='string'||!(/^[a-f0-9-]{72}$/).test(token))throw Error('Please sign in again.');const cache=CacheService.getScriptCache(),raw=cache.get('session:'+hmac_(token));if(!raw)throw Error('Your session expired. Please sign in again.');const s=JSON.parse(raw),record=credential_(s.scope);if(!record||record.version!==s.version)throw Error('Access changed. Please sign in again.');if(s.scope!=='admin'){const b=read_('catalog').value.branches.find(function(b){return b.id===s.scope&&b.active;});if(!b)throw Error('This branch is inactive.');}return s;}
function requireAdmin_(s){if(!s||s.scope!=='admin')throw Error('Admin access is required.');}
function requireBranch_(s,branchId){if(!s||(s.scope!=='admin'&&s.scope!==branchId))throw Error('Sign in with this branch password first.');}
function heads_(){const sh=db_().getSheetByName('Heads');return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,5).getValues();}
function read_(key){const head=heads_().find(function(r){return r[0]===key;});if(!head)return {version:0,value:null};const rows=db_().getSheetByName('Records').getRange(Number(head[2]),1,Number(head[3]),4).getValues();if(rows.some(function(r,i){return r[0]!==key||Number(r[1])!==Number(head[1])||Number(r[2])!==i;}))throw Error('Saved record is incomplete. Contact Admin.');return {version:Number(head[1]),value:JSON.parse(rows.map(function(r){const value=String(r[3]);return value[0]==='~'?value.slice(1):value;}).join(''))};}
// New chunks are written before the single authoritative head is changed.
// An interrupted write leaves the previous revision available.
function write_(key,value,expected){const before=read_(key);if(before.version!==expected)throw Error('This record changed on another device. Reload before saving.');const json=JSON.stringify(value);if(json.length>700000)throw Error('Record exceeds the server size limit.');const ver=before.version+1,parts=[];for(let i=0;i<json.length;i+=30000)parts.push([key,ver,parts.length,'~'+json.slice(i,i+30000)]);const records=db_().getSheetByName('Records'),start=records.getLastRow()+1;ensureRows_(records,start+parts.length);records.getRange(start,1,parts.length,4).setValues(parts);SpreadsheetApp.flush();const heads=db_().getSheetByName('Heads'),rows=heads_(),index=rows.findIndex(function(r){return r[0]===key;});heads.getRange(index<0?heads.getLastRow()+1:index+2,1,1,5).setValues([[key,ver,start,parts.length,new Date().toISOString()]]);SpreadsheetApp.flush();return ver;}
function ensureRows_(sh,n){if(sh.getMaxRows()<n)sh.insertRowsAfter(sh.getMaxRows(),n-sh.getMaxRows()+100);}
function validDate_(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(new Date(date+'T12:00:00Z').getTime())&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
function today_(){return Utilities.formatDate(new Date(),'Asia/Manila','yyyy-MM-dd');}
function workflow_(s){const subs={};heads_().filter(function(h){return h[0].indexOf('request:')===0;}).forEach(function(h){const r=read_(h[0]).value,key=r.date+'/'+r.branchId;if(s&&(s.scope==='admin'||s.scope===r.branchId))subs[key]=r;else subs[key]={date:r.date,branchId:r.branchId,nothingNeeded:r.nothingNeeded,version:r.version,items:{},submittedBy:'',submittedAt:''};});return {openDates:read_('dates').value||[],submissions:subs,revision:0,audit:[],deliveryCalendarVersion:1};}
function snapshot_(s){const cat=read_('catalog'),wf=workflow_(s),drafts={},versions={};if(s)heads_().filter(function(h){return h[0].indexOf('draft:')===0&&(s.scope==='admin'||h[0].slice(-s.scope.length)===s.scope);}).forEach(function(h){const key=h[0].slice(6),r=read_(h[0]);drafts[key]=r.value;versions[key]=r.version;});return {catalog:cat.value,catalogVersion:cat.version,datesVersion:read_('dates').version,workflow:wf,drafts:drafts,draftVersions:versions,credentials:authMetadata_(cat.value),access:s?{role:s.scope==='admin'?'admin':'branch',branchId:s.scope==='admin'?null:s.scope,version:s.version}:null};}
function dispatch_(p){
 if(!p||typeof p.action!=='string')throw Error('Invalid request.');
 if(p.action==='snapshot')return snapshot_(p.token?session_(p.token):null);
 if(p.action==='challenge'){const scope=p.scope,r=credential_(scope);if(!r)throw Error('Admin has not configured this login yet.');const throttle=props_().getProperty('blocked:'+scope);if(throttle&&Number(throttle)>Date.now())throw Error('Too many login attempts. Please try again in 15 minutes.');return {salt:r.salt,iterations:r.iterations};}
 if(p.action==='login'){const scope=p.scope,r=credential_(scope);if(!r||typeof p.proof!=='string'||!(/^[a-f0-9]{64}$/).test(p.proof))throw Error('Incorrect password.');const props=props_(),until=Number(props.getProperty('blocked:'+scope)||0);if(until>Date.now())throw Error('Too many login attempts. Please try again in 15 minutes.');if(!equal_(hmac_(p.proof),r.verifier)){const cache=CacheService.getScriptCache(),n=Number(cache.get('attempts:'+scope)||0)+1;cache.put('attempts:'+scope,String(n),900);if(n>=8){props.setProperty('blocked:'+scope,String(Date.now()+900000));cache.remove('attempts:'+scope);}throw Error('Incorrect password.');}if(scope!=='admin'&&!read_('catalog').value.branches.some(function(b){return b.id===scope&&b.active;}))throw Error('Branch is inactive.');const token=Utilities.getUuid()+Utilities.getUuid(),s={scope:scope,version:r.version};CacheService.getScriptCache().put('session:'+hmac_(token),JSON.stringify(s),SESSION_SECONDS);return {token:token,snapshot:snapshot_(s)};}
 const s=session_(p.token);
 if(p.action==='logout'){CacheService.getScriptCache().remove('session:'+hmac_(p.token));return true;}
 if(p.action==='password'){requireAdmin_(s);if(!read_('catalog').value.branches.some(function(b){return b.id===p.branchId;}))throw Error('Unknown branch.');storeCredential_(p.branchId,p.record);return authMetadata_(read_('catalog').value);}
 if(p.action==='catalog'){requireAdmin_(s);const value=SC.validateState(p.catalog);write_('catalog',value,p.expectedVersion);return snapshot_(s);}
 if(p.action==='dates'){requireAdmin_(s);if(!Array.isArray(p.dates)||p.dates.length>366||p.dates.some(function(d){return !validDate_(d);}))throw Error('Choose valid delivery dates.');const old=read_('dates').value||[];if(p.dates.some(function(d){return d<=today_()&&old.indexOf(d)<0;}))throw Error('New delivery dates start tomorrow.');write_('dates',Array.from(new Set(p.dates)).sort(),p.expectedVersion);return snapshot_(s);}
 if(p.action==='draft'){requireBranch_(s,p.branchId);if(!validDate_(p.date)||p.date<=today_()||(read_('dates').value||[]).indexOf(p.date)<0)throw Error('Choose tomorrow or a later open delivery date.');if(read_('request:'+p.date+'/'+p.branchId).value)throw Error('This request is already submitted.');const rows=validateRows_(p.rows,read_('catalog').value,false);return {version:write_('draft:'+p.date+'/'+p.branchId,rows,p.expectedVersion)};}
 if(p.action==='submit'){requireBranch_(s,p.branchId);const cat=read_('catalog').value,key=p.date+'/'+p.branchId,draft=read_('draft:'+key);if(draft.version!==p.expectedDraftVersion)throw Error('The draft changed on another device. Reload before submitting.');const before=read_('request:'+key);const wf=workflow_(s),next=SC.submitLocal(wf,cat,{[key]:draft.value||{}},{branchId:p.branchId,date:p.date,submittedBy:p.submittedBy,nothingNeeded:p.nothingNeeded},new Date().toISOString());const receipt=next.submissions[key];write_('request:'+key,receipt,before.version);log_(receipt,cat);return snapshot_(s);}
 if(p.action==='adminRequest'){requireAdmin_(s);const cat=read_('catalog').value,items=validateRows_(p.items,cat,true),next=SC.saveAdminRequest(workflow_(s),cat,{branchId:p.branchId,date:p.date,items:items,nothingNeeded:p.nothingNeeded,expectedVersion:p.expectedVersion},new Date().toISOString()),key=p.date+'/'+p.branchId,receipt=next.submissions[key],before=read_('request:'+key);write_('request:'+key,receipt,before.version);log_(receipt,cat);return snapshot_(s);}
 throw Error('Unknown action.');
}
function validateRows_(rows,catalog,admin){if(!rows||typeof rows!=='object'||Array.isArray(rows)||Object.keys(rows).length>300)throw Error('Invalid request items.');const out={};Object.keys(rows).forEach(function(key){if(!/^[a-zA-Z0-9-]{1,100}$/.test(key))throw Error('Invalid item identifier.');const r=rows[key];if(!r||typeof r.quantity!=='string'||r.quantity.length>80||typeof r.unit!=='string'||r.unit.length>80)throw Error('Keep quantity and descriptions within 80 characters.');const master=catalog.items.find(function(i){return i.id===key;}),snap=admin?r.snapshot:master||r.snapshot;if(!snap||typeof snap.name!=='string'||!snap.name.trim()||snap.name.length>160||!catalog.categories.some(function(c){return c.id===snap.categoryId;}))throw Error('Invalid item name or category.');if(!admin&&!master&&!snap.isNewItem)throw Error('Unknown checklist item.');out[key]={quantity:r.quantity,unit:r.unit,snapshot:JSON.parse(JSON.stringify(snap)),masterItemId:master?master.id:(admin?r.masterItemId||null:null),isNewItem:!master&&!!snap.isNewItem,locked:!!admin,adminReviewed:!!admin};});return out;}
function safeCell_(s){return /^\s*[=+@-]/.test(String(s))?"'"+s:s;}
function log_(r,catalog){try{const sh=db_().getSheetByName('Request log'),branch=catalog.branches.find(function(b){return b.id===r.branchId;}),items=Object.values(r.items),rows=(items.length?items:[null]).map(function(row){return [r.date+'/'+r.branchId,r.date,branch?branch.name:r.branchId,r.nothingNeeded?'No request':'Submitted',safeCell_(r.submittedBy),r.editedAt||r.submittedAt,row?safeCell_(row.snapshot.name):'',row?safeCell_(row.quantity):'',row?safeCell_(row.unit):'',r.version];});ensureRows_(sh,sh.getLastRow()+rows.length);sh.getRange(sh.getLastRow()+1,1,rows.length,10).setNumberFormat('@').setValues(rows);}catch(err){console.warn('Request log projection could not be updated; canonical request is saved.');}}
