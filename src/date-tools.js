export function todayManila(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}
export function addDays(date,count){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10);}
export function sevenDays(date){return Array.from({length:7},(_,i)=>addDays(date,i));}
export function calendarCells(month){const first=new Date(month+'-01T12:00:00Z'),days=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();return [...Array(first.getUTCDay()).fill(null),...Array.from({length:days},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)];}
export function nextOpenDate(openDates,today){return [...openDates].sort().find(d=>d>=today)||'';}
