import {sorted} from './model.js';
import {marketGroups} from './draft-model.js';
export function wrapText(ctx,text,width){
 const lines=[];let current='';
 for(const word of String(text).split(' ')){
  const next=current?current+' '+word:word;
  if(ctx.measureText(next).width<=width){current=next;continue;}
  if(current){lines.push(current);current='';}
  for(const char of word){if(current&&ctx.measureText(current+char).width>width){lines.push(current);current='';}current+=char;}
 }
 if(current)lines.push(current);return lines;
}
export function renderReports(state,lines,date){
 const W=2480,H=3508,left=120,right=2360,bottom=3230,pages={market:[],general:[]};
 const branches=sorted(state.branches).filter(b=>b.active||lines.some(l=>l.branchId===b.id));
 const panels=[];for(let i=0;i<branches.length;i+=5)panels.push(branches.slice(i,i+5));if(!panels.length)panels.push([]);
 const fullDate=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(date+'T12:00:00+08:00')).toUpperCase();
 function start(type,panelIndex){
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.fillStyle='black';ctx.textBaseline='top';
  ctx.font='bold 40px Arial';ctx.fillText('REQUEST FOR: '+fullDate,left,80);
  ctx.strokeStyle='black';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left,145);ctx.lineTo(right,145);ctx.stroke();
  const page={canvas,ctx,y:180};pages[type].push(page);return page;
 }
 function cell(ctx,x,y,w,h,text,{bold=false,align='left',fill='white',size=33}={}){
  ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle='black';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.fillStyle='black';ctx.font=`${bold?'bold ':''}${size}px Arial`;ctx.textAlign=align;
  const rows=wrapText(ctx,text,w-24);rows.forEach((line,i)=>ctx.fillText(line,align==='center'?x+w/2:x+12,y+14+i*41));ctx.textAlign='left';
 }
 const groups=marketGroups(state,lines);
 for(let panelIndex=0;panelIndex<panels.length;panelIndex++){
  const panel=panels[panelIndex],count=Math.max(panel.length,1),bw=1100/count;
  let page=start('market',panelIndex),currentSource=null;
  const sources=[...sorted(state.sources),{id:'',name:'Unassigned source — needs review'}];
  function marketHeader(source){
   cell(page.ctx,left,page.y,2240,66,source.name.toUpperCase(),{bold:true,size:33});page.y+=66;
   page.ctx.font='bold 30px Arial';const headerHeight=Math.max(66,...panel.map(b=>wrapText(page.ctx,b.abbreviation||b.name,bw-24).length*41+28));
   let x=left;for(const [name,w] of [['ITEM',660],['UNIT',220],['TOTAL',260],...panel.map(b=>[b.abbreviation||b.name,bw])]){cell(page.ctx,x,page.y,w,headerHeight,name,{bold:true,align:x>left?'center':'left',size:30});x+=w;}page.y+=headerHeight;
  }
  for(const source of sources){const rows=groups.filter(r=>(r.sourceId||'')===source.id);if(!rows.length)continue;
   if(page.y+240>bottom)page=start('market',panelIndex);marketHeader(source);currentSource=source;
   for(const row of rows){page.ctx.font='33px Arial';const h=Math.max(72,wrapText(page.ctx,row.shortName||row.name,636).length*41+28,wrapText(page.ctx,row.unit,196).length*41+28,...panel.map(b=>wrapText(page.ctx,row.allocations[b.id]||'',bw-24).length*41+28));
    if(h+180>bottom-180)throw Error('An item name or unit is too long to render readably. Shorten its print name.');
    if(page.y+h>bottom){page=start('market',panelIndex);marketHeader(currentSource);}
    let x=left;for(const [value,w] of [[row.shortName||row.name,660],[row.unit,220],[row.total,260],...panel.map(b=>[row.allocations[b.id]||'',bw])]){cell(page.ctx,x,page.y,w,h,value,{bold:x===left+880,align:x>left?'center':'left'});x+=w;}page.y+=h;
   }page.y+=24;
  }
  if(!groups.length){page.ctx.font='35px Arial';page.ctx.fillText('No draft items are assigned to the Market zone.',left,page.y);page.ctx.font='29px Arial';page.ctx.fillText('All selected items remain visible in the General Map.',left,page.y+65);}
 }
 for(let panelIndex=0;panelIndex<panels.length;panelIndex++){
  const panel=panels[panelIndex],count=Math.max(panel.length,1),zw=100,bw=2140/count;
  let page=start('general',panelIndex);
  function mapHeader(){page.ctx.font='bold 32px Arial';const height=Math.max(90,...panel.map(b=>wrapText(page.ctx,b.name.toUpperCase(),bw-24).length*41+28));cell(page.ctx,left,page.y,zw,height,'');panel.forEach((b,i)=>cell(page.ctx,left+zw+i*bw,page.y,bw,height,b.name.toUpperCase(),{bold:true,align:'center',size:32}));page.y+=height;}
  mapHeader();
  const zoneRows=[...sorted(state.zones),{id:'',name:'Needs classification'}];
  let any=false;
  for(const zone of zoneRows){
   const zoneLines=lines.filter(l=>(l.zoneId||'')===zone.id&&panel.some(b=>b.id===l.branchId));if(!zoneLines.length)continue;any=true;
   const cells=panel.map(b=>{page.ctx.font='33px Arial';return zoneLines.filter(l=>l.branchId===b.id).flatMap(l=>wrapText(page.ctx,`•${l.shortName||l.name} ${l.quantity}${l.unit?' '+l.unit:''}`,bw-20));});
   let offset=0;const maxLines=Math.max(...cells.map(c=>c.length));
   while(offset<maxLines){
    page.ctx.font='bold 32px Arial';const minHeight=Math.max(160,Math.ceil(page.ctx.measureText(zone.name).width)+28);
    if(page.y+minHeight>bottom){page=start('general',panelIndex);mapHeader();}
    if(page.y+minHeight>bottom)throw Error('A purchasing zone name is too long for a readable A4 label. Shorten its display name.');
    const capacity=Math.floor((bottom-page.y-30)/41),take=Math.min(maxLines-offset,capacity),height=Math.max(minHeight,take*41+30);
    const fill=zone.name.toLowerCase()==='abanao'?'#fff9e9':zone.name.toLowerCase()==='porta'?'#f0f8f8':'white';
    cell(page.ctx,left,page.y,zw,height,'',{fill});
    page.ctx.save();page.ctx.translate(left+zw/2,page.y+height/2);page.ctx.rotate(-Math.PI/2);page.ctx.font='bold 32px Arial';page.ctx.textAlign='center';page.ctx.textBaseline='middle';page.ctx.fillText(zone.name,0,0);page.ctx.restore();page.ctx.textBaseline='top';
    panel.forEach((b,i)=>{cell(page.ctx,left+zw+i*bw,page.y,bw,height,'',{fill});page.ctx.font='33px Arial';cells[i].slice(offset,offset+take).forEach((line,j)=>page.ctx.fillText(line,left+zw+i*bw+10,page.y+15+j*41));});
    page.y+=height;offset+=take;if(offset<maxLines){page=start('general',panelIndex);mapHeader();}
   }
  }
  if(!any){page.ctx.font='35px Arial';page.ctx.fillText('No selected draft items for these branches yet.',left,page.y+35);}
 }
 return Object.fromEntries(Object.entries(pages).map(([type,rows])=>[type,rows.map((p,i)=>{
  if(rows.length>1){p.ctx.font='26px Arial';p.ctx.fillStyle='black';p.ctx.fillText(`Page ${i+1} / ${rows.length}`,2110,3400);}
  return {url:p.canvas.toDataURL('image/jpeg',.96),name:`${type==='market'?'Market_Summary':'General_Map'}_${date}_Page_${i+1}.jpg`};
 })]));
}
