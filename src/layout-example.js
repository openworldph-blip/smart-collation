import seed from './seed.json';
import sample from './layout-sample.json';
export function layoutExample(){
 const lines=[];
 sample.rows.forEach((r,n)=>r.quantities.forEach((q,i)=>{if(q)lines.push({itemId:'sample-'+n,branchId:seed.branches[i].id,name:r.name,shortName:r.name,quantity:String(q),unit:r.unit,zoneId:seed.zones.find(z=>z.name===r.zone)?.id||'',sourceId:seed.sources.find(s=>s.name===r.source)?.id||''});}));
 return {state:seed,lines};
}
