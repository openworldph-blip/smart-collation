// Isolated fixture UI. No credentials, localStorage, real records or app sign-in bypass.
// Not included in the production build, whose only entry is index.html.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import seed from '../src/seed.json';
import BranchChecklist from '../src/BranchChecklist.jsx';
import BranchRequests from '../src/BranchRequests.jsx';
import PurchasingDates from '../src/PurchasingDates.jsx';
import {defaultWorkflow,submitLocal,saveAdminRequest} from '../src/workflow.js';
import '../src/styles.css';
function QA(){const [workflow,setWorkflow]=useState(defaultWorkflow),[drafts,setDrafts]=useState({}),[view,setView]=useState('branch');return <><div className="local-notice">ISOLATED QA · FIXTURE DATA ONLY <button onClick={()=>setView('branch')}>Branch fixture</button><button onClick={()=>setView('admin')}>Admin request fixture</button><button onClick={()=>setView('dates')}>Calendar fixture</button></div>{view==='branch'?<BranchChecklist state={seed} branchId={seed.branches[0].id} drafts={drafts} workflow={workflow} onDate={()=>{}} onHome={()=>setView('admin')} onChange={(key,rows)=>setDrafts(d=>({...d,[key]:rows}))} onSubmit={p=>setWorkflow(w=>submitLocal(w,seed,drafts,p))}/>:<main className="workspace">{view==='dates'?<PurchasingDates workflow={workflow} onSave={w=>{setWorkflow(w);return true;}}/>:<BranchRequests state={seed} drafts={drafts} workflow={workflow} onSave={p=>{const w=saveAdminRequest(workflow,seed,p);setWorkflow(w);return w.submissions[`${p.date}/${p.branchId}`];}} onPromote={()=>{throw Error('Catalog promotion is not enabled in this read-only seed fixture.');}}/>}</main>}</>;}
createRoot(document.getElementById('root')).render(<QA/>);
