import {marketGroups} from './draft-model.js';
import {sorted} from './model.js';
import {wrapText} from './report-renderer.js';
import {bmpDataURL} from './bmp.js';
export function receiptFilename(date,format,page=0){const d=new Date(date+'T12:00:00');return `${d.getDate()}${d.toLocaleDateString('en-US',{month:'short'}).toLowerCase()}marketsum${page?'-'+(page+1):''}.${format}`;}
export function receiptSources(state,lines){const groups=marketGroups(state,lines);return [...sorted(state.sources),{id:'',name:'Unassigned source'}].map(source=>({...source,rows:groups.filter(r=>(r.sourceId||'')===source.id).sort((a,b)=>a.name.localeCompare(b.name))})).filter(s=>s.rows.length);}
export function receiptImages(state,lines,date,format='jpg',notes=''){
 const dt=new Date(date+'T12:00:00'),day=dt.toLocaleDateString('en-US',{weekday:'long'}).toUpperCase(),label='Del. Date: '+dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const headers=[{center:true,text:day},{center:true,text:label}];
 const bmp=format==='bmp',W=bmp?528:384,margin=bmp?16:12,step=bmp?30:24,font=bmp?24:18,heading=bmp?25:20,maxHeight=bmp?748:11500;
 const measure=document.createElement('canvas').getContext('2d');const pages=[];let page=[],height=16,source=null,inNotes=false;
 function setFont(ctx,c){ctx.font=c.source||c.center||c.notesHeading?`bold ${heading}px Arial`:`${font}px Arial`;}
 function textLines(c){setFont(measure,c);return wrapText(measure,c.text??((c.total?c.total+' \u2014 ':'')+c.name),W-margin*2);}
 function add(c){page.push(c);height+=c.rule?10:step;}
 function finish(){
  if(!page.length)return;const canvas=document.createElement('canvas');canvas.width=W;canvas.height=bmp?792:height+12;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,W,canvas.height);ctx.fillStyle='black';ctx.textBaseline='top';let y=12;
  for(const c of page){if(c.rule){ctx.fillRect(margin,y+4,W-margin*2,2);y+=10;continue;}setFont(ctx,c);ctx.textAlign=c.center?'center':'left';ctx.fillText(c.text,c.center?W/2:margin,y);if(c.source)ctx.fillRect(margin,y+heading+1,Math.min(W-margin*2,ctx.measureText(c.text).width),1);y+=step;}
  pages.push({name:receiptFilename(date,format,pages.length),url:bmp?bmpDataURL(canvas):canvas.toDataURL('image/jpeg',.98)});page=[];height=16;
 }
 function repeat(c){for(const text of textLines(c))add({...c,text});}
 function nextPage(){finish();headers.forEach(repeat);if(inNotes)repeat({notesHeading:true,text:'ADDITIONAL NOTES (CONT.)'});else if(source)repeat({source:true,text:source.name.toUpperCase()});}
 headers.forEach(repeat);
 for(const group of receiptSources(state,lines)){
  const title={source:true,text:group.name.toUpperCase()},titleRows=textLines(title);
  if(height+(titleRows.length+1)*step>maxHeight){source=null;nextPage();}
  source=group;titleRows.forEach(text=>add({...title,text}));
  for(const row of group.rows)for(const text of textLines(row)){if(height+step>maxHeight)nextPage();add({text});}
 }
 // Notes are BMP-only and never enter marketGroups or purchasing records.
 if(bmp&&notes.trim()){
  const rows=notes.replace(/\r\n?/g,'\n').split('\n').flatMap(text=>textLines({text}).length?textLines({text}):['']);
  source=null;
  // Keep the divider, heading and first notes line on the same page.
  if(height+10+step*2>maxHeight)nextPage();
  add({rule:true});add({notesHeading:true,text:'ADDITIONAL NOTES'});inNotes=true;
  for(const text of rows){if(height+step>maxHeight)nextPage();add({text});}
 }
 finish();return pages;
}
