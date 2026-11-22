import {marketGroups} from './draft-model.js';
import {sorted} from './model.js';
import {wrapText} from './report-renderer.js';
import {bmpDataURL} from './bmp.js';
export function receiptFilename(date,format,page=0){const d=new Date(date+'T12:00:00');return `${d.getDate()}${d.toLocaleDateString('en-US',{month:'short'}).toLowerCase()}marketsum${page?'-'+(page+1):''}.${format}`;}
export function receiptSources(state,lines){const groups=marketGroups(state,lines);return [...sorted(state.sources),{id:'',name:'Unassigned source'}].map(source=>({...source,rows:groups.filter(r=>(r.sourceId||'')===source.id).sort((a,b)=>a.name.localeCompare(b.name))})).filter(s=>s.rows.length);}
export function receiptImages(state,lines,date,format='jpg'){
 const dt=new Date(date+'T12:00:00'),day=dt.toLocaleDateString('en-US',{weekday:'long'}).toUpperCase(),label='Del. Date: '+dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const headers=[{center:true,text:day},{center:true,text:label}];
 const commands=[...headers,...receiptSources(state,lines).flatMap(source=>[{source:true,text:source.name.toUpperCase()},...source.rows.map(row=>({name:row.name,total:row.total}))])];
 const bmp=format==='bmp',W=bmp?528:384,margin=bmp?16:12,step=bmp?30:24,font=bmp?24:18,heading=bmp?25:20,maxHeight=bmp?748:11500;
 const measure=document.createElement('canvas').getContext('2d');const pages=[];let page=[],height=16;
 function textLines(c,ctx){return wrapText(ctx,c.text||(c.total?c.total+' \u2014 ':'')+c.name,W-margin*2);}
 function finish(){if(!page.length)return;const canvas=document.createElement('canvas');canvas.width=W;canvas.height=bmp?792:height+12;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,W,canvas.height);ctx.fillStyle='black';ctx.textBaseline='top';let y=12;for(const c of page){ctx.font=c.source||c.center?`bold ${heading}px Arial`:`${font}px Arial`;for(const t of textLines(c,ctx)){ctx.textAlign=c.center?'center':'left';ctx.fillText(t,c.center?W/2:margin,y);if(c.source)ctx.fillRect(margin,y+heading+1,Math.min(W-margin*2,ctx.measureText(t).width),1);y+=step;}}pages.push({name:receiptFilename(date,format,pages.length),url:bmp?bmpDataURL(canvas):canvas.toDataURL('image/jpeg',.98)});page=[];height=16;}
 let source=null;for(const c of commands){measure.font=c.source||c.center?`bold ${heading}px Arial`:`${font}px Arial`;const h=textLines(c,measure).length*step;if(height+h>maxHeight){finish();page.push(...headers);height+=step*2;if(source&&!c.source){page.push(source);height+=textLines(source,measure).length*step;}}if(c.source)source=c;page.push(c);height+=h;}finish();return pages;
}
