import {useEffect,useState} from 'react';
import {todayManila} from './date-tools.js';
export default function useManilaDay(){
 const [day,setDay]=useState(todayManila);
 useEffect(()=>{const check=()=>setDay(todayManila()),timer=setInterval(check,30000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);return()=>{clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};},[]);
 return day;
}
