import React,{useEffect,useState} from 'react';
export function fullDate(date){return new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(date+'T12:00:00+08:00'));}
export default function DateCards({requestDate}){
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{const interval=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(interval);},[]);
 const part=type=>new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',[type]:type==='day'?'numeric':type==='year'?'numeric':'short'}).format(now);
 return <div className="paired-dates"><div className="today-square" aria-label={`Today ${part('month')} ${part('day')}, ${part('year')}`}><small>TODAY</small><strong>{part('day')}</strong><span>{part('month').toUpperCase()} {part('year')}</span></div><div className="request-date-box"><small>DELIVERY DATE</small><strong>{requestDate?fullDate(requestDate):'Choose a delivery date'}</strong><span>{requestDate?'Day the items are needed':'Required before ordering'}</span></div></div>;
}
