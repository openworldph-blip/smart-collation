import React,{useMemo} from 'react';
import {marketGroups} from './draft-model.js';
import {sorted} from './model.js';
import {wrapText} from './report-renderer.js';
import ImageActions from './ImageActions.jsx';

export function receiptSources(state,lines){const groups=marketGroups(state,lines);return [...sorted(state.sources),{id:'',name:'Unassigned source'}].map(source=>({...source,rows:groups.filter(r=>(r.sourceId||'')===source.id).sort((a,b)=>a.name.localeCompare(b.name))})).filter(s=>s.rows.length);}
export function receiptImages(state,lines,date){
 const dt=new Date(date+'T12:00:00'),day=dt.toLocaleDateString('en-US',{weekday:'long'}).toUpperCase(),label='Del. Date: '+dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const headers=[{center:true,text:day},{center:true,text:label}];
 const commands=[...headers,...receiptSources(state,lines).flatMap(source=>[{source:true,text:source.name.toUpperCase()},...source.rows.map(row=>({name:row.name,total:row.total}))])];
 const measure=document.createElement('canvas').getContext('2d');const pages=[];let page=[],height=16;
 function textLines(c,ctx){return wrapText(ctx,c.text||(c.total?c.total+' \u2014 ':'')+c.name,360);}
 function finish(){if(!page.length)return;const canvas=document.createElement('canvas');canvas.width=384;canvas.height=height+12;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,384,canvas.height);ctx.fillStyle='black';ctx.textBaseline='top';let y=12;for(const c of page){ctx.font=c.source||c.center?'bold 20px Arial':'18px Arial';for(const t of textLines(c,ctx)){ctx.textAlign=c.center?'center':'left';ctx.fillText(t,c.center?192:12,y);if(c.source)ctx.fillRect(12,y+21,Math.min(360,ctx.measureText(t).width),1);y+=24;}}pages.push({name:`Market_Receipt_58mm_${date}_${pages.length+1}.jpg`,url:canvas.toDataURL('image/jpeg',.98)});page=[];height=16;}
 let source=null;for(const c of commands){measure.font=c.source||c.center?'bold 20px Arial':'18px Arial';const h=textLines(c,measure).length*24;if(height+h>11500){finish();page.push(...headers);height+=48;if(source&&!c.source){page.push(source);height+=textLines(source,measure).length*24;}}if(c.source)source=c;page.push(c);height+=h;}finish();return pages;
}
export default function MarketReceipt({state,lines,date}){
 const sources=receiptSources(state,lines),images=useMemo(()=>receiptImages(state,lines,date),[state,lines,date]);
 function print(){const win=window.open('','_blank');if(!win)return;win.document.write('<!doctype html><title>Market receipt</title><style>@page{size:auto;margin:3mm}body{width:48mm;margin:0;background:white}img{display:block;width:48mm;height:auto;page-break-after:always}img:last-child{page-break-after:auto}</style>'+images.map(i=>'<img src="'+i.url+'"/>').join(''));win.document.close();win.onload=()=>win.print();}
 return <section className="panel"><div className="section-heading"><h2>58 mm market receipt</h2><button className="button secondary" disabled={!sources.length} onClick={print}>Print receipt</button></div><p className="section-description">Tap Share image and choose Thermer for Bluetooth printing. Select 58 mm and fit to width. On iPhone, use Share image or Open image, then touch and hold to save. Totals stay blank when entries cannot be safely added.</p>{sources.length?images.map((image,i)=><div key={image.name}><ImageActions image={image} label={images.length>1?`Save receipt page ${i+1}`:'Save receipt JPG'}/><img className="receipt-image" src={image.url} alt={`58 mm market receipt page ${i+1}`}/></div>):<p>No Market items for this date.</p>}</section>;
}
