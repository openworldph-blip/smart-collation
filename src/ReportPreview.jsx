import React,{useMemo,useState} from 'react';
import {Download,Eye,ArrowRight} from 'lucide-react';
import {collectDraftLines,REQUEST_DATE} from './draft-model.js';
import {renderReports} from './report-renderer.js';
import {allDates,reportRows} from './workflow.js';
import {layoutExample} from './layout-example.js';
import DateCards,{fullDate} from './DateCards.jsx';
export default function ReportPreview({state,drafts,workflow,initialDate,onChecklist}){
 const [type,setType]=useState('general'),[mode,setMode]=useState('requests'),[date,setDate]=useState(initialDate||allDates(workflow)[0]||REQUEST_DATE);
 const availableDates=[...new Set([date,...allDates(workflow)])].sort();
 const effective=useMemo(()=>reportRows({},workflow),[drafts,workflow]);
 const {lines,errors}=useMemo(()=>collectDraftLines(state,effective,date),[state,effective,date]);
 const output=useMemo(()=>{if(mode==='requests'&&errors.length)return {};try{const example=mode==='examples'?layoutExample():null;return {reports:renderReports(example?.state||state,example?.lines||lines,date)}}catch(e){return {error:e.message}}},[state,lines,errors,date,mode]);
 const images=output.reports?.[type]||[],unclassified=lines.filter(l=>!l.zoneId).length;
 const receipts=Object.values(workflow.submissions).filter(r=>r.date===date);
 return <><header className="page-heading"><div><div className="eyebrow">PURCHASING OUTPUT</div><h1>Reports & output</h1><p>Exactly two reports. Output pages show only the Request For date above the table.</p></div></header><label className="field report-date-picker">Delivery date<select aria-label="Report delivery date" value={date} onChange={e=>setDate(e.target.value)}>{availableDates.map(d=><option key={d} value={d}>{fullDate(d)}</option>)}</select></label><DateCards requestDate={date}/><div className="report-controls"><div className="segmented"><button className={type==='general'?'selected':''} onClick={()=>setType('general')}>General Map</button><button className={type==='market'?'selected':''} onClick={()=>setType('market')}>Market Summary</button></div><label className="field">Preview data<select value={mode} onChange={e=>setMode(e.target.value)}><option value="requests">Submitted requests</option><option value="examples">Sample layout examples</option></select></label></div>
 {mode==='examples'?<div className="info-strip">Illustrative sample quantities and assignments. These are layout examples, not actual orders. The type of report is shown here and in its filename, to save space on the JPEG.</div>:<><div className="info-strip">{lines.length} selected items for this date · {receipts.length} branches submitted. {unclassified>0?`${unclassified} items need a purchasing zone; General Map keeps them under Needs classification.`:'Unit descriptions are optional.'} Reports use submitted requests only. Drafts are excluded.</div>{!lines.length&&!errors.length&&<div className="panel report-empty"><h2>No items requested for this date yet.</h2><p>Choose a branch and a Request For date to enter a request, or switch to Sample layout examples.</p><button className="button secondary" onClick={onChecklist}>Choose a branch<ArrowRight size={17}/></button></div>}{errors.length>0&&<div className="form-error" role="alert"><strong>Review these entries before generating output:</strong><ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}</>}
 {output.error&&<div className="form-error" role="alert">{output.error}</div>}{images.map((image,i)=><section className="report-page" key={image.name}><div className="section-heading"><span><Eye size={17}/>{type==='general'?'General Map':'Market Summary'} · Page {i+1} / {images.length}</span><a className="button secondary" href={image.url} download={mode==='examples'?'Example_'+image.name:image.name}><Download size={17}/>Download JPG</a></div><img src={image.url} alt={`${type==='general'?'General Map':'Market Summary'} A4 portrait preview page ${i+1}`}/></section>)}
 </>;
}
