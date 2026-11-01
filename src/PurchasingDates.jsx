import React,{useState} from 'react';
import {Plus,CalendarDays} from 'lucide-react';
import {validDate} from './workflow.js';
import {sevenDays,todayManila,addDays} from './date-tools.js';
import {fullDate} from './DateCards.jsx';
import useManilaDay from './useManilaDay.js';
import DeliveryCalendar from './DeliveryCalendar.jsx';
export default function PurchasingDates({workflow,onSave}){
 const today=useManilaDay();
 const [date,setDate]=useState(workflow.openDates.find(d=>d>todayManila())||addDays(todayManila(),1)),[message,setMessage]=useState('');
 async function open(days){if(!validDate(date)||date<=today){setMessage('Choose tomorrow or a later delivery date on the calendar.');return;}const next={...workflow,openDates:[...new Set([...workflow.openDates,...(days===7?sevenDays(date):[date])])].sort()};if(await onSave(next))setMessage(days===7?'Seven delivery dates opened.':'Delivery date opened.');}
 return <section className="panel purchasing-dates"><div className="section-heading"><h2>Open delivery dates</h2><span className="badge sample">Shared setup</span></div><p className="section-description">Pick a day on the calendar, then open that date or a full week. Branches choose among the dates you open. Delivery starts tomorrow; same-day requests are unavailable.</p><div className="date-management-grid"><DeliveryCalendar minDate={addDays(today,1)} value={date} onChange={d=>{setDate(d);setMessage('');}} label="Choose delivery date"/><div className="date-management-actions"><strong>{fullDate(date)}</strong><button type="button" className="button" onClick={()=>open(1)}><Plus size={17}/>Open selected date</button><button type="button" className="button secondary" onClick={()=>open(7)}><CalendarDays size={17}/>Open 7 days from this date</button><p>Closing a date keeps its submitted requests and report history.</p>{message&&<p className="success-message" role="status">{message}</p>}</div></div>{workflow.openDates.length===0&&<p className="empty">No delivery dates are open.</p>}<div className="open-dates-list">{[...workflow.openDates].sort().map(d=><div className="open-date-row" key={d}><strong>{fullDate(d)}</strong><button type="button" className="text-button" onClick={()=>onSave({...workflow,openDates:workflow.openDates.filter(x=>x!==d)})}>Close date</button></div>)}</div></section>;
}
