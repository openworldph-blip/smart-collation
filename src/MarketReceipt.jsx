import React,{useMemo,useState} from 'react';
import {receiptSources,receiptImages} from './receipt-renderer.js';
import ImageActions from './ImageActions.jsx';

// Only this small, Admin-only notes value is persisted; orders and credentials stay on the server.
export function readBMPNotes(key){try{return {text:localStorage.getItem(key)||'',error:''};}catch{return {text:'',error:'Local storage is unavailable. Notes will stay only while this page is open.'};}}
export function writeBMPNotes(key,text){try{if(text)localStorage.setItem(key,text);else localStorage.removeItem(key);return '';}catch{return 'Notes could not be saved on this device. Keep this page open or export the BMP before leaving.';}}
export default function MarketReceipt({state,lines,date,canEditNotes=false,notesSession='requests'}){
 const notesKey=`smart-collation:x3-notes:v1:${notesSession}:${date}`;
 const [saved,setSaved]=useState(()=>canEditNotes?readBMPNotes(notesKey):{text:'',error:''});
 const notes=canEditNotes?saved.text:'';
 function changeNotes(text){setSaved({text,error:writeBMPNotes(notesKey,text)});}

 const sources=receiptSources(state,lines),bmps=useMemo(()=>receiptImages(state,lines,date,'bmp',notes),[state,lines,date,notes]);
 function print(){const images=receiptImages(state,lines,date);const win=window.open('','_blank');if(!win)return;win.document.write('<!doctype html><title>Market receipt</title><style>@page{size:auto;margin:3mm}body{width:48mm;margin:0;background:white}img{display:block;width:48mm;height:auto;page-break-after:always}img:last-child{page-break-after:auto}</style>'+images.map(i=>'<img src="'+i.url+'"/>').join(''));win.document.close();win.onload=()=>win.print();}
 return <section className="panel"><div className="section-heading"><h2>58 mm market receipt</h2><button className="button secondary" disabled={!sources.length} onClick={print}>Print receipt</button></div><p className="section-description">Print on 58 mm paper, or save and share the Xteink X3 BMP below. Totals stay blank when entries cannot be safely added.</p>{!sources.length&&<p>No Market items for this date.</p>}<h3>Xteink X3 BMP</h3><p className="section-description">528 x 792 pixels, black and white. Save each page to your reader.</p>{canEditNotes&&<div className="bmp-notes"><label className="field">Additional Notes<textarea rows={5} value={notes} onChange={e=>changeNotes(e.target.value)} placeholder="Extra grocery items, errands or reminders..." aria-describedby="bmp-notes-help"/></label><div className="section-heading"><small id="bmp-notes-help">Saved only on this device for this delivery date. Included in BMP only.</small><button type="button" className="button secondary small" disabled={!notes} onClick={()=>changeNotes('')}>Clear notes</button></div>{saved.error&&<p className="form-error" role="status">{saved.error}</p>}</div>}{(sources.length>0||notes.trim())&&bmps.map((image,i)=><div key={image.name}><ImageActions image={image} label={bmps.length>1?`Save BMP page ${i+1}`:'Save BMP for X3'}/><img className="receipt-image" src={image.url} alt={`X3 BMP receipt page ${i+1}`}/></div>)}</section>;
}
